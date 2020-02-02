require('dotenv/config');


checkAuth = (req,res,next)=>{
	if(!req.user || !req.user.master){
		req.flash('warning', 'Erabiltzaile honek ez du horretarako eskubiderik.');
		res.redirect('/');
	}
	else{
		next();
	}
};

module.exports = checkAuth;
