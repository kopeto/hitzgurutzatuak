const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Optional real-browser check using Chrome's native protocol, without extra dependencies.
module.exports = async function checkGroupBrowser({ baseUrl, directory, rootId, bId, cId, puzzleId, companionId }) {
  const chrome = spawn(process.env.CHROME_BINARY || 'google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    `--user-data-dir=${path.join(directory, 'chrome')}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error(`Chrome startup timed out: ${output}`)), 10000);
      chrome.once('error', reject);
      chrome.once('exit', code => { clearTimeout(timeout); reject(new Error(`Chrome exited ${code}: ${output}`)); });
      chrome.stderr.on('data', chunk => {
        output = (output + chunk).slice(-6000);
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
    });
    const origin = new URL(endpoint);
    const targets = await (await fetch(`http://${origin.host}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const pending = new Map();
    let requestId = 0;
    let navigation = 0;
    let interceptedDrag;
    let membershipRequests = 0;
    let deletionRequests = 0;
    let dialogAnswer = false;
    const dialogs = [];
    const errors = [];
    socket.addEventListener('message', event => {
      const value = JSON.parse(event.data);
      if (value.method === 'Runtime.exceptionThrown') errors.push(value.params.exceptionDetails.text);
      if (value.method === 'Page.frameNavigated') navigation++;
      if (value.method === 'Input.dragIntercepted') interceptedDrag = value.params.data;
      if (value.method === 'Network.requestWillBeSent' && value.params.request.url.endsWith('/master/groups/memberships')) membershipRequests++;
      if (value.method === 'Network.requestWillBeSent' && value.params.request.method === 'DELETE' && value.params.request.url.endsWith('/jokoak/game')) deletionRequests++;
      if (value.method === 'Page.javascriptDialogOpening') {
        dialogs.push(value.params.message);
        send('Page.handleJavaScriptDialog', { accept: dialogAnswer }).catch(error => errors.push(error.message));
      }
      if (value.id) {
        const handler = pending.get(value.id);
        pending.delete(value.id);
        if (value.error) handler?.reject(new Error(value.error.message));
        else handler?.resolve(value.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++requestId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async (condition, label) => {
      for (let i = 0; i < 100; i++) {
        try { if (await condition()) return; } catch (error) {
          if (!/context|navigat|Cannot find/i.test(error.message)) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error(`Browser wait timed out: ${label}`);
    };
    const ready = () => evaluate("document.readyState === 'complete' && document.querySelector('[data-group-name]')?.value.length > 0");
    async function submit(expression) {
      const previous = navigation;
      await evaluate(expression);
      await wait(() => navigation > previous, 'form navigation');
      await wait(ready, 'manager initialized');
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setExtraHTTPHeaders', { headers: { 'x-test-role': 'master' } });
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${baseUrl}/master/groups?group=${rootId}` });
    await wait(ready, 'initial manager');
    assert.equal(await evaluate("document.querySelector('[data-group-name]').disabled"), true);
    assert.equal(await evaluate("document.querySelector('[data-group-game-content]').hidden"), true);
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${rootId}"]').textContent`), '0');
    assert.equal(await evaluate(`document.querySelector('[data-membership-target] option[value="${rootId}"]') === null`), true);
    // Tree actions must target their own group, even while another group is selected.
    await evaluate(`document.querySelector('[data-group-edit="${cId}"]').click()`);
    assert.equal(await evaluate("document.querySelector('[data-group-name]').value"), 'C');
    assert.equal(await evaluate("document.querySelector('[data-group-editor]').open"), true);
    await evaluate("document.querySelector('[data-group-description]').value='Zuhaitzetik editatua'");
    await submit("document.querySelector('[data-group-form]').requestSubmit()");
    assert.equal(await evaluate("document.querySelector('[data-group-description]').value"), 'Zuhaitzetik editatua');
    await evaluate(`document.querySelector('[data-group-create-child="${rootId}"]').click()`);
    assert.equal(await evaluate("document.querySelector('[data-group-parent]').value"), rootId);
    await evaluate("document.querySelector('[data-group-cancel]').click()");
    const automaticId = await evaluate("JSON.parse(document.querySelector('#app-state').textContent).data.groups.find(g=>g.systemKey==='all')._id");
    assert.equal(await evaluate(`document.querySelector('[data-group-create-child="${automaticId}"]').disabled`), true);
    await evaluate(`document.querySelector('[data-group-edit="${automaticId}"]').click()`);
    assert.equal(await evaluate("document.querySelector('[data-group-name]').disabled"), true);
    assert.equal(await evaluate("document.querySelector('[data-group-description]').disabled"), false);
    await evaluate(`document.querySelector('[data-group-create-child="${bId}"]').click()`);
    assert.equal(await evaluate("document.querySelector('[data-group-name]').value"), '');
    assert.equal(await evaluate("document.querySelector('[data-group-parent]').value"), bId);
    await evaluate("document.querySelector('[data-group-name]').value='Browser group'; document.querySelector('[data-group-description]').value='Nabigatzaileko azalpena\\nBigarren lerroa';");
    await submit("document.querySelector('[data-group-form]').requestSubmit()");
    const createdId = await evaluate("new URLSearchParams(location.search).get('group')");
    assert.equal(await evaluate("document.querySelector('[data-group-name]').value"), 'Browser group');
    assert.equal(await evaluate("document.querySelector('[data-group-parent]').value"), bId);
    await evaluate(`document.querySelector('[data-group-parent]').value=${JSON.stringify(bId)}; document.querySelector('[data-group-order]').value='2'`);
    await submit("document.querySelector('[data-group-form]').requestSubmit()");
    assert.equal(await evaluate("document.querySelector('[data-group-parent]').value"), bId);
    await evaluate(`document.querySelector('[data-group-game-filter]').value='all'; document.querySelector('[data-group-game-search]').value='Multi group'; document.querySelector('[data-group-game-search]').dispatchEvent(new Event('input')); document.querySelector('[data-group-select="${puzzleId}"]').click(); document.querySelector('[data-membership-target]').value='${createdId}'`);
    await submit("document.querySelector('[data-membership-form]').requestSubmit()");
    assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${puzzleId}"]').hidden`), false);
    await evaluate(`document.querySelector('[data-group-select="${puzzleId}"]').click(); document.querySelector('[data-membership-target]').value='${cId}'`);
    await submit("document.querySelector('[data-membership-form]').requestSubmit()");
    await evaluate(`document.querySelector('[data-group-select="${puzzleId}"]').click(); document.querySelector('[data-membership-action]').value='move'; document.querySelector('[data-membership-action]').dispatchEvent(new Event('change')); document.querySelector('[data-membership-target]').value='${bId}'`);
    assert.equal(await evaluate("document.querySelector('[data-membership-source-field]').hidden"), false);
    await submit("document.querySelector('[data-membership-form]').requestSubmit()");
    assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${puzzleId}"]').hidden`), true);
    assert.deepEqual(await evaluate(`JSON.parse(document.querySelector('#app-state').textContent).data.puzzles.find(p => p._id === '${puzzleId}').groupIds.sort()`), [bId, cId].sort());
    if (process.env.GROUPS_SCREENSHOT_DIR) {
      await fs.mkdir(process.env.GROUPS_SCREENSHOT_DIR, { recursive: true });
      const screenshot = await send('Page.captureScreenshot', { captureBeyondViewport: true });
      await fs.writeFile(path.join(process.env.GROUPS_SCREENSHOT_DIR, 'groups-desktop.png'), Buffer.from(screenshot.data, 'base64'));
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    if (process.env.GROUPS_SCREENSHOT_DIR) {
      await fs.mkdir(process.env.GROUPS_SCREENSHOT_DIR, { recursive: true });
      const screenshot = await send('Page.captureScreenshot', { captureBeyondViewport: true });
      await fs.writeFile(path.join(process.env.GROUPS_SCREENSHOT_DIR, 'groups-mobile.png'), Buffer.from(screenshot.data, 'base64'));
    }
    await send('Page.navigate', { url: `${baseUrl}/jokoak/taldeak/${createdId}` });
    await wait(() => evaluate("document.readyState === 'complete' && document.querySelector('.group-description') !== null"), 'public group');
    assert.equal(await evaluate("document.querySelector('.group-links') === null && document.querySelector('.catalog-games') === null"), true);
    assert.equal(await evaluate("document.querySelector('.group-description').textContent"), 'Nabigatzaileko azalpena\nBigarren lerroa');

    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${baseUrl}/master/groups?group=${bId}` });
    await wait(ready, 'drag manager');
    assert.equal(await evaluate("document.querySelector('[data-group-editor]').closest('.group-games-panel') !== null"), true);
    assert.equal(await evaluate("document.querySelector('[data-group-membership-panel]').closest('.group-games-panel') !== null"), true);
    assert.equal(await evaluate("document.querySelector('[data-group-drag-help]') === null"), true);
    assert.equal(await evaluate("document.querySelector('#group-drag-move-tooltip').textContent.includes('“B”')"), true);
    for (const mode of ['move', 'add']) {
      await evaluate('document.activeElement.blur()');
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('#group-drag-${mode}-tooltip')).visibility`), 'hidden');
      const button = await evaluate(`(() => { const label=document.querySelector('[data-group-drag-mode][value="${mode}"]').nextElementSibling; label.scrollIntoView({block:'center',behavior:'instant'}); const rect=label.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...button });
      await wait(() => evaluate(`getComputedStyle(document.querySelector('#group-drag-${mode}-tooltip')).visibility === 'visible'`), `${mode} tooltip on hover`);
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await evaluate("document.querySelector('[data-group-drag-mode][value=\"move\"]').focus()");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('#group-drag-move-tooltip')).visibility"), 'visible');
    await evaluate('document.activeElement.blur()');
    await send('Input.setInterceptDrags', { enabled: true });
    async function dragTo(targetId, allowed = true, overAction = false) {
      interceptedDrag = undefined;
      const points = await evaluate(`(() => {
        const row = document.querySelector('[data-group-puzzle="${puzzleId}"]');
        row.scrollIntoView({block:'center',behavior:'instant'});
        const target = document.querySelector('[data-group-id="' + ${JSON.stringify(targetId)} + '"]');
        const tree = target.closest('.group-tree');
        const bounds = tree.getBoundingClientRect();
        const targetBounds = target.getBoundingClientRect();
        if (targetBounds.bottom > bounds.bottom || targetBounds.top < bounds.top) tree.scrollTop += targetBounds.top - bounds.top - bounds.height/2;
        const first = row.querySelector('[data-group-drag-handle]').getBoundingClientRect();
        const dropTarget = ${overAction} ? target.closest('[data-group-node]').querySelector('[data-group-edit]') : target;
        const last = dropTarget.getBoundingClientRect();
        return {first:{x:first.x+first.width/2,y:first.y+first.height/2},last:{x:last.x+last.width/2,y:last.y+last.height/2}};
      })()`);
      const previousNavigation = navigation;
      const previousRequests = membershipRequests;
      await evaluate("window.__groupDragLog=[]; for(const type of ['dragstart','dragend','drop']) document.addEventListener(type,event=>window.__groupDragLog.push({type,target:event.target.tagName,prevented:event.defaultPrevented,effect:event.dataTransfer.dropEffect}),{capture:true,once:true})");
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points.first });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points.first, button: 'left', buttons: 1, clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: points.first.x + 15, y: points.first.y - 15, button: 'left', buttons: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points.last, button: 'left', buttons: 1 });
      try {
        await wait(() => interceptedDrag, 'native drag started');
      } catch (error) {
        const diagnostic = await evaluate(`({points:${JSON.stringify(points)},hit:document.elementFromPoint(${points.first.x},${points.first.y})?.outerHTML,active:document.querySelector('[data-group-manager]').className,status:document.querySelector('[data-group-drag-status]').textContent,events:window.__groupDragLog})`);
        throw new Error(error.message + ': ' + JSON.stringify(diagnostic));
      }
      await send('Input.dispatchDragEvent', { type: 'dragEnter', ...points.last, data: interceptedDrag });
      await send('Input.dispatchDragEvent', { type: 'dragOver', ...points.last, data: interceptedDrag });
      assert.equal(await evaluate(`document.querySelector('[data-group-id="${targetId}"]').classList.contains('is-drop-over')`), allowed);
      await send('Input.dispatchDragEvent', { type: 'drop', ...points.last, data: interceptedDrag });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.last, button: 'left', buttons: 0, clickCount: 1 });
      if (allowed) {
        await wait(() => membershipRequests > previousRequests, 'drop saved');
        await wait(() => evaluate("!document.querySelector('[data-group-manager]').hasAttribute('aria-busy')"), 'drop finished');
        assert.equal(await evaluate("document.querySelector('[data-group-drag-status]').classList.contains('is-error')"), false);
      } else assert.equal(membershipRequests, previousRequests);
      assert.equal(navigation, previousNavigation, 'dropping should not reload the page');
    }
    const selectBoth = () => evaluate(`for (const id of ${JSON.stringify([puzzleId, companionId])}) { const checkbox=document.querySelector('[data-group-select="'+id+'"]'); if(!checkbox.checked) checkbox.click(); }`);
    await selectBoth();
    await dragTo(createdId);
    for (const id of [puzzleId, companionId]) {
      assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${id}"]').hidden`), true);
    }
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${createdId}"]').textContent`), '2');
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${bId}"]').textContent`), '0');
    await evaluate(`document.querySelector('[data-group-id="${createdId}"]').click(); document.querySelector('[data-group-drag-mode][value="add"]').click()`);
    await selectBoth();
    await dragTo(rootId, false, true);
    const extraId = await evaluate("JSON.parse(document.querySelector('#app-state').textContent).data.groups.find(g=>g.name==='Batch group 0')._id");
    await dragTo(extraId, true, true);
    const allId = await evaluate("JSON.parse(document.querySelector('#app-state').textContent).data.groups.find(g=>g.systemKey==='all')._id");
    await dragTo(allId, false);
    await evaluate("document.querySelector('[data-group-drag-mode][value=\"move\"]').click()");
    await dragTo(createdId, false);
    await evaluate(`document.querySelector('[data-group-id="${allId}"]').click(); document.querySelector('[data-group-select="${companionId}"]').click()`);
    assert.equal(await evaluate("document.querySelector('[data-group-drag-mode][value=\"move\"]').disabled"), true);
    // Dragging an unchecked game replaces the previous selection, even from Guztiak.
    await dragTo(bId);
    const savedMemberships = await evaluate(`fetch('/master/groups').then(r=>r.text()).then(html=>JSON.parse(new DOMParser().parseFromString(html,'text/html').querySelector('#app-state').textContent).data.puzzles)`);
    assert.deepEqual(savedMemberships.find(puzzle => puzzle._id === puzzleId).groupIds.sort(), [extraId, bId, cId, createdId].sort());
    assert.deepEqual(savedMemberships.find(puzzle => puzzle._id === companionId).groupIds.sort(), [extraId, cId, createdId].sort());
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${bId}"]').textContent`), '1');
    if (process.env.GROUPS_SCREENSHOT_DIR) {
      await evaluate('window.scrollTo(0,0)');
      const screenshot = await send('Page.captureScreenshot', { captureBeyondViewport: true });
      await fs.writeFile(path.join(process.env.GROUPS_SCREENSHOT_DIR, 'groups-drag-desktop.png'), Buffer.from(screenshot.data, 'base64'));
    }
    async function removeGames(expression) {
      const previousNavigation = navigation;
      const previousRequests = membershipRequests;
      await evaluate(expression);
      await wait(() => membershipRequests > previousRequests, 'membership removal requested');
      await wait(() => evaluate("!document.querySelector('[data-group-manager]').hasAttribute('aria-busy')"), 'membership removed');
      assert.equal(navigation, previousNavigation, 'removing a membership should not reload the page');
      assert.equal(await evaluate("document.querySelector('[data-group-drag-status]').classList.contains('is-error')"), false);
    }
    await evaluate(`document.querySelector('[data-group-id="${bId}"]').click()`);
    assert.equal(await evaluate(`document.querySelector('[data-group-remove="${puzzleId}"]').closest('td').hidden`), false);
    await removeGames(`document.querySelector('[data-group-remove="${puzzleId}"]').click()`);
    assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${puzzleId}"]').hidden`), true);
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${bId}"]').textContent`), '0');
    const afterSingle = await evaluate(`fetch('/master/groups').then(r=>r.text()).then(html=>JSON.parse(new DOMParser().parseFromString(html,'text/html').querySelector('#app-state').textContent).data.puzzles)`);
    assert.deepEqual(afterSingle.find(puzzle => puzzle._id === puzzleId).groupIds.sort(), [extraId, cId, createdId].sort());

    await evaluate(`document.querySelector('[data-group-id="${createdId}"]').click()`);
    if (process.env.GROUPS_SCREENSHOT_DIR) {
      await evaluate('window.scrollTo(0,0)');
      const screenshot = await send('Page.captureScreenshot', { captureBeyondViewport: true });
      await fs.writeFile(path.join(process.env.GROUPS_SCREENSHOT_DIR, 'groups-remove-desktop.png'), Buffer.from(screenshot.data, 'base64'));
    }
    await selectBoth();
    assert.equal(await evaluate("document.querySelector('[data-group-remove-selected]').disabled"), false);
    await removeGames("document.querySelector('[data-group-remove-selected]').click()");
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${createdId}"]').textContent`), '0');
    assert.equal(await evaluate("document.querySelector('[data-group-game-table]').hidden"), true);
    assert.equal(await evaluate("document.querySelector('[data-group-remove-selected]').disabled"), true);
    const afterBulk = await evaluate(`fetch('/master/groups').then(r=>r.text()).then(html=>JSON.parse(new DOMParser().parseFromString(html,'text/html').querySelector('#app-state').textContent).data.puzzles)`);
    for (const id of [puzzleId, companionId]) {
      assert.deepEqual(afterBulk.find(puzzle => puzzle._id === id).groupIds.sort(), [extraId, cId].sort());
    }

    await evaluate(`document.querySelector('[data-group-id="${rootId}"]').click()`);
    assert.equal(await evaluate("document.querySelector('[data-group-game-content]').hidden"), true);
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${rootId}"]').textContent`), '0');
    await evaluate(`document.querySelector('[data-group-id="${extraId}"]').click()`);
    await selectBoth();
    await removeGames("document.querySelector('[data-group-remove-selected]').click()");
    await evaluate(`document.querySelector('[data-group-id="${cId}"]').click()`);
    await removeGames(`document.querySelector('[data-group-remove="${puzzleId}"]').click()`);
    await evaluate(`document.querySelector('[data-group-id="${allId}"]').click()`);
    assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${puzzleId}"]').hidden`), false);
    assert.equal(await evaluate("document.querySelector('[data-group-remove-selected]').hidden"), false);
    assert.equal(await evaluate("[...document.querySelectorAll('[data-group-remove-column]')].every(column=>!column.hidden)"), true);
    await evaluate("document.querySelector('[data-group-game-filter]').value='unassigned'; document.querySelector('[data-group-game-filter]').dispatchEvent(new Event('change'))");
    assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${puzzleId}"]').hidden`), false);
    assert.equal(await evaluate("document.querySelector('[data-group-remove-selected]').hidden"), true);
    const afterLastGroup = await evaluate(`fetch('/master/groups').then(r=>r.text()).then(html=>JSON.parse(new DOMParser().parseFromString(html,'text/html').querySelector('#app-state').textContent).data.puzzles)`);
    assert.deepEqual(afterLastGroup.find(puzzle => puzzle._id === puzzleId).groupIds, []);
    assert.deepEqual(afterLastGroup.find(puzzle => puzzle._id === companionId).groupIds, [cId]);
    assert.equal(await evaluate("fetch('/jokoak/guztiak').then(r=>r.text()).then(html=>html.includes('Multi group'))"), true);

    await evaluate(`document.querySelector('[data-group-id="${allId}"]').click()`);
    async function deleteGames(expression, accept) {
      const previousNavigation = navigation;
      const previousRequests = deletionRequests;
      const previousDialogs = dialogs.length;
      dialogAnswer = accept;
      await evaluate(expression);
      await wait(() => dialogs.length > previousDialogs, 'permanent deletion confirmation');
      assert.ok(dialogs.at(-1).includes('Talde guztietatik'));
      if (accept) {
        await wait(() => deletionRequests > previousRequests, 'permanent deletion requested');
        await wait(() => evaluate("!document.querySelector('[data-group-manager]').hasAttribute('aria-busy')"), 'permanent deletion completed');
        assert.equal(await evaluate("document.querySelector('[data-group-drag-status]').classList.contains('is-error')"), false);
      } else assert.equal(deletionRequests, previousRequests);
      assert.equal(navigation, previousNavigation);
    }
    const originalCount = Number(await evaluate(`document.querySelector('[data-group-count="${allId}"]').textContent`));
    await deleteGames(`document.querySelector('[data-group-remove="${puzzleId}"]').click()`, false);
    assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${puzzleId}"]') !== null`), true);
    await deleteGames(`document.querySelector('[data-group-remove="${puzzleId}"]').click()`, true);
    assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${puzzleId}"]') === null`), true);
    assert.equal(Number(await evaluate(`document.querySelector('[data-group-count="${allId}"]').textContent`)), originalCount - 1);
    const multiGroupId = afterLastGroup.find(puzzle => puzzle.name === 'Many destinations')._id;
    await evaluate(`for(const id of ${JSON.stringify([companionId])}.concat('${multiGroupId}')) document.querySelector('[data-group-select="'+id+'"]').click()`);
    await deleteGames("document.querySelector('[data-group-remove-selected]').click()", true);
    for (const id of [companionId, multiGroupId]) {
      assert.equal(await evaluate(`document.querySelector('[data-group-puzzle="${id}"]') === null`), true);
    }
    assert.equal(await evaluate(`document.querySelector('[data-group-count="${extraId}"]').textContent`), '0');
    assert.equal(Number(await evaluate(`document.querySelector('[data-group-count="${allId}"]').textContent`)), originalCount - 3);
    assert.equal(await evaluate("fetch('/jokoak/guztiak').then(r=>r.text()).then(html=>html.includes('Multi group'))"), false);
    if (process.env.GROUPS_SCREENSHOT_DIR) {
      await evaluate('window.scrollTo(0,0)');
      const screenshot = await send('Page.captureScreenshot', { captureBeyondViewport: true });
      await fs.writeFile(path.join(process.env.GROUPS_SCREENSHOT_DIR, 'groups-global-delete.png'), Buffer.from(screenshot.data, 'base64'));
    }
    assert.deepEqual(errors, []);
    return { deletedIds: [puzzleId, companionId, multiGroupId] };
  } finally {
    socket?.close();
    if (chrome.exitCode === null) {
      const stopped = new Promise(resolve => chrome.once('exit', resolve));
      chrome.kill('SIGTERM');
      await stopped;
    }
  }
};
