export function initGroupOrder({ root, groups, t, isBusy, onReorder }) {
  const tree = root.querySelector('.group-tree');
  const status = root.querySelector('[data-group-order-status]');
  const byId = new Map(groups.map(group => [group._id, group]));
  const nodes = new Map([...tree.querySelectorAll('[data-group-node]')].map(node => [node.dataset.groupNode, node]));
  let dragging;
  let destination;
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
    tree.querySelectorAll('[data-group-id], [data-group-order-handle]').forEach(button => {
      const group = byId.get(button.dataset.groupId || button.dataset.groupOrderHandle);
      button.draggable = !isBusy() && !group.systemKey;
    });
  }

  function clearDestination() {
    destination = undefined;
    nodes.forEach(node => node.classList.remove('is-order-before', 'is-order-after'));
  }

  function clear() {
    dragging = undefined;
    clearDestination();
    root.classList.remove('is-dragging-groups');
    nodes.forEach(node => node.classList.remove('is-order-dragging'));
    if (!isBusy()) dismissLater();
  }

  function branch(group) {
    const start = groups.indexOf(group);
    let end = start + 1;
    while (end < groups.length && groups[end].depth > group.depth) end++;
    return groups.slice(start, end);
  }

  function locate(event) {
    const node = event.target.closest('[data-group-node]');
    let target = byId.get(node?.dataset.groupNode);
    if (!target) return;
    // Hovering a descendant means inserting after its entire sibling branch.
    const hovered = target;
    while (target && target.parentId !== dragging.parentId) target = byId.get(target.parentId);
    if (!target || target._id === dragging._id) return;
    const bounds = nodes.get(target._id).getBoundingClientRect();
    const position = hovered !== target || event.clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before';
    if (target.systemKey && (target.systemKey !== 'all' || position !== 'before')) return;
    return { targetId: target._id, position };
  }

  tree.addEventListener('dragstart', event => {
    const handle = event.target.closest('[data-group-id], [data-group-order-handle]');
    if (!handle) return;
    const group = byId.get(handle.dataset.groupId || handle.dataset.groupOrderHandle);
    if (isBusy() || group.systemKey || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    dragging = group;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-xedera-group', group._id);
    event.dataTransfer.setData('text/plain', group.name);
    root.classList.add('is-dragging-groups');
    branch(group).forEach(item => nodes.get(item._id)?.classList.add('is-order-dragging'));
    announce(t('groups.reorderDragging', { name: group.name }));
  });

  tree.addEventListener('dragover', event => {
    if (!dragging || isBusy()) return;
    clearDestination();
    destination = locate(event);
    event.dataTransfer.dropEffect = destination ? 'move' : 'none';
    if (destination) {
      event.preventDefault();
      const target = byId.get(destination.targetId);
      const marker = destination.position === 'before' ? target : branch(target).at(-1);
      nodes.get(marker._id).classList.add(`is-order-${destination.position}`);
    }
    const bounds = tree.getBoundingClientRect();
    if (event.clientY < bounds.top + 35) tree.scrollTop -= 18;
    else if (event.clientY > bounds.bottom - 35) tree.scrollTop += 18;
  });

  tree.addEventListener('dragleave', event => {
    if (!tree.contains(event.relatedTarget)) clearDestination();
  });

  tree.addEventListener('drop', event => {
    if (!dragging) return;
    event.preventDefault();
    const target = locate(event);
    const id = dragging._id;
    clear();
    if (target && !isBusy()) onReorder(id, target);
  });
  tree.addEventListener('dragend', clear);

  tree.addEventListener('keydown', event => {
    const handle = event.target.closest('[data-group-order-handle]');
    if (!handle || isBusy() || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const group = byId.get(handle.dataset.groupOrderHandle);
    const siblings = groups.filter(item => item.parentId === group.parentId && !item.systemKey);
    const target = siblings[siblings.indexOf(group) + (event.key === 'ArrowUp' ? -1 : 1)];
    if (target) onReorder(group._id, { targetId: target._id, position: event.key === 'ArrowUp' ? 'before' : 'after' });
  });

  refresh();
  return { refresh, announce };
}
