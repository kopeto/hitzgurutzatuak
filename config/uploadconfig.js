const multer = require('multer');
const path = require('path');

const checkIfPuz = (req, file, cb) =>{
  //console.log('CHECK IF PUZ.');
  if(file.originalname.split('.').pop() != 'puz'){
    //console.log('PuzFileCheck failed.');
    req.uploadErrors = [{
      filename: file.originalname,
      message: 'Ez da puz fitxategia'
    }];
    // cb(new Error( 'Ez da puz fitxategia'), false);
    cb(null, false);

  }
  else{
    //console.log('PuzFileChack passed.');
    cb(null, true);
  }
  // You can always pass an error if something goes wrong:
  //cb(new Error('I don\'t have a clue!'))
}

const storage = multer.diskStorage({
	destination: (req,file,cb)=>{
		cb(null, 'uploads');
	},
	filename: (req,file,cb)=>{
    //console.log(file)
    //cb(null,'probarako');
		cb(null, file.originalname);
	}
});

const upload = multer({
	storage: storage,
  fileFilter: checkIfPuz
});



module.exports = upload;
