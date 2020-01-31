const multer = require('multer');

const checkIfPuz = (req, file, cb) =>{
  console.log('CHECK IF PUZ.');
  if(req.originalName.split('.').pop() != 'puz'){
    cb(new Error( 'Ez da puz fitxategia'), false);
  }
  else{
    cb(null, true);
  }
  // You can always pass an error if something goes wrong:
  //cb(new Error('I don\'t have a clue!'))
}

const storagePuzzle = multer.diskStorage({
	destination: (req,file,cb)=>{
		cb(null, path.join(__dirname,'../puz'));
	},
	filename: (req,file,cb)=>{
    //cb(null,'probarako');
		cb(null,file.originalname);
	}
});

const upload = multer({
	storage: storagePuzzle
  //fileFilter: checkIfPuz
});



module.exports = upload;
