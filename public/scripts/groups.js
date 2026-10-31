import { initGroupDrag } from './group-drag.js?v=20261031-8';

export function initGroups(state, t, request) {
  const root = document.querySelector('[data-group-manager]');
  if (!root) return;
  const { groups, puzzles } = state.data;
  const byId = new Map(groups.map(group => [group._id, group]));
  const puzzleById = new Map(puzzles.map(puzzle => [puzzle._id, puzzle]));
  const base = groups.find(group => group.systemKey === 'root');
  const params = new URLSearchParams(window.location.search);
  let selected = byId.get(params.get('group')) || base;
  let creating = false;
  let busy = false;
  const field = name => root.querySelector(`[data-${name}]`);
  const form = field('group-form');
  const name = field('group-name');
  const description = field('group-description');
  const parent = field('group-parent');
  const order = field('group-order');
  const message = field('group-message');
  const filter = field('group-game-filter');
  const search = field('group-game-search');
  const action = field('membership-action');
  const source = field('membership-source');
  const target = field('membership-target');
  const rows = [...root.querySelectorAll('[data-group-puzzle]')];
  const selectAll = field('group-select-all');
  const checked = () => [...root.querySelectorAll('[data-group-select]:checked')];
  let drag;

  function showMessage(text, error = false) {
    message.textContent = text;
    message.className = `alert alert-${error ? 'danger' : 'success'}`;
    message.hidden = false;
    message.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function save(path, options, groupId = selected._id) {
    if (busy) return;
    busy = true;
    const controls = [...root.querySelectorAll('input, select, textarea, button')];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    const result = await request(path, options);
    if (result.error) {
      showMessage(result.message || t('groups.failed'), true);
      controls.forEach((control, index) => { control.disabled = disabled[index]; });
      busy = false;
      return;
    }
    window.location.assign(`/master/groups?group=${encodeURIComponent(result.group?._id || groupId)}&saved=1`);
  }

  function updateSelection() {
    const visible = rows.filter(row => !row.hidden).map(row => row.querySelector('input'));
    const count = checked().length;
    const visibleSelected = visible.filter(input => input.checked).length;
    selectAll.checked = visible.length > 0 && visibleSelected === visible.length;
    selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visible.length;
    field('membership-submit').disabled = busy || !count;
    field('group-remove-selected').disabled = busy || !count;
    field('group-selection').textContent = t('groups.selection', { count, total: visible.length });
    rows.forEach(row => row.classList.toggle('is-selected', row.querySelector('input').checked));
  }

  function filterGames() {
    const query = search.value.trim().toLocaleLowerCase('eu');
    const currentGroup = byId.get(filter.value);
    const isRoot = currentGroup?.systemKey === 'root';
    const isAll = filter.value === 'all';
    const canRemove = !isRoot && (currentGroup || isAll);
    field('group-game-content').hidden = isRoot;
    field('group-drag-controls').hidden = isRoot;
    field('group-membership-panel').hidden = isRoot;
    field('group-root-hint').hidden = !isRoot;
    field('group-delete-hint').hidden = !isAll;
    root.querySelectorAll('[data-group-remove-column]').forEach(column => { column.hidden = !canRemove; });
    field('group-remove-selected').hidden = !canRemove;
    field('group-remove-selected').textContent = t(isAll ? 'groups.deleteSelected' : 'groups.removeSelected');
    rows.forEach(row => {
      const puzzle = puzzleById.get(row.dataset.groupPuzzle);
      const groupIds = puzzle.groupIds || [];
      const inGroup = !isRoot && (isAll || (filter.value === 'unassigned' ? !groupIds.length : groupIds.includes(filter.value)));
      row.hidden = !inGroup || ![puzzle.name, puzzle.author].filter(Boolean).join(' ').toLocaleLowerCase('eu').includes(query);
      if (row.hidden) row.querySelector('input').checked = false;
      if (canRemove) {
        const button = row.querySelector('[data-group-remove]');
        const label = t(isAll ? 'groups.deleteNamed' : 'groups.removeNamed', { name: puzzle.name, group: currentGroup?.name });
        button.title = label;
        button.setAttribute('aria-label', label);
        button.querySelector('[data-group-remove-label]').textContent = t(isAll ? 'groups.deleteGame' : 'groups.removeHere');
      }
    });
    const hasResults = rows.some(row => !row.hidden);
    field('group-no-results').hidden = hasResults;
    field('group-game-table').hidden = !hasResults;
    if (byId.has(filter.value)) source.value = filter.value;
    field('group-current-name').textContent = byId.get(filter.value)?.name
      || t(filter.value === 'all' ? 'common.all' : 'groups.unassigned');
    updateSelection();
    drag?.refresh();
  }

  function renderEditor(draft = false) {
    creating = draft;
    const protectedGroup = !draft && Boolean(selected.systemKey);
    name.value = draft ? '' : selected.name;
    description.value = draft ? '' : selected.description;
    name.disabled = protectedGroup;
    parent.disabled = protectedGroup;
    order.disabled = protectedGroup;
    field('group-system-hint').hidden = !protectedGroup;
    field('group-editor-title').textContent = t(draft ? 'groups.new' : 'groups.edit');
    field('group-cancel').hidden = !draft;
    field('group-create').hidden = draft || selected.systemKey === 'all';
    field('group-delete').hidden = draft || protectedGroup;
    const view = field('group-view');
    view.hidden = draft;
    view.href = selected.url;
    const excluded = new Set();
    if (!draft) {
      excluded.add(selected._id);
      for (const group of groups) {
        let ancestor = byId.get(group.parentId);
        const seen = new Set();
        while (ancestor && !seen.has(ancestor._id)) {
          seen.add(ancestor._id);
          if (ancestor._id === selected._id) { excluded.add(group._id); break; }
          ancestor = byId.get(ancestor.parentId);
        }
      }
    }
    parent.replaceChildren();
    if (protectedGroup && !selected.parentId) parent.add(new Option('—', ''));
    groups.filter(group => group.systemKey !== 'all' && !excluded.has(group._id))
      .forEach(group => parent.add(new Option(group.path, group._id)));
    parent.value = draft ? selected._id : selected.parentId || '';
    order.value = draft
      ? Math.max(-1, ...groups.filter(group => group.parentId === selected._id && !group.systemKey).map(group => group.sortOrder)) + 1
      : selected.sortOrder;
    root.querySelectorAll('[data-group-id]').forEach(button => {
      const current = button.dataset.groupId === selected._id;
      button.classList.toggle('is-current', current);
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (draft) {
      field('group-editor').open = true;
      name.focus();
    }
  }

  function renderMemberships() {
    rows.forEach(row => {
      const puzzle = puzzleById.get(row.dataset.groupPuzzle);
      const cell = row.querySelector('[data-group-memberships]');
      const assigned = (puzzle.groupIds || []).map(id => byId.get(id)).filter(Boolean);
      cell.replaceChildren();
      if (!assigned.length) cell.textContent = t('groups.unassigned');
      assigned.forEach(group => {
        const badge = document.createElement('a');
        badge.className = 'group-membership-badge';
        badge.href = group.url;
        badge.draggable = false;
        badge.textContent = group.path;
        cell.append(badge);
      });
    });
  }
  renderMemberships();

  async function applyGameChange(payload) {
    if (busy) return;
    busy = true;
    root.setAttribute('aria-busy', 'true');
    const controls = [...root.querySelectorAll('input, select, textarea, button')];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    drag.refresh();
    drag.announce(t('groups.dragSaving'));
    try {
      const deleting = payload.action === 'delete';
      const result = await request(deleting ? '/jokoak/game' : '/master/groups/memberships', {
        method: deleting ? 'DELETE' : 'POST', body: JSON.stringify(deleting ? { ids: payload.puzzleIds } : payload)
      });
      if (result.error) throw new Error(result.message || t('groups.failed'));
      if (deleting) {
        result.deletedIds.forEach(id => {
          puzzleById.delete(id);
          const rowIndex = rows.findIndex(row => row.dataset.groupPuzzle === id);
          if (rowIndex !== -1) rows.splice(rowIndex, 1)[0].remove();
          const puzzleIndex = puzzles.findIndex(puzzle => puzzle._id === id);
          if (puzzleIndex !== -1) puzzles.splice(puzzleIndex, 1);
        });
      } else result.puzzles.forEach(puzzle => { puzzleById.get(puzzle._id).groupIds = puzzle.groupIds; });
      renderMemberships();
      filterGames();
      const text = deleting ? t('groups.deleted', { count: result.deletedIds.length })
        : t({ move: 'groups.dragMoved', add: 'groups.dragAdded', remove: 'groups.removed' }[payload.action], {
          count: result.count, group: byId.get(payload.action === 'remove' ? payload.sourceId : payload.targetId).name
        });
      drag.announce(text);
    } catch (error) {
      drag.announce(error.message, true);
    } finally {
      busy = false;
      root.removeAttribute('aria-busy');
      controls.forEach((control, index) => { control.disabled = disabled[index]; });
      drag.refresh();
      updateSelection();
    }
  }
  function selectGroup(id) {
    selected = byId.get(id);
    history.replaceState(null, '', `/master/groups?group=${selected._id}`);
    checked().forEach(input => { input.checked = false; });
    filter.value = selected.systemKey === 'all' ? 'all' : selected._id;
    renderEditor();
    filterGames();
  }
  function removeFromCurrentGroup(puzzleIds) {
    const group = byId.get(filter.value);
    if (busy || !puzzleIds.length || group?.systemKey === 'root') return;
    if (filter.value === 'all') {
      const prompt = puzzleIds.length === 1
        ? t('groups.deleteEverywhereConfirm', { name: puzzleById.get(puzzleIds[0]).name })
        : t('groups.deleteSelectedConfirm', { count: puzzleIds.length });
      if (window.confirm(prompt)) applyGameChange({ action: 'delete', puzzleIds });
    } else if (group) applyGameChange({ action: 'remove', sourceId: group._id, puzzleIds });
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-group-remove]');
    if (button) removeFromCurrentGroup([button.dataset.groupRemove]);
  });
  field('group-remove-selected').addEventListener('click', () => {
    removeFromCurrentGroup(checked().map(input => input.dataset.groupSelect));
  });
  function openEditor() {
    field('group-editor').open = true;
    field('group-editor').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    (name.disabled ? description : name).focus({ preventScroll: true });
  }
  root.querySelectorAll('[data-group-id]').forEach(button => {
    button.addEventListener('click', () => { if (!busy) selectGroup(button.dataset.groupId); });
  });
  root.querySelectorAll('[data-group-edit]').forEach(button => {
    button.addEventListener('click', () => {
      if (busy) return;
      selectGroup(button.dataset.groupEdit);
      openEditor();
    });
  });
  root.querySelectorAll('[data-group-create-child]').forEach(button => {
    button.addEventListener('click', () => {
      if (busy || byId.get(button.dataset.groupCreateChild).systemKey === 'all') return;
      selectGroup(button.dataset.groupCreateChild);
      renderEditor(true);
    });
  });
  field('group-create').addEventListener('click', () => renderEditor(true));
  field('group-edit-toggle').addEventListener('click', openEditor);
  field('group-cancel').addEventListener('click', () => renderEditor());
  form.addEventListener('submit', event => {
    event.preventDefault();
    const body = {
      name: name.value, description: description.value,
      parentId: parent.value || null, sortOrder: Number(order.value)
    };
    save(creating ? '/master/groups' : `/master/groups/${selected._id}`, {
      method: creating ? 'POST' : 'PATCH', body: JSON.stringify(body)
    });
  });
  field('group-delete').addEventListener('click', () => {
    if (window.confirm(t('groups.deleteConfirm', { name: selected.name }))) {
      save(`/master/groups/${selected._id}`, { method: 'DELETE' }, selected.parentId || base._id);
    }
  });
  function updateAction() {
    field('membership-source-field').hidden = action.value === 'add';
    field('membership-target-field').hidden = action.value === 'remove';
  }
  action.addEventListener('change', updateAction);
  filter.addEventListener('change', filterGames);
  search.addEventListener('input', filterGames);
  root.addEventListener('change', event => {
    if (event.target === selectAll) {
      rows.filter(row => !row.hidden).forEach(row => { row.querySelector('input').checked = selectAll.checked; });
    }
    if (event.target === selectAll || event.target.matches('[data-group-select]')) updateSelection();
  });
  field('membership-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!checked().length) return;
    save('/master/groups/memberships', {
      method: 'POST', body: JSON.stringify({
        action: action.value, sourceId: source.value, targetId: target.value,
        puzzleIds: checked().map(input => input.dataset.groupSelect)
      })
    });
  });
  filter.value = selected.systemKey === 'all' ? 'all' : selected._id;
  drag = initGroupDrag({
    root, groups, puzzleById, t, checked, scope: () => filter.value,
    isBusy: () => busy, updateSelection, onDrop: applyGameChange
  });
  renderEditor();
  filterGames();
  updateAction();
  if (params.has('saved')) {
    showMessage(t('groups.saved'));
    history.replaceState(null, '', `/master/groups?group=${selected._id}`);
  }
}
