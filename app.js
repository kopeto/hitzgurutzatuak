
const {logError, notFoundHandler, defaultHandler, logInfo} = require('./utils.js');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const path = require('path');
const passport = require('passport');
const config = require('./config/database');
const sessionconfig = require('./config/sessionconfig');
const { clientMessages, translate } = require('./services/i18n');
require('dotenv/config');

const puzzles = require('./routes/puzzles');
const users = require('./routes/users');
const api = require('./routes/api');
const master = require('./routes/master');
const external = require('./routes/external');
const home = require('./routes/home');


const mongoose = require('mongoose');
mongoose.connect(config.database);
const db = mongoose.connection;
db.once('open',()=>{logInfo('Connected to mongodb');});
db.on('error',(err)=>{logError(err); process.exit(1);});

const app = express();

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
} else if (/^\d+$/.test(process.env.TRUST_PROXY || '')) {
  app.set('trust proxy', Number.parseInt(process.env.TRUST_PROXY, 10));
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  }
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static('public'));
// Serve jQuery and Bootstrap from node_modules (replaces bower_components)
app.use('/vendor/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));
app.use('/vendor/bootstrap/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/vendor/bootstrap/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

app.use(session({
  ...sessionconfig,
  store: MongoStore.create({ mongoUrl: config.database })
}));
app.use(require('connect-flash')());
app.use((req,res, next)=>{
	res.locals.messages = require('express-messages')(req,res);
	next();
});
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.t = translate;
  res.locals.clientMessages = clientMessages();
  next();
});
app.use(defaultHandler);
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.get('/ready', (req, res) => {
  if (db.readyState === 1) {
    return res.status(200).json({ status: 'ready' });
  }
  return res.status(503).json({ status: 'not-ready' });
});
app.use('/jokoak', puzzles);
app.use('/users', users);
app.use('/api', api);
app.use('/master', master);
app.use('/api/game', api);
app.use('/external', external);
app.use('/', home);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  logError(err);
  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = statusCode >= 500
    ? 'Zerbitzariaren errore bat gertatu da.'
    : 'Eskaera ezin izan da osatu.';

  if (req.path.startsWith('/api/') || req.path.startsWith('/external/')) {
    return res.status(statusCode).json({ error: true, message });
  }

  return res.status(statusCode).render('message', { message, type: 'danger' });
});

app.use(notFoundHandler);

app.listen(process.env.PORT || 3000, ()=>{
	logInfo('Easy example. Listening on port '+(process.env.PORT || 3000));
});
