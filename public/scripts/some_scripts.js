$(document).ready(()=>{
  $('.deletePUZ').on('click',(e)=>{
    $target = $(e.target);
    const id = $target.attr('data-id');
    $.ajax({
      type: 'DELETE',
      url: '/puzzles/game/'+id,
      success: (resp)=>{
        window.location.href='/';
      },
      error: (err)=>{
        console.log(err);
      }
    });
  });

  $('.close').on('click',()=>{
    $('.close').parent().parent().remove();
  });
});
