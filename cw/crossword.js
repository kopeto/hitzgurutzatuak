
const fs = require('fs');
const path = require('path');

function string_from_buffer(buf, init, end){
  let str = '';
  for(let index=init; index<end; index++){
    str+=String.fromCharCode(buf[index]);
  }
  return str;
}

function grid_from_buffer(buf,offset,w,h){
    var grid=new Array(h);
    for(i=0;i<h;i++){
        grid[i] = new Array(w);
        for(j=0;j<w;j++){
            grid[i][j]=String.fromCharCode(buf[offset]);
            offset++;
        }
    }
    return grid;
}
function clues_from_buffer(buf,offset,filesize){
    var clues=new Array();
    var i=0;
    while(offset<filesize){
        var init = offset;
        while(buf.readUInt8(offset)!=0){
            offset++;
        }
        if(init!=offset){
            clues[i]=string_from_buffer(buf,init,offset);
            i++;
        }
        offset++;
    }
    return clues;
}

function words_from_grid(grid,w,h){
    var words = new Array();
    var n=0;

    for(let i=0; i<h;i++){
        for(let j=0;j<w;j++){
            //Across
            let index=j;
            if( (index==0 || grid[i][index-1]=='.')&& grid[i][index]!='.' && index+1<w && grid[i][index+1]!='.' ){
                words[n]={word:"",dir:'right',x:i,y:j,length:0};
                while(index<w && grid[i][index]!='.'){
                    words[n].word+=grid[i][index];
                    index++;
                }
                words[n].length=index-j;
                n++;
            }

            index=i;
            if( (index==0 || grid[index-1][j]=='.')&& grid[index][j]!='.' && index+1<h && grid[index+1][j]!='.' ){
                words[n]={word:"",dir:'down',x:i,y:j,length:0};
                while(index<h && grid[index][j]!='.'){
                    words[n].word+=grid[index][j];
                    index++;
                }
                words[n].length=index-i;
                n++;
            }
        }
    }
    return words;
}


class Crossword{
    constructor(filepath){
        try{
            const buffer = fs.readFileSync(filepath);
            this.filename = filepath;
            this.filesize = buffer.length;
            this.width = buffer.readUInt8(0x2c);
            this.height = buffer.readUInt8(0x2d);

            //console.log("Grid size: "+width+"x"+height);

            const filled_grid_position = 0x34;
            const void_grid_position = filled_grid_position + this.width*this.height;
            const cw_info_position = void_grid_position + this.width*this.height;

            this.filled_grid = grid_from_buffer(buffer,filled_grid_position,this.width,this.height);
            this.void_grid = grid_from_buffer(buffer,void_grid_position,this.width,this.height);



            var info_index = cw_info_position;
            var aux_index = cw_info_position;
            while(buffer.readUInt8(info_index)!=0){
                info_index++;
            }
            this.cw_name = string_from_buffer(buffer,aux_index,info_index);
            info_index++;
            aux_index = info_index;

            while(buffer.readUInt8(info_index)!=0){
                info_index++;
            }
            this.cw_author = string_from_buffer(buffer,aux_index,info_index);
            info_index++;
            aux_index = info_index;

            while(buffer.readUInt8(info_index)!=0){
                info_index++;
            }
            this.cw_copyright =string_from_buffer(buffer,aux_index,info_index);
            info_index++;
            aux_index = info_index;

            if(this.cw_name=="") this.cw_name = "Unknown";
            if(this.cw_author=="") this.cw_author = "Unknown";
            if(this.cw_copyright=="") this.cw_copyright = "Unknown";

            this.clues = clues_from_buffer(buffer,info_index,this.filesize);
            this.words = words_from_grid(this.filled_grid,this.width,this.height);

        } catch(ex){
            console.log("Error name: "+ex.name);
            console.log("Error message: "+ex.message);
            return;
        }
    }

    print_grid(){
        for(let i=0;i<this.height;i++){
            for(let j=0;j<this.width;j++){
                process.stdout.write(this.filled_grid[i][j]);
            }
            console.log();
        }
    }

    print_words_and_clues(){
        for(var i=0;i<this.words.length;i++){
            console.log("["+i+"] "+this.words[i].word+" - "+this.clues[i]);
        }
    }

    print_info(){
        console.log("Name: "+this.cw_name);
        console.log("Author: "+this.cw_author);
        console.log("Copyright: "+this.cw_copyright);
    }
}

//     filePath = path.join(__dirname,  process.argv[2]);

module.exports =  Crossword ;
