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
   //Down
     var index = x;
     var cell_id="c_"+index+"_"+y;

     $('td').removeClass('focus_across');
     $('td').removeClass('focus_down');

       while(index>=0 && !$("#"+cell_id).hasClass("black"))
       {
         index--;
         cell_id="c_"+index+"_"+y;
       }

       // ERROR PROBABLY HERE
       index++;
       let firstcell_x = index;
       cell_id="c_"+firstcell_x+"_"+y;
       let first_cell_id = cell_id;

     while(index<50 && !$("#"+cell_id).hasClass("black"))
       {
         $("#"+cell_id).addClass('focus_down');
         index++;
         cell_id="c_"+index+"_"+y;
       }

    //$('td').removeClass('selected_cell');
    //$('#'+first_cell_id).addClass('selected_cell');

 }

   // ---------------------------------------------------------------------------
   // SELECT WORD ACROSS
   //
   //
   // -----------------------------------------------------------------------------


 function selectWordAcross(x,y){
   //Across
    var index = y;
     var cell_id="c_"+x+"_"+index;

     $('td').removeClass('focus_across');
     $('td').removeClass('focus_down');

       while(index>=0 && !$("#"+cell_id).hasClass("black"))
       {
         index--;
         cell_id="c_"+x+"_"+index;
       }

       // ERROR PROBABLY HERE
       index++;
       let firstcell_y = index;
       cell_id="c_"+x+"_"+firstcell_y;
      let first_cell_id = cell_id;

     while(index<50 && !$("#"+cell_id).hasClass("black"))
       {
         $("#"+cell_id).addClass('focus_across');
         index++;
         cell_id="c_"+x+"_"+index;
       }

     //$('td').removeClass('selected_cell');
     //$('#'+first_cell_id).addClass('selected_cell');
}

   // ---------------------------------------------------------------------------
   // DELETE ALL
   //
   //
   // -----------------------------------------------------------------------------
   $('#delete_all').on('click', function(e){
       $('td').each(function(i)
       {
           if(!$(this).hasClass('black'))
           {
               var theId = $(this).attr("id");
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);

               deleteCell(x,y);
           }
       });
       $('.right').removeClass('right');
       $('.wrong').removeClass('wrong');
   });

   // -----------------------------------------------------------------------------
   // SOLVE CELL
   //
   //
   // -----------------------------------------------------------------------------
   $('#solve_cell').on('click', function(e){
       var theId = $('.selected_cell').attr("id");
       var splitted = theId.split("_");
       var x = parseInt(splitted[1]);
       var y = parseInt(splitted[2]);

       solveCell(x,y);
   });

   // -----------------------------------------------------------------------------
   // SOLVE WORD
   //
   //
   // -----------------------------------------------------------------------------
   $('#solve_word').on('click', function(e){
       var theId = $('.selected_cell').attr("id");
       var splitted = theId.split("_");
       var x = parseInt(splitted[1]);
       var y = parseInt(splitted[2]);

       if($("#c_"+x+"_"+y).hasClass('focus_across'))
       {
           $('.focus_across').each(function()
           {
               $('.selected_cell').removeClass('selected_cell');
               $(this).addClass('selected_cell');
               var theId = $('.selected_cell').attr("id");
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);

               solveCell(x,y);
           });
       }
       else
       {
           $('.focus_down').each(function()
           {
               $('.selected_cell').removeClass('selected_cell');
               $(this).addClass('selected_cell');
               var theId = $('.selected_cell').attr("id");
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);

               solveCell(x,y);
           });
       }

       $('.selected_cell').removeClass('selected_cell');
       $("#c_"+x+"_"+y).addClass('selected_cell');
   });

   // -----------------------------------------------------------------------------
   // SOLVE GRID
   //
   //
   // -----------------------------------------------------------------------------
   $('#solve_grid').on('click', function(e){
       $('td').each(function(i)
       {
           if(!$(this).hasClass('black'))
           {
               var theId = $(this).attr("id");
               //console.log(theId);
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);
               solveCell(x,y);
           }
       });
       $('.right').removeClass('right');
   });

   // -----------------------------------------------------------------------------
   // CHECK CELL
   //
   // -----------------------------------------------------------------------------
   $('#check_cell').on('click', function(e){
       var theId = $('.selected_cell').attr("id");
       var splitted = theId.split("_");
       var x = parseInt(splitted[1]);
       var y = parseInt(splitted[2]);

       checkCell(x,y);
   });

   // -----------------------------------------------------------------------------
   // CHECK WORD
   //
   // -----------------------------------------------------------------------------
   $('#check_word').on('click', function(e){
       var theId = $('.selected_cell').attr("id");
       var splitted = theId.split("_");
       var x = parseInt(splitted[1]);
       var y = parseInt(splitted[2]);

       if($("#c_"+x+"_"+y).hasClass('focus_across'))
       {
           $('.focus_across').each(function()
           {
               $('.selected_cell').removeClass('selected_cell');
               $(this).addClass('selected_cell');
               var theId = $('.selected_cell').attr("id");
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);

               checkCell(x,y);
           });
       }
       else
       {
           $('.focus_down').each(function()
           {
               $('.selected_cell').removeClass('selected_cell');
               $(this).addClass('selected_cell');
               var theId = $('.selected_cell').attr("id");
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);

               checkCell(x,y);
           });
       }

       $('.selected_cell').removeClass('selected_cell');
       $("#c_"+x+"_"+y).addClass('selected_cell');
   });

   // -----------------------------------------------------------------------------
   // CHECK GRID
   //
   // -----------------------------------------------------------------------------
   $('#check_grid').on('click', function(e){
       var theId = $('.selected_cell').attr("id");
       var splitted = theId.split("_");
       var x = parseInt(splitted[1]);
       var y = parseInt(splitted[2]);

       $('td').each(function(i)
       {
           if(!$(this).hasClass('black'))
           {
               $('.selected_cell').removeClass('selected_cell');
               $(this).addClass('selected_cell');
               var theId = $('.selected_cell').attr("id");
               var splitted = theId.split("_");
               var x = parseInt(splitted[1]);
               var y = parseInt(splitted[2]);

               checkCell(x,y);
           }
       });
       $('.selected_cell').removeClass('selected_cell');
       $("#c_"+x+"_"+y).addClass('selected_cell');
   });


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

       $span = $('.n').filter(function() {
           // Matches exact string
           return $(this).text() === n;
       });

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

       if(e.key=='Backspace')
       {
           if($('.selected_cell > .char').text()!="")
           {
               $('.selected_cell > .char').text("");
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
                       $('.selected_cell').removeClass('selected_cell');
                       $('#c_'+x+'_'+y).addClass('selected_cell');
                       $('.selected_cell > .char').text("");
                   }
               }
               else if($('.selected_cell').hasClass('focus_down'))
               {
                   x--;
                   if(x>=0 && !$('#c_'+x+'_'+y).hasClass('black'))
                   {
                       $('.selected_cell').removeClass('selected_cell');
                       $('#c_'+x+'_'+y).addClass('selected_cell');
                       $('.selected_cell > .char').text("");
                   }
               }
           }
       }
       if(e.which >= 65 && e.which <= 90 || e.key=='ñ')
       {
           $('.wrong').removeClass('wrong');
           $('.right').removeClass('right');

           $('.selected_cell > .char').text(e.key.toUpperCase());
           var id = $('.selected_cell').attr('id');
           var splitted = id.split("_");
           var x = parseInt(splitted[1]);
           var y = parseInt(splitted[2]);

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
