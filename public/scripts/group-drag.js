export function initGroupDrag({ root, groups, puzzleById, t, checked, scope, isBusy, updateSelection, onDrop }) {
  const byId = new Map(groups.map(group => [group._id, group]));
  const buttons = [...root.querySelectorAll('[data-group-id]')];
  const rows = [...root.querySelectorAll('[data-group-puzzle]')];
  const move = root.querySelector('[data-group-drag-mode][value="move"]');
  const add = root.querySelector('[data-group-drag-mode][value="add"]');
  const moveTooltip = root.querySelector('[data-group-drag-move-tooltip]');
  const status = root.querySelector('[data-group-drag-status]');
  let preferredMode = 'move';
  let dragging = null;
  let preview;
  let announcementTimer;

  function dismissLater() {
    window.clearTimeout(announcementTimer);
    announcementTimer = window.setTimeout(() => { status.hidden = true; }, 6000);
  }

  function announce(text, error = false) {
    window.clearTimeout(announcementTimer);
    status.textContent = text;
    status.hidden = false;
    status.classList.toggle('is-error', error);
    if (!dragging && !isBusy()) dismissLater();
  }

  function refresh() {
    const source = byId.get(scope());
    const canMove = source && !source.systemKey;
    move.disabled = isBusy() || !canMove;
    add.disabled = isBusy();
    move.checked = preferredMode === 'move' && Boolean(canMove);
    add.checked = !move.checked;
    moveTooltip.textContent = canMove
      ? t('groups.dragMoveHint', { group: source.name }) : t('groups.dragMoveUnavailable');
    const counts = new Map();
    puzzleById.forEach(puzzle => (puzzle.groupIds || []).forEach(id => counts.set(id, (counts.get(id) || 0) + 1)));
    buttons.forEach(button => {
      const group = byId.get(button.dataset.groupId);
      const count = group.systemKey === 'root' ? 0 : group.systemKey === 'all' ? puzzleById.size : counts.get(group._id) || 0;
      button.querySelector('[data-group-count]').textContent = count;
    });
    rows.forEach(row => { row.draggable = !isBusy(); });
    if (!dragging && !isBusy() && !status.hidden) dismissLater();
  }

  [move, add].forEach(input => input.addEventListener('change', () => {
    preferredMode = input.value;
    refresh();
  }));

  function operation(event) {
    return dragging.sourceId && move.checked && !(event.ctrlKey || event.metaKey || event.altKey) ? 'move' : 'add';
  }

  function accepts(button, action) {
    const group = byId.get(button.dataset.groupId);
    if (group.systemKey) return false;
    if (action === 'move') return group._id !== dragging.sourceId;
    return dragging.puzzleIds.some(id => !(puzzleById.get(id).groupIds || []).includes(group._id));
  }

  function highlight(action, hovered) {
    buttons.forEach(button => {
      const valid = accepts(button, action);
      button.classList.toggle('is-drop-target', valid);
      button.classList.toggle('is-drop-disabled', !valid);
      button.classList.toggle('is-drop-over', valid && button === hovered);
      button.closest('[data-group-node]')?.classList.toggle('is-drop-over', valid && button === hovered);
    });
  }

  function clear() {
    dragging = null;
    root.classList.remove('is-dragging-games');
    rows.forEach(row => row.classList.remove('is-dragging'));
    buttons.forEach(button => button.classList.remove('is-drop-target', 'is-drop-disabled', 'is-drop-over'));
    root.querySelectorAll('[data-group-node]').forEach(node => node.classList.remove('is-drop-over'));
    preview?.remove();
    preview = undefined;
    if (!isBusy()) dismissLater();
  }

  root.addEventListener('dragstart', event => {
    const row = event.target.closest('[data-group-puzzle]');
    if (!row) return;
    if (isBusy() || event.target.closest('input, select, button') || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    const checkbox = row.querySelector('[data-group-select]');
    if (!checkbox.checked) {
      checked().forEach(input => { input.checked = false; });
      checkbox.checked = true;
      updateSelection();
    }
    const puzzleIds = checked().map(input => input.dataset.groupSelect);
    if (puzzleIds.length > 500) {
      event.preventDefault();
      announce(t('groups.dragLimit'), true);
      return;
    }
    const source = byId.get(scope());
    dragging = { puzzleIds, sourceId: source?.systemKey ? null : source?._id || null };
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-xedera-games', JSON.stringify(puzzleIds));
    event.dataTransfer.setData('text/plain', puzzleIds.map(id => puzzleById.get(id).name).join('\n'));
    preview = document.createElement('div');
    preview.className = 'group-drag-preview';
    preview.textContent = t('groups.dragSelection', { count: puzzleIds.length });
    document.body.append(preview);
    event.dataTransfer.setDragImage(preview, 12, 12);
    root.classList.add('is-dragging-games');
    rows.forEach(item => item.classList.toggle('is-dragging', puzzleIds.includes(item.dataset.groupPuzzle)));
    highlight(operation(event));
    announce(t('groups.dragSelection', { count: puzzleIds.length }));
  });

  function destination(element) {
    return element.closest('[data-group-node]')?.querySelector('[data-group-id]')
      || element.closest('[data-group-id]');
  }

  root.addEventListener('dragover', event => {
    if (!dragging || isBusy()) return;
    const button = destination(event.target);
    const action = operation(event);
    highlight(action, button);
    if (!button) return;
    const valid = accepts(button, action);
    event.dataTransfer.dropEffect = valid ? (action === 'move' ? 'move' : 'copy') : 'none';
    if (valid) {
      event.preventDefault();
      announce(t(action === 'move' ? 'groups.dropMove' : 'groups.dropAdd', {
        count: dragging.puzzleIds.length, group: byId.get(button.dataset.groupId).name
      }));
    } else {
      const group = byId.get(button.dataset.groupId);
      announce(t(group.systemKey === 'root' ? 'groups.rootHint' : group.systemKey === 'all' ? 'groups.dropAutomatic' : 'groups.dropAlreadyThere'));
    }
    // Scroll long trees while holding a game near their top or bottom edge.
    const tree = button.closest('.group-tree');
    const bounds = tree.getBoundingClientRect();
    if (event.clientY < bounds.top + 35) tree.scrollTop -= 18;
    else if (event.clientY > bounds.bottom - 35) tree.scrollTop += 18;
  });

  root.addEventListener('dragleave', event => {
    const button = destination(event.target);
    const node = button?.closest('[data-group-node]') || button;
    if (node && !node.contains(event.relatedTarget)) {
      node.classList.remove('is-drop-over');
      button.classList.remove('is-drop-over');
    }
  });

  root.addEventListener('drop', event => {
    if (!dragging || isBusy()) return;
    const button = destination(event.target);
    if (!button) { clear(); return; }
    event.preventDefault();
    const action = operation(event);
    if (!accepts(button, action)) { clear(); return; }
    const payload = { ...dragging, action, targetId: button.dataset.groupId };
    clear();
    onDrop(payload);
  });
  root.addEventListener('dragend', clear);

  return { refresh, announce };
}
