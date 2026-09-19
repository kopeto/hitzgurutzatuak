$(document).ready(() => {
  $('[data-nav-toggle]').on('click', function () {
    const navigation = $('[data-site-navigation]');
    const isOpen = navigation.toggleClass('is-open').hasClass('is-open');
    $(this).attr('aria-expanded', String(isOpen));
  });

  $('.deletePUZ').on('click', function () {
    const button = $(this);
    const id = button.attr('data-id');
    const name = button.attr('data-name') || 'puzle hau';

    if (!window.confirm(t('client.deleteConfirm', { name }))) {
      return;
    }

    button.prop('disabled', true).text(t('client.deleting'));
    $.ajax({
      type: 'DELETE',
      url: `/puzzles/game/${id}`,
      success: () => window.location.reload(),
      error: () => {
        button.prop('disabled', false).text(t('client.delete'));
        window.alert(t('client.deleteFailed'));
      }
    });
  });

  $('.close').on('click', function () {
    $(this).closest('.alert').remove();
  });

  const searchInput = document.querySelector('[data-puzzle-search]');
  const statusFilter = document.querySelector('[data-puzzle-status]');
  const cards = Array.from(document.querySelectorAll('[data-puzzle-card]'));
  const count = document.querySelector('[data-catalog-count]');

  function filterCatalog() {
    const query = (searchInput ? searchInput.value : '').trim().toLocaleLowerCase('eu');
    const wantedStatus = statusFilter ? statusFilter.value : 'all';
    let visibleCount = 0;

    cards.forEach(card => {
      const matchesQuery = card.dataset.search.toLocaleLowerCase('eu').includes(query);
      const matchesStatus = wantedStatus === 'all' || card.dataset.status === wantedStatus;
      const isVisible = matchesQuery && matchesStatus;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (count) {
      count.textContent = t('client.puzzleCount', { count: visibleCount });
    }
  }

  if (searchInput) searchInput.addEventListener('input', filterCatalog);
  if (statusFilter) statusFilter.addEventListener('change', filterCatalog);
});
