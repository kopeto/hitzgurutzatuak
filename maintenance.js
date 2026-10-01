const express = require('express');
const helmet = require('helmet');
const path = require('path');

const app = express();

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

// Keep process probes available while every site and API path shows maintenance.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready', mode: 'maintenance' });
});

app.use((req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    'Content-Language': 'eu'
  });
  return res.status(503).render('maintenance');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Maintenance page listening on port ${port}`);
});
