$(document).ready(function() {

   // ---------------------------------------------------------------------------
   // INITIAL SELECT
   //
   //
   // -----------------------------------------------------------------------------
   // $('body').on('click',function(){
   //   $('#in').focus();
   //   $('#in').click();
   // });

   $('#c_0_0').addClass('selected_cell');
   selectWordAcross(0,0);
   selectClue(getClueId(0,0,'across'));

   // ---------------------------------------------------------------------------
   // UNDO / REDO STACK
   // ---------------------------------------------------------------------------

   const PUZZLE_ID = $('.game-wrapper').data('puzzle-id');
   const undoStack = [];
   const redoStack = [];
   let _isReplaying = false;  // prevents saves during history replay
   let _saveTimer = null;

   function cellText(x, y) {
     return $('#c_'+x+'_'+y+' > .char').text();
   }

   function setCellText(x, y, value) {
     const $char = $('#c_'+x+'_'+y+' > .char');
     $char.text(value);
     if (value === '') {
       $char.removeClass('right wrong');
     }
   }

   function collectCells() {
     const cells = [];
     $('td:not(.black)').each(function() {
       const val = $(this).find('.char').text();
       if (val !== '') {
         const parts = $(this).attr('id').split('_');
         cells.push({ row: parseInt(parts[1]), col: parseInt(parts[2]), value: val });
       }
     });
     return cells;
   }

   // Immediate save — cancels any pending debounce timer
   function saveNow() {
     if (_isReplaying || !PUZZLE_ID || window._puzzleCompleted) return;
     clearTimeout(_saveTimer);
     _saveTimer = null;
     GameAPI.saveState(PUZZLE_ID, collectCells());
   }

   // Debounced save — waits 2s of inactivity before saving
   function scheduleSave() {
     if (_isReplaying || !PUZZLE_ID || window._puzzleCompleted) return;
     clearTimeout(_saveTimer);
     _saveTimer = setTimeout(saveNow, 2000);
   }

   // Save immediately when user leaves, hides or closes the tab
   document.addEventListener('visibilitychange', function() {
     if (document.visibilityState === 'hidden') saveNow();
   });
   window.addEventListener('beforeunload', function() {
     // Use sendBeacon for reliability on tab/window close
     if (!PUZZLE_ID || window._puzzleCompleted) return;
     clearTimeout(_saveTimer);
     const cells = collectCells();
     navigator.sendBeacon(
       '/api/game/history/' + PUZZLE_ID,
       new Blob([JSON.stringify({ cells })], { type: 'application/json' })
     );
   });

   function pushAction(action) {
     $('td').removeClass('empty-warn');
     undoStack.push(action);
     redoStack.length = 0;
     updateHistoryButtons();
     scheduleSave();
   }

   function applyUndo() {
     if (!undoStack.length) return;
     $('td').removeClass('empty-warn');
     const action = undoStack.pop();
     if (action.batch) {
       action.batch.forEach(a => setCellText(a.row, a.col, a.prev));
     } else {
       setCellText(action.row, action.col, action.prev);
     }
     redoStack.push(action);
     updateHistoryButtons();
     scheduleSave();
   }

   function applyRedo() {
     if (!redoStack.length) return;
     $('td').removeClass('empty-warn');
     const action = redoStack.pop();
     if (action.batch) {
       action.batch.forEach(a => setCellText(a.row, a.col, a.value));
     } else {
       setCellText(action.row, action.col, action.value);
     }
     undoStack.push(action);
     updateHistoryButtons();
     scheduleSave();
   }

   function updateHistoryButtons() {
     $('#undo_btn').prop('disabled', undoStack.length === 0);
     $('#redo_btn').prop('disabled', redoStack.length === 0);
   }

   // Load saved grid state on page load and apply to DOM
   async function loadAndReplay() {
     if (!PUZZLE_ID) return;
     const result = await GameAPI.loadState(PUZZLE_ID);
     if (result.error || !result.cells || result.cells.length === 0) return;
     _isReplaying = true;
     result.cells.forEach(function({ row, col, value }) {
       setCellText(row, col, value);
     });
     _isReplaying = false;
   }

   updateHistoryButtons();
   loadAndReplay();

   // ---------------------------------------------------------------------------
   // CHECKER
   //
   //
   // -----------------------------------------------------------------------------

   function checkCell(x,y){
       var right = $('.selected_cell > .char').text()===$('#c_answer_'+x+'_'+y).text();
       if(right)
       {
           $('.selected_cell > .char').addClass('right');
           $('.selected_cell > .char').removeClass('wrong');
       }
       else
       {
           $('.selected_cell > .char').addClass('wrong');
           $('.selected_cell > .char').removeClass('right');
       }
   }

   function deleteCell(x,y){
       $('#c_'+x+'_'+y+' > .char').text("");
   }

   // ---------------------------------------------------------------------------
   // SOLVER
   //
   //
   // -----------------------------------------------------------------------------

   function solveCell(x,y){
     //console.log('solveCell('+x+','+y+')');
     let cell_id='c_'+x+'_'+y;
     $('#'+cell_id+'> .char').removeClass('wrong');
     $('#'+cell_id+'> .char').addClass('right');
     $('#'+cell_id+'> .char').text($('#c_answer_'+x+'_'+y).text());
   }

   // ---------------------------------------------------------------------------
   // CLUE SELECTOR
   //
   //
   // -----------------------------------------------------------------------------

   function getClueId(x,y,dir){
     let id = '';
     if(dir =='down'){
       while(x>=0 && !$('#c_'+x+'_'+y).hasClass('black')){
         --x;
       }           //console.log($(this).attr('id'));
       x++;
       $("div[id^='cluedown']").each(function(){
         let split = $(this).attr('id').split('_');
         if(x==split[2] && y==split[3]){
            id= $(this).attr('id');
         }
       });
     }
     else if (dir == 'across'){
       //TODO: select clue
       while(y>=0 && !$('#c_'+x+'_'+y).hasClass('black')){
         --y;
       }
       y++;
       $("div[id^='clueacross']").each(function(){
         let split = $(this).attr('id').split('_');
         if(x==split[2] && y==split[3])
           id= $(this).attr('id');
       });
     }
     return id;
   }

   function selectClue(id){

     //console.log('Selecte CLUE: '+id);
       $('.selected_clue').removeClass('selected_clue');
       $("#"+id).addClass('selected_clue');

       $(".clues_across").scrollTo("#"+id,300,{over:{top:-1}});
       $(".clues_down").scrollTo("#"+id,300,{over:{top:-1}});

   }

   // function selectClueMin(id){
   //     $('.selected_clue_min').removeClass('selected_clue_min');
   //     $("#"+id).addClass('selected_clue_min');
   //
   //     $(".clues_across").scrollTo("#"+id,300);
   //     $(".clues_down").scrollTo("#"+id,300);
   //
   // }

   // ---------------------------------------------------------------------------
   // SELECT WORD DOWN
   //
   //
   // -----------------------------------------------------------------------------

 function selectWordDown(x,y){
     var index = x;
     var cell_id="c_"+index+"_"+y;

     $('td').removeClass('focus_across');
     $('td').removeClass('focus_down');

     // Retrocede hasta encontrar celda negra o borde del grid
     while(index>=0 && !$("#"+cell_id).hasClass("black")){
       index--;
       cell_id="c_"+index+"_"+y;
     }
     index++;
     cell_id="c_"+index+"_"+y;

     // Avanza marcando celdas mientras existan en el DOM y no sean negras
     while($("#"+cell_id).length > 0 && !$("#"+cell_id).hasClass("black")){
       $("#"+cell_id).addClass('focus_down');
       index++;
       cell_id="c_"+index+"_"+y;
     }
 }

   // ---------------------------------------------------------------------------
   // SELECT WORD ACROSS
   //
   //
   // -----------------------------------------------------------------------------


 function selectWordAcross(x,y){
     var index = y;
     var cell_id="c_"+x+"_"+index;

     $('td').removeClass('focus_across');
     $('td').removeClass('focus_down');

     // Retrocede hasta encontrar celda negra o borde del grid
     while(index>=0 && !$("#"+cell_id).hasClass("black")){
       index--;
       cell_id="c_"+x+"_"+index;
     }
     index++;
     cell_id="c_"+x+"_"+index;

     // Avanza marcando celdas mientras existan en el DOM y no sean negras
     while($("#"+cell_id).length > 0 && !$("#"+cell_id).hasClass("black")){
       $("#"+cell_id).addClass('focus_across');
       index++;
       cell_id="c_"+x+"_"+index;
     }
}

   // ---------------------------------------------------------------------------
   // DELETE ALL
   //
   //
   // -----------------------------------------------------------------------------
   $('#delete_all').on('click', function(e){
       const batch = [];
       $('td').each(function(i)
       {
           if(!$(this).hasClass('black'))
           {
               var theId = $(this).attr("id");
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);
               const prev = cellText(x, y);
               if(prev !== '') batch.push({ row: x, col: y, prev, value: '' });
               deleteCell(x,y);
           }
       });
       if(batch.length) pushAction({ batch });
       $('.right').removeClass('right');
       $('.wrong').removeClass('wrong');
   });

   // ---------------------------------------------------------------------------
   // UNDO / REDO BUTTONS
   // ---------------------------------------------------------------------------
   $('#undo_btn').on('click', function() { applyUndo(); });
   $('#redo_btn').on('click', function() { applyRedo(); });

   // -----------------------------------------------------------------------------
   // NOTE: solve_cell, solve_word, solve_grid, check_cell, check_word, check_grid
   // are handled by game_api.js via the backend API (no #hidden_grid needed)
   // -----------------------------------------------------------------------------


   // -----------------------------------------------------------------------------
   // SELECT WORD and CLUE ON CLICK TD
   //
   //
   // -----------------------------------------------------------------------------

   $('td').on('click', function(e) {
     // GET CELL POSITION
       var theId = $(this).attr("id");
       var splitted = theId.split("_");
       var x = parseInt(splitted[1]);
       var y = parseInt(splitted[2]);

       if(!$(this).hasClass('black')){
         $('td').removeClass('empty-warn');
         if($(this).hasClass('selected_cell'))
         {
           if($(this).hasClass('focus_across')){
             selectWordDown(x,y);
             //TODO: select clueç
             selectClue(getClueId(x,y,'down'));
             return;
           }
           else
             selectWordAcross(x,y);
             //TODO: select clue
             selectClue(getClueId(x,y,'across'));
             return;
         }
         else
         {
           $('td').removeClass('selected_cell');
           $(this).addClass('selected_cell');
           selectWordAcross(x,y);
           //TODO: select clue
           selectClue(getClueId(x,y,'across'));
           return;
        }
     }
   });

   // -----------------------------------------------------------------------------
   // SELECT WORD and CLUE ON CLICK CLUE
   //
   //
   // -----------------------------------------------------------------------------


   $('.clues_across > div , .clues_down > div').on('click', function(e){
       $('div').removeClass('selected_clue');
       $(this).addClass('selected_clue');
       //get n
       let clueid = $(this).attr('id');
       let splitted = clueid.split("_");
       let n = splitted[1];
       let x = splitted[2];
       let y = splitted[3];
       //console.log('Clue: '+n);

       $('td').removeClass('selected_cell');
       let first_cell_id = 'c_'+x+'_'+y;
       $('#'+first_cell_id).addClass('selected_cell');

       if($(this).parent().hasClass("clues_across")){
         selectWordAcross(x,y);
         selectClue(getClueId(x,y,'across'));
       }
       else{
         selectWordDown(x,y);
         selectClue(getClueId(x,y,'down'));
       }

   });


   // -----------------------------------------------------------------------------
   // CAPTURE KEYDOWNS
   //
   //
   // -----------------------------------------------------------------------------


   $(document).keydown(function(e){

       var max_y = $('#jokoa tr:nth-child(1) td').length;
       var max_x = $('#jokoa tr').length;

       // Ctrl+Z → undo / Ctrl+Y o Ctrl+Shift+Z → redo
       if(e.ctrlKey && e.key === 'z') { e.preventDefault(); applyUndo(); return; }
       if(e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); applyRedo(); return; }

       if(e.key=='Backspace')
       {
           $('td').removeClass('empty-warn');
           if($('.selected_cell > .char').text()!="")
           {
               var _id = $('.selected_cell').attr('id');
               var _sp = _id.split("_");
               var _bx = parseInt(_sp[1]);
               var _by = parseInt(_sp[2]);
               var _prev = cellText(_bx, _by);
               $('.selected_cell > .char').text("");
               pushAction({ row: _bx, col: _by, prev: _prev, value: '' });
           }
           else
           {
               var id = $('.selected_cell').attr('id');
               var splitted = id.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);
               if($('.selected_cell').hasClass('focus_across'))
               {
                   y--;
                   if(y>=0 && !$('#c_'+x+'_'+y).hasClass('black'))
                   {
                       var _prev = cellText(x, y);
                       $('.selected_cell').removeClass('selected_cell');
                       $('#c_'+x+'_'+y).addClass('selected_cell');
                       $('.selected_cell > .char').text("");
                       if(_prev !== '') pushAction({ row: x, col: y, prev: _prev, value: '' });
                   }
               }
               else if($('.selected_cell').hasClass('focus_down'))
               {
                   x--;
                   if(x>=0 && !$('#c_'+x+'_'+y).hasClass('black'))
                   {
                       var _prev = cellText(x, y);
                       $('.selected_cell').removeClass('selected_cell');
                       $('#c_'+x+'_'+y).addClass('selected_cell');
                       $('.selected_cell > .char').text("");
                       if(_prev !== '') pushAction({ row: x, col: y, prev: _prev, value: '' });
                   }
               }
           }
       }
       if(e.which >= 65 && e.which <= 90 || e.key=='ñ')
       {
           $('td').removeClass('empty-warn');
           $('.wrong').removeClass('wrong');
           $('.right').removeClass('right');

           var id = $('.selected_cell').attr('id');
           var splitted = id.split("_");
           var x = parseInt(splitted[1]);
           var y = parseInt(splitted[2]);
           var _prev = cellText(x, y);
           var _newVal = e.key.toUpperCase();
           $('.selected_cell > .char').text(_newVal);
           if(_prev !== _newVal) pushAction({ row: x, col: y, prev: _prev, value: _newVal });

           if($('.selected_cell').hasClass('focus_across'))
           {
               y++;
               if(y<max_y && !$('#c_'+x+'_'+y).hasClass('black'))
               {
                   $('.selected_cell').removeClass('selected_cell');
                   $('#c_'+x+'_'+y).addClass('selected_cell');
               }
               else
               {
                   y--;
                   while($('#c_'+x+'_'+y).hasClass('focus_across'))
                   {
                       y--;
                   }
                   y++;
                   $('.selected_cell').removeClass('selected_cell');
                   $('#c_'+x+'_'+y).addClass('selected_cell');
               }

           }
           else
           {
               x++;
               if(x<max_x && !$('#c_'+x+'_'+y).hasClass('black'))
               {
                   $('.selected_cell').removeClass('selected_cell');
                   $('#c_'+x+'_'+y).addClass('selected_cell');
               }
               else
               {
                   x--;
                   while($('#c_'+x+'_'+y).hasClass('focus_down'))
                   {
                       x--;
                   }
                   x++;
                   $('.selected_cell').removeClass('selected_cell');
                   $('#c_'+x+'_'+y).addClass('selected_cell');
               }
           }
       }
       else if(e.which >= 37 && e.which<=40)
       {
           $('td').removeClass('empty-warn');
           var id = $('.selected_cell').attr('id');
           var splitted = id.split("_");
           var x = parseInt(splitted[1]);
           var y = parseInt(splitted[2]);

           switch(e.which)
           {
               case 37: //LEFT
                   if($('#c_'+x+'_'+y).hasClass('focus_down'))
                   {
                       selectWordAcross(x,y);
                       selectClue(getClueId(x,y,'across'));
                       if($('.selected_cell > .char').text()!=null)
                       {
                           y--;
                           if($('#c_'+x+'_'+y).hasClass('focus_down'))
                           {
                               $('.selected_cell').removeClass('selected_cell');
                               $('#c_'+x+'_'+y).addClass('selected_cell');
                           }
                       }
                   }
                   else
                   {
                       y--;
                       while(y>0 && $('#c_'+x+'_'+y).hasClass('black'))
                       {
                           y--;
                       }

                       if(!$('#c_'+x+'_'+y).hasClass('black') && y>=0)
                       {
                           $('.selected_cell').removeClass('selected_cell');
                           $('#c_'+x+'_'+y).addClass('selected_cell');
                           selectWordAcross(x,y);
                           selectClue(getClueId(x,y,'across'));
                       }
                   }
                   break;
               case 38: //UP
                   if($('#c_'+x+'_'+y).hasClass('focus_across'))
                   {
                       selectWordDown(x,y);
                       selectClue(getClueId(x,y,'down'));
                   }
                   else
                   {
                       x--;
                       while(x>0 && $('#c_'+x+'_'+y).hasClass('black'))
                       {
                           x--;
                       }

                       if(!$('#c_'+x+'_'+y).hasClass('black') && x>=0)
                       {
                           $('.selected_cell').removeClass('selected_cell');
                           $('#c_'+x+'_'+y).addClass('selected_cell');
                           selectWordDown(x,y);
                           selectClue(getClueId(x,y,'down'));
                       }
                   }

                   break;
               case 39: //RIGHT
                   if($('#c_'+x+'_'+y).hasClass('focus_down'))
                   {
                       selectWordAcross(x,y);
                       selectClue(getClueId(x,y,'across'));
                   }
                   else
                   {
                       y++;
                       while(y<max_y-1 && $('#c_'+x+'_'+y).hasClass('black'))
                       {
                           y++;
                       }

                       if(!$('#c_'+x+'_'+y).hasClass('black') && y<max_y)
                       {
                           $('.selected_cell').removeClass('selected_cell');
                           $('#c_'+x+'_'+y).addClass('selected_cell');
                           selectWordAcross(x,y);
                           selectClue(getClueId(x,y,'across'));
                       }
                   }
                   break;
               case 40: //DOWN
                   if($('#c_'+x+'_'+y).hasClass('focus_across'))
                   {
                       selectWordDown(x,y);
                       selectClue(getClueId(x,y,'down'));
                   }
                   else
                   {
                       x++;
                       while(x<max_x-1 && $('#c_'+x+'_'+y).hasClass('black'))
                       {
                           x++;
                       }

                       if(!$('#c_'+x+'_'+y).hasClass('black') && x<max_x)
                       {
                           $('.selected_cell').removeClass('selected_cell');
                           $('#c_'+x+'_'+y).addClass('selected_cell');
                           selectWordDown(x,y);
                           selectClue(getClueId(x,y,'down'));
                       }
                   }

                   break;
           }
       }
   });
});
