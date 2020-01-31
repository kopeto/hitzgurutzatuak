const colors = require('colors/safe');

const logDate = ()=>{
	const date = new Date();
	var d_str ='['+ date.getFullYear()+'-';
	d_str +=
		+(date.getMonth()+1)>9?(date.getMonth()+1):('0'+(date.getMonth()+1))+'-'
		+(date.getDate()>9?date.getDate():'0'+date.getDate())+'_'
		+(date.getHours()>9?date.getHours():'0'+date.getHours())+':'
		+(date.getMinutes()>9?date.getMinutes():'0'+date.getMinutes())+':'
		+(date.getSeconds()>9?date.getSeconds():'0'+date.getSeconds())
		+']';
	return d_str;
}

const logError = (err)=>{
  console.log(colors.red(logDate()+' - '+err.message));
	if(err.stack)
  	console.log(colors.green(err.stack));
}

const logInfo = (info)=>{
	console.log(colors.cyan(logDate()+' - '+info));
}

const notFoundHandler = (req,res)=>{
	console.log(colors.red(logDate()+' - '+req.method+' '+req.url + ' not found.'));
	res.render('notfound',{
		title: 'Not Found',
		url: req.url
	});
}

const defaultHandler = (req,res,next)=>{
	logInfo(req.method+' '+req.url);
	res.locals.user = req.user || null;
	next();
}

module.exports = { logDate, logError, notFoundHandler, defaultHandler, logInfo};
