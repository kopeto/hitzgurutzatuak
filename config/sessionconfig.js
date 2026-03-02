const sessionconfig = {
		secret: process.env.MY_SECRET || 'fallback_dev_secret',
		resave: true,
		saveUninitialized: true
	}

module.exports = sessionconfig;
