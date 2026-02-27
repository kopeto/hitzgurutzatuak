# ✅ Checklist de Deployment - Hitzgurutzatuak

## 🚀 Pre-Deployment

### Desarrollo Local

- [ ] **Servidor corriendo sin errores**
  ```bash
  npm start
  # Verificar: "Server listening on port 3000"
  # Verificar: "Connected to mongodb"
  ```

- [ ] **Tests pasando**
  ```bash
  npm test
  # 8/8 tests deben pasar
  ```

- [ ] **API funcionando**
  ```bash
  bash tests/test-game-api.sh
  # Todos los tests ✓ PASS
  ```

- [ ] **Jugar un crucigrama completo**
  - Iniciar juego en `/puzzles/game/:id`
  - Verificar celdas
  - Pedir pistas
  - Completar puzzle
  - Verificar modal de victoria

- [ ] **Verificar seguridad en DevTools**
  - F12 → Network tab
  - Filtrar por "game"
  - Verificar que `filled_grid` NUNCA aparece
  - Verificar que solo `void_grid` se envía

---

## 🔒 Seguridad

### Variables de Entorno

- [ ] **Crear archivo `.env`**
  ```bash
  cp .env.example .env
  ```

- [ ] **Configurar variables críticas**
  ```env
  NODE_ENV=production
  PORT=3000
  
  # MongoDB
  MONGODB_URI=mongodb://usuario:password@host:27017/hitzgurutzatuak
  
  # Sesiones (CAMBIAR EN PRODUCCIÓN)
  SESSION_SECRET=cambiar-este-secreto-super-largo-y-aleatorio-en-produccion
  SESSION_NAME=hitzgurutzatuak_session
  SESSION_MAX_AGE=86400000  # 24 horas
  
  # Rate Limiting
  RATE_LIMIT_WINDOW=900000  # 15 minutos
  RATE_LIMIT_MAX=100
  RATE_LIMIT_AUTH_MAX=5
  ```

