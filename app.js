
const {logDate, logError, notFoundHandler, defaultHandler, logInfo} = require('./utils.js');
const express = require('express');
const bodyparser = require('body-parser');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const config = require('./config/database');
const sessionconfig = require('./config/sessionconfig');
require('dotenv/config');

// ROutes
const puzzles = require('./routes/puzzles');
const users = require('./routes/users');


//************************************************
// MONGO DB setup
//************************************************
const mongoose = require('mongoose');
mongoose.connect(config.database, config.db_options);
const db = mongoose.connection;
db.once('open',()=>{logInfo('Connected to mongodb');});
db.on('error',(err)=>{logError(err); exit();});

//************************************************
// APPLICATION
//************************************************
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyparser.urlencoded({extended: false}));
app.use(bodyparser.json());

// Express Session Middleware
app.use(session(sessionconfig));
// Express Messages Middleware
app.use(require('connect-flash')());
app.use((req,res, next)=>{
	res.locals.messages = require('express-messages')(req,res);
	next();
});
// Pass port config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(defaultHandler);
app.use('/puzzles', puzzles);
app.use('/users', users);
app.get('/',(req,res)=>{res.redirect('/puzzles');});

// Not found page handle:
app.use(notFoundHandler);

app.listen(process.env.PORT || 3000, ()=>{
	logInfo('Easy example. Listening on port '+(process.env.PORT || 3000));
});
