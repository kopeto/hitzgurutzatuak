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
    field('group-selection').textContent = t('groups.selection', { count, total: visible.length });
  }

  function filterGames() {
    const query = search.value.trim().toLocaleLowerCase('eu');
    rows.forEach(row => {
      const puzzle = puzzleById.get(row.dataset.groupPuzzle);
      const groupIds = puzzle.groupIds || [];
      const inGroup = filter.value === 'all' || (filter.value === 'unassigned' ? !groupIds.length : groupIds.includes(filter.value));
      row.hidden = !inGroup || ![puzzle.name, puzzle.author].filter(Boolean).join(' ').toLocaleLowerCase('eu').includes(query);
      if (row.hidden) row.querySelector('input').checked = false;
    });
    const hasResults = rows.some(row => !row.hidden);
    field('group-no-results').hidden = hasResults;
    field('group-game-table').hidden = !hasResults;
    if (byId.has(filter.value)) source.value = filter.value;
    updateSelection();
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
    if (draft) name.focus();
  }

  rows.forEach(row => {
    const puzzle = puzzleById.get(row.dataset.groupPuzzle);
    const cell = row.querySelector('[data-group-memberships]');
    const assigned = (puzzle.groupIds || []).map(id => byId.get(id)).filter(Boolean);
    if (!assigned.length) cell.textContent = t('groups.unassigned');
    assigned.forEach(group => {
      const badge = document.createElement('a');
      badge.className = 'group-membership-badge';
      badge.href = group.url;
      badge.textContent = group.path;
      cell.append(badge);
    });
  });
  root.querySelectorAll('[data-group-id]').forEach(button => {
    button.addEventListener('click', () => {
      if (busy) return;
      selected = byId.get(button.dataset.groupId);
      history.replaceState(null, '', `/master/groups?group=${selected._id}`);
      checked().forEach(input => { input.checked = false; });
      filter.value = selected.systemKey === 'all' ? 'all' : selected._id;
      renderEditor();
      filterGames();
    });
  });
  field('group-create').addEventListener('click', () => renderEditor(true));
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
  renderEditor();
  filterGames();
  updateAction();
  if (params.has('saved')) {
    showMessage(t('groups.saved'));
    history.replaceState(null, '', `/master/groups?group=${selected._id}`);
  }
}