- [ ] **Generar SESSION_SECRET seguro**
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  # Copiar resultado a .env
  ```

- [ ] **Agregar .env a .gitignore**
  ```bash
  echo ".env" >> .gitignore
  ```

### Dependencias

- [ ] **Actualizar dependencias vulnerables**
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **Verificar versiones**
  ```bash
  npm outdated
  # Actualizar si es necesario
  ```

- [ ] **Eliminar dependencias de desarrollo en producción**
  ```bash
  npm prune --production
  ```

### Configuración de Helmet

- [ ] **Revisar CSP en `app.js`**
  ```javascript
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],  // Ajustar según necesidad
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    }
  }));
  ```

### Rate Limiting

- [ ] **Ajustar límites según tráfico esperado**
  ```javascript
  // En app.js
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutos
    max: 200,  // Ajustar según necesidad
    message: 'Demasiadas peticiones, intenta más tarde'
  });
  ```

---

## 🗄️ Base de Datos

### MongoDB

- [ ] **Backup de la base de datos**
  ```bash
  mongodump --uri="mongodb://localhost:27017/hitzgurutzatuak" --out=./backup
  ```

- [ ] **Crear índices necesarios**
  ```javascript
  db.crosswords.createIndex({ name: 1 });
  db.users.createIndex({ username: 1 }, { unique: true });
  db.users.createIndex({ email: 1 }, { unique: true });
  ```

- [ ] **Verificar conexión remota**
  ```bash
  mongo "mongodb://usuario:password@host:27017/hitzgurutzatuak"
  ```

### Sesiones en Producción

- [ ] **Instalar Redis para sesiones**
  ```bash
  npm install connect-redis redis
  ```

- [ ] **Configurar Redis en `config/sessionconfig.js`**
  ```javascript
  const RedisStore = require('connect-redis').default;
  const { createClient } = require('redis');
  
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  redisClient.connect();
  
  module.exports = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({ client: redisClient }),
    cookie: {
      secure: true,  // HTTPS en producción
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000
    }
  };
  ```

- [ ] **Iniciar Redis**
  ```bash
  redis-server
  ```

---

## 🌐 Servidor

### Nginx (Recomendado)

- [ ] **Instalar Nginx**
  ```bash
  sudo apt install nginx
  ```

- [ ] **Configurar reverse proxy**
  ```nginx
  # /etc/nginx/sites-available/hitzgurutzatuak
  server {
      listen 80;
      server_name hitzgurutzatuak.com;
      
      location / {
          proxy_pass http://localhost:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
      
      # Cache para archivos estáticos
      location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
          proxy_pass http://localhost:3000;
          expires 1y;
          add_header Cache-Control "public, immutable";
      }
  }
  ```

- [ ] **Habilitar sitio**
  ```bash
  sudo ln -s /etc/nginx/sites-available/hitzgurutzatuak /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl restart nginx
  ```

### HTTPS con Let's Encrypt

- [ ] **Instalar Certbot**
  ```bash
  sudo apt install certbot python3-certbot-nginx
  ```

- [ ] **Obtener certificado SSL**
  ```bash
  sudo certbot --nginx -d hitzgurutzatuak.com -d www.hitzgurutzatuak.com
  ```

- [ ] **Configurar renovación automática**
  ```bash
  sudo certbot renew --dry-run
  ```

### PM2 (Process Manager)

- [ ] **Instalar PM2**
  ```bash
  npm install -g pm2
  ```

- [ ] **Crear archivo ecosystem**
  ```javascript
  // ecosystem.config.js
  module.exports = {
    apps: [{
      name: 'hitzgurutzatuak',
      script: './app.js',
      instances: 2,  // Cluster mode
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }]
  };
  ```

- [ ] **Iniciar con PM2**
  ```bash
  pm2 start ecosystem.config.js --env production
  pm2 save
  pm2 startup
  ```

- [ ] **Monitorear**
  ```bash
  pm2 monit
  pm2 logs
  ```

---

## 🔍 Monitoreo

### Logs

- [ ] **Configurar rotación de logs**
  ```bash
  npm install winston winston-daily-rotate-file
  ```

- [ ] **Implementar logging avanzado** (opcional)
  ```javascript
  const winston = require('winston');
  require('winston-daily-rotate-file');
  
  const transport = new winston.transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d'
  });
  
  const logger = winston.createLogger({
    transports: [transport]
  });
  ```

### Métricas

- [ ] **Configurar monitoreo de uptime** (opcional)
  - UptimeRobot
  - Pingdom
  - StatusCake

- [ ] **Alertas de errores** (opcional)
  - Sentry
  - Rollbar
  - New Relic

---

## 🧪 Testing en Producción

### Smoke Tests

- [ ] **Verificar endpoints públicos**
  ```bash
  curl -I https://hitzgurutzatuak.com
  # Esperar: 200 OK
  ```

- [ ] **Verificar API**
  ```bash
  curl https://hitzgurutzatuak.com/puzzles
  # Esperar: JSON con lista de puzzles
  ```

- [ ] **Verificar headers de seguridad**
  ```bash
  curl -I https://hitzgurutzatuak.com
  # Verificar: X-Content-Type-Options, X-Frame-Options, etc.
  ```

### Load Testing (opcional)

- [ ] **Instalar herramienta de carga**
  ```bash
  npm install -g artillery
  ```

- [ ] **Crear test de carga**
  ```yaml
  # load-test.yml
  config:
    target: 'https://hitzgurutzatuak.com'
    phases:
      - duration: 60
        arrivalRate: 10
  scenarios:
    - flow:
        - get:
            url: "/puzzles"
  ```

- [ ] **Ejecutar test**
  ```bash
  artillery run load-test.yml
  ```

---

## 📦 Optimización

### Frontend

- [ ] **Minificar CSS/JS**
  ```bash
  npm install -g uglify-js clean-css-cli
  uglifyjs public/scripts/*.js -o public/scripts/bundle.min.js
  cleancss public/style/*.css -o public/style/bundle.min.css
  ```

- [ ] **Comprimir imágenes**
  ```bash
  npm install -g imagemin-cli
  imagemin public/images/* --out-dir=public/images/optimized
  ```

### Backend

- [ ] **Habilitar compresión**
  ```javascript
  const compression = require('compression');
  app.use(compression());
  ```

- [ ] **Cache de respuestas** (opcional)
  ```javascript
  const apicache = require('apicache');
  let cache = apicache.middleware;
  
  app.get('/puzzles', cache('5 minutes'), async (req, res) => {
    // ...
  });
  ```

---

## 📄 Documentación

- [ ] **README.md actualizado**
  - Instrucciones de instalación
  - Configuración de entorno
  - Comandos de deployment

- [ ] **API documentation**
  - `docs/GAME_API.md`
  - `docs/API_USAGE_GUIDE.md`

- [ ] **Changelog**
  - Crear `CHANGELOG.md`
  - Documentar cambios de versión

---

## 🚨 Plan de Rollback

- [ ] **Backup del código anterior**
  ```bash
  git tag v1.0.0-pre-refactoring
  git push --tags
  ```

- [ ] **Script de rollback**
  ```bash
  #!/bin/bash
  # rollback.sh
  git checkout v1.0.0-pre-refactoring
  npm install
  pm2 restart hitzgurutzatuak
  ```

- [ ] **Backup de base de datos**
  ```bash
  mongodump --out=./backup-pre-deploy
  ```

---

## 🎯 Post-Deployment

### Inmediatamente después

- [ ] **Verificar que el sitio carga**
  ```bash
  curl -I https://hitzgurutzatuak.com
  ```

- [ ] **Probar autenticación**
  - Login
  - Registro
  - Logout

- [ ] **Jugar un crucigrama completo**
  - Iniciar juego
  - Verificar celdas
  - Completar puzzle

- [ ] **Revisar logs**
  ```bash
  pm2 logs
  tail -f logs/app.log
  ```

### Primera semana

- [ ] **Monitorear errores**
  - Revisar logs diariamente
  - Verificar métricas de uptime

- [ ] **Recopilar feedback de usuarios**
  - ¿Funciona correctamente?
  - ¿Hay bugs?

- [ ] **Optimizar según uso real**
  - Rate limits
  - Cache
  - Índices de base de datos

---

## 🔧 Troubleshooting

### Problema: "connect ECONNREFUSED"

**Solución:**
```bash
# Verificar que MongoDB está corriendo
sudo systemctl status mongod
sudo systemctl start mongod
```

### Problema: "Error: listen EADDRINUSE"

**Solución:**
```bash
# Encontrar proceso usando el puerto
lsof -i :3000
# Matar proceso
kill -9 <PID>
```

### Problema: Sesiones no persisten

**Solución:**
- Verificar que Redis está corriendo
- Verificar configuración de cookies (secure, httpOnly)
- Verificar que SESSION_SECRET está configurado

### Problema: Rate limit demasiado restrictivo

**Solución:**
```javascript
// Ajustar en app.js
const generalLimiter = rateLimit({
  max: 200,  // Aumentar límite
  // ...
});
```

---

## 📞 Contactos de Emergencia

- **Desarrollador:** Ander
- **Hosting:** [Proveedor]
- **Base de datos:** [Proveedor MongoDB]
- **Dominio:** [Registrador]

---

## ✅ Checklist Final

- [ ] Servidor en producción funcionando
- [ ] HTTPS configurado
- [ ] Base de datos en producción
- [ ] Sesiones con Redis
- [ ] Logs configurados
- [ ] PM2 con autorestart
- [ ] Nginx reverse proxy
- [ ] Backups automáticos
- [ ] Monitoreo de uptime
- [ ] Documentación completa
- [ ] Tests pasando
- [ ] Plan de rollback listo

---

**¡Deployment completado!** 🚀

**Fecha:** _______________  
**Por:** _______________  
**Versión:** 2.0.0 (Secure API Refactoring)
