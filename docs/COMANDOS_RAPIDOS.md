# ⚡ Comandos Rápidos - Referencia

## 🚀 LANZAR LA APP (Asumo MongoDB corriendo)

### Opción 1: Script automático (Windows)
```cmd
start-local.bat
```

### Opción 2: Script automático (Linux/macOS)
```bash
./start-local.sh
```

### Opción 3: Manual (Cualquier SO)
```bash
npm start
```

### Opción 4: Desarrollo con auto-reload
```bash
npm run dev
```

---

## 🔐 CREAR/RESETEAR USUARIO MAESTRO

### Crear usuario maestro (username: master, password: 1234)
```bash
node create-master.js
# o con parámetros personalizados:
node create-master.js otrousuario mipasahitz email@example.com
```

### Dar permisos master a usuario existente
```bash
npm run user:grant-master <username>
```

---

## 🗄️ MONGODB - Comandos Rápidos

### Instalar (Windows con Chocolatey)
```powershell
choco install mongodb-community
```

### Lanzar MongoDB
```bash
mongod
```

### Conectar a MongoDB shell
```bash
mongosh
# O versión antigua:
mongo
```

### Ver bases de datos
```
> show dbs
```

### Usar base de datos CW
```
> use CW
```

### Ver colecciones
```
> show collections
```

### Ver usuarios
```
> db.users.find().pretty()
```

### Salir
```
> exit
```

---

## 📦 NPM - Comandos Útiles

### Instalar dependencias
```bash
npm install
```

### Ver dependencias instaladas
```bash
npm list --depth=0
```

### Lanzar tests
```bash
npm test
```

### Listar scripts disponibles
```bash
npm run
```

---

## 🔍 VERIFICAR ESTADO

### Ver si Node está instalado
```bash
node --version
```

### Ver si npm está instalado
```bash
npm --version
```

### Ver si MongoDB está instalado
```bash
mongod --version
```

### Ver si puerto 3000 está disponible (Windows)
```cmd
netstat -ano | findstr :3000
```

### Ver si puerto 3000 está disponible (macOS/Linux)
```bash
lsof -i :3000
```

### Ver si puerto 27017 (MongoDB) está disponible
```bash
# Windows:
netstat -ano | findstr :27017

# macOS/Linux:
lsof -i :27017
```

---

## 🔧 SOLUCIONES RÁPIDAS

### Liberar puerto 3000 (Windows)
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm start
```

### Liberar puerto 3000 (macOS/Linux)
```bash
lsof -i :3000
kill -9 <PID>
npm start
```

### Reinstalar dependencias
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

### Resetear base de datos (CUIDADO: borra todo)
```bash
mongosh
# Dentro de mongosh:
> use CW
> db.dropDatabase()
> exit
```

---

## 📝 CONFIGURACIÓN

### Ver archivo .env
```bash
cat .env
# o
type .env
```

### Editar puerto (cambiar de 3000 a otro)
```bash
# En archivo .env:
PORT=4000
```

### Cambiar conexión MongoDB (usar Atlas en lugar de local)
```bash
# En archivo .env:
DB_CONNECTION=mongodb+srv://user:pass@cluster.mongodb.net/CW
```

---

## 🎯 FLUJO TÍPICO (Primavez)

```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Crear usuario y lanzar app (se abre automáticamente con start-local.bat)
cd proyecto
node create-master.js master 1234
npm start

# Terminal 3 o navegador:
http://localhost:3000
# Login: master / 1234
```

---

## 📊 URLS INTERNAS

| URL | Descripción |
|-----|------------|
| http://localhost:3000/ | Home |
| http://localhost:3000/users/login | Login |
| http://localhost:3000/users/register | Registro |
| http://localhost:3000/puzzles | Lista de puzzles |
| http://localhost:3000/puzzles/upload | Subir puzzle |
| http://localhost:3000/master | Panel maestro |
| http://localhost:3000/api/... | API REST |

---

## 🧪 TESTING

### Correr tests
```bash
npm test
```

### Probar conexión MongoDB
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost/CW').then(() => { console.log('OK'); mongoose.disconnect(); process.exit(0); }).catch(e => { console.error('Error:', e.message); process.exit(1); })"
```

### Crear usuario vía Node
```bash
node -e "
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/CW').then(async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('1234', salt);
  const user = new User({ email: 'test@test.com', username: 'test', password: hash, master: true });
  await user.save();
  console.log('Usuario creado');
  mongoose.disconnect();
  process.exit(0);
});
"
```

---

## 🔐 GESTIÓN DE USUARIOS

### Listar todos los usuarios (en mongosh)
```
> use CW
> db.users.find().pretty()
```

### Crear usuario directamente (en mongosh)
```
> db.users.insertOne({ email: 'user@test.com', username: 'testuser', password: 'hashedhash', master: false })
```

### Hacer usuario master (en mongosh)
```
> db.users.updateOne({ username: 'testuser' }, { $set: { master: true } })
```

### Eliminar usuario (en mongosh)
```
> db.users.deleteOne({ username: 'testuser' })
```

---

## 📚 INFORMACIÓN UTIL

- **Ruta proyecto**: `c:\Users\ander\hitzgurutzatuak`
- **Puerto app**: `3000`
- **Puerto MongoDB**: `27017`
- **Base de datos**: `CW`
- **Usuario por defecto**: `master` / `1234`
- **Archivo config**: `.env`
- **Archivo principal**: `app.js`

---

## 💡 ATAJOS

### Crear alias (Linux/macOS)
```bash
alias start-app="cd ~/hitzgurutzatuak && npm start"
alias start-mongo="mongod"
```

### Script batch (Windows) - Ver logs
```cmd
@echo off
npm start > app.log 2>&1
```

---

**¡Con estos comandos tienes todo para lanzar y gestionar la aplicación!** ⚡
