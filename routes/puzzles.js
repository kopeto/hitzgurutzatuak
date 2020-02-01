const {logDate, logError} = require('../utils.js');
const express = require('express');
const router = express.Router();
const path = require('path');
const multipart = require('connect-multiparty');

// Crossword Class
const Crossword = require('../cw/crossword.js');
// Models
const CrosswordModel = require('../models/crosswords');

const { check, validationResult } = require('express-validator');
const flash = require('connect-flash');

const upload = require('../config/uploadconfig');

// Multiparty middleware
const multipartMiddleware = multipart();
router.get('/',(req,res)=>{
	CrosswordModel.find({},(err, puzzles)=>{
		if(err){
			logError(err);
		}
		else{
			res.render('puzzles',{
				title: 'Puzleak',
				puzzles: puzzles
			});
		}
	});
});

router.get('/upload',(req,res)=>{
	if(!req.user || req.user.username!=='ander'){
		req.flash('warning', 'Erabiltzaile honek ezin du helbide horretan muturra sartu.');
		res.redirect('/');
	}
	else{
		res.render('upload',{
			title: 'Puz fitxategia kargatu',
			errors: {}
		});
	}
});

const validator = [
		check('filename','Ez duzu fitxategirik hautatu').notEmpty(),
		check('filename').custom(value=>{
			if(value && value.split('.').pop().toLowerCase()!=='puz'){
				throw new Error('Ez da puz fitxategia.');
			}
			// Indicates the success of this synchronous custom validator
			return true;
		})
	];

const checkValidations = (req,res,next)=>{
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		res.render('upload',errors);
	}
		else{
		next()
	}
};

//router.post('/upload',validator,checkValidations);

// router.post('/upload',multipartMiddleware, (req,res,next)=>{
// 	console.log(req.file);
// 	//req.originalName=req.files.filename.originalFilename;
// 	next();
// });




router.post('/upload', upload.single('filename'),(req,res,next)=>{
	if(req.file === undefined){
		req.uploadErrors.forEach((err, index)=>{
			req.flash('danger','\''+err.filename+'\' '+err.message  );
		});
		//req.flash('danger','Erroreren bat izan da');
		res.redirect('/puzzles');
	}else{
		let filePath = path.join(path.join(__dirname, '../uploads'), req.file.originalname );
		let crossword = new Crossword(filePath);
		let cw = new CrosswordModel();
		cw.filename=req.file.originalname ;
		cw.width=crossword.width;
		cw.height=crossword.height;
		cw.words=crossword.words;
		cw.clues=crossword.clues;
		cw.void_grid=crossword.void_grid;
		cw.filled_grid=crossword.filled_grid;
		if(crossword.cw_name=='Unknown'){cw.name='noname';}
		else cw.name=crossword.cw_name;
		if(crossword.cw_author=='Unknown'){cw.author='Joxan Elosegi';}
		else cw.author=crossword.cw_author;
		//crossword.print_grid();
		cw.save((err)=>{
			if(err){
				if(err.name == 'MongoError' && err.code == 11000){
					logError({message: err.name+': Key duplicate error'});
					req.flash('danger', err.name+': \''+req.file.filename+'\' errepikatuta dago.');
				}else{
					logError(err);
					req.flash('danger', 'Erroreren bat izan da');
				}
				res.redirect('/puzzles');
				//return;
			}else{
				req.flash('success', 'Puzlea Kargatuta');
				res.redirect('/puzzles');
			}
		});
	}

});

router.get('/game/:id',(req,res)=>{
	CrosswordModel.findById(req.params.id, (err,puzzle)=>{
		if(err){
			//console.log(colors.red(err.message));
			logError(err);
			req.flash('danger', 'Erroreren bat gertatu da.');
			res.redirect('/puzzles');
		}
		else{
			res.render('game',{
				title: 'JOKOA',
				puz: puzzle
			});
		}
	});
});

router.delete('/game/:id',(req,res)=>{
	CrosswordModel.deleteOne({_id: req.params.id},(err)=>{
		if(err){
			req.flash('danger','Erroreren bat izan da');
			res.end();
		}else{
			req.flash('success','Jokoa ezabatu dugu');
			res.end();
		}

	});
});


module.exports = router;
