const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Optional real-browser check using Chrome's native protocol, without extra dependencies.
module.exports = async function checkGroupBrowser({ baseUrl, directory, rootId, bId, cId, puzzleId }) {
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
    const errors = [];
    socket.addEventListener('message', event => {
      const value = JSON.parse(event.data);
      if (value.method === 'Runtime.exceptionThrown') errors.push(value.params.exceptionDetails.text);
      if (value.method === 'Page.frameNavigated') navigation++;
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
    await evaluate("document.querySelector('[data-group-create]').click(); document.querySelector('[data-group-name]').value='Browser group'; document.querySelector('[data-group-description]').value='Nabigatzaileko azalpena\\nBigarren lerroa';");
    await submit("document.querySelector('[data-group-form]').requestSubmit()");
    const createdId = await evaluate("new URLSearchParams(location.search).get('group')");
    assert.equal(await evaluate("document.querySelector('[data-group-name]').value"), 'Browser group');
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
    assert.deepEqual(errors, []);
  } finally {
    socket?.close();
    if (chrome.exitCode === null) {
      const stopped = new Promise(resolve => chrome.once('exit', resolve));
      chrome.kill('SIGTERM');
      await stopped;
    }
  }
};
