# Guía: Lanzar Hitzgurutzatuak en Local

## Prerrequisitos

### 1. Instalar MongoDB

#### Windows (Opción A: Usando Chocolatey)
```powershell
# Si tienes Chocolatey instalado:
choco install mongodb-community

# Luego inicia MongoDB:
mongod
```

#### Windows (Opción B: Descarga directa)
1. Descarga desde: https://www.mongodb.com/try/download/community
2. Ejecuta el instalador
3. En PowerShell o CMD, ejecuta:
```
mongod
```

#### macOS (Usando Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### 2. Verificar MongoDB está corriendo

```bash
# Intenta conectar con mongo shell
mongosh

# Debe mostrar: mongosh 2.x.x
# Escribe: exit para salir
```

---

## Lanzar la Aplicación

### Opción 1: Script Automático (RECOMENDADO)

#### Windows:
```powershell
cd C:\Users\ander\hitzgurutzatuak
.\scripts/start-local.bat
```

#### Linux/Mac:
```bash
cd ~/hitzgurutzatuak
chmod +x scripts/start-local.sh
./scripts/start-local.sh
```

### Opción 2: Manual (paso a paso)

```bash
cd C:\Users\ander\hitzgurutzatuak

# 1. Instalar dependencias (si no las tiene)
npm install

# 2. Crear usuario maestro
node create-master.js master 1234 master@hitzgurutzatuak.local

# 3. Lanzar la aplicación
npm start
```

---

## Acceder a la Aplicación

Una vez que la app esté corriendo:

📍 **URL**: http://localhost:3000

### Credenciales:
- **Usuario**: `master`
- **Contraseña**: `1234`

---

## Pasos Detallados (Primera Ejecución)

### 1. Instalar MongoDB (Si no lo tienes)

**Windows - CMD:**
```cmd
REM Descarga y instala desde:
REM https://www.mongodb.com/try/download/community

REM Luego abre una nueva ventana CMD y ejecuta:
mongod
```

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

### 2. Verificar Conexión MongoDB

```bash
cd C:\Users\ander\hitzgurutzatuak
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost/CW').then(() => { console.log('MongoDB OK'); mongoose.disconnect(); process.exit(0); }).catch(e => { console.error('Error:', e.message); process.exit(1); })"
```

Debe mostrar: `MongoDB OK`

### 3. Crear Usuario Maestro

```bash
node create-master.js master 1234 master@hitzgurutzatuak.local
```

Debe mostrar:
```
[OK] Konektado a MongoDB

✓ Master erabiltzailea sortu da:
  Username: master
  Email: master@hitzgurutzatuak.local
  Password: 1234
  Master: true
```

### 4. Lanzar la Aplicación

```bash
npm start
```

Debe mostrar:
```
Connected to mongodb
Server running on port: 3000
```

### 5. Acceder a la Aplicación

Abre el navegador:
- 👉 http://localhost:3000
- Login con: `master` / `1234`

---

## Solucionar Problemas

### ❌ Error: "ECONNREFUSED" (MongoDB)

**Problema**: MongoDB no está corriendo

**Solución**:
```bash
# Windows - Nueva ventana CMD:
mongod

# macOS:
brew services restart mongodb-community

# Linux:
sudo systemctl restart mongodb
```

### ❌ Error: "Module not found"

**Problema**: Faltan dependencias

**Solución**:
```bash
npm install
```

### ❌ Error: "Port 3000 already in use"

**Problema**: Otro proceso usa el puerto 3000

**Solución**:
```bash
# Windows - Encontrar y matar el proceso
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### ❌ Error: "Password authentication failed"

**Problema**: Usuario master no existe o contraseña incorrecta

**Solución**:
```bash
# Recrear usuario:
node create-master.js master 1234 master@hitzgurutzatuak.local
```

---

## Verificar Que Todo Funcione

### 1. MongoDB está disponible
```bash
mongosh
# Debe conectar. Escribe: exit
```

### 2. Dependencias Node están instaladas
```bash
npm list mongoose
# Debe mostrar versión instalada
```

### 3. Usuario maestro existe
```bash
node -e "const m = require('mongoose'); const User = require('./models/user'); m.connect('mongodb://localhost/CW').then(() => User.findOne({username: 'master'}).then(u => { console.log(u ? 'Usuario encontrado' : 'No existe'); m.disconnect(); process.exit(0); }));"
```

---

## Variables de Entorno

El archivo `.env` ya está configurado:

```env
DB_CONNECTION=mongodb://localhost/CW
PORT=3000
MY_SECRET=secret
MASTERS=master
EXTERNAL_API_KEY=changeme_external_api_key
```

Estos valores funcionan por defecto en desarrollo local.

---

## Comandos Útiles

```bash
# Iniciar en modo desarrollo (con auto-reload)
npm run dev

# Ver logs de MongoDB
mongod --logpath ./mongodb.log

# Conectar a MongoDB con shell
mongosh

# Resetear base de datos (ADVERTENCIA: Borra todo)
node -e "const m = require('mongoose'); m.connect('mongodb://localhost/CW').then(() => m.connection.dropDatabase().then(() => { console.log('Base de datos eliminada'); process.exit(0); }));"
```

---

## Rutas Importantes

| Ruta | Descripción |
|------|------------|
| http://localhost:3000/ | Inicio |
| http://localhost:3000/users/login | Login |
| http://localhost:3000/users/register | Registro |
| http://localhost:3000/puzzles | Ver puzzles |
| http://localhost:3000/puzzles/upload | Subir puzzle |

---

## Soporte

Si tienes problemas:

1. Verifica que MongoDB está corriendo (`mongod`)
2. Verifica que npm install funcionó
3. Verifica el archivo `.env` está en la raíz
4. Revisa los logs de la aplicación
5. Intenta: `npm run dev` para desarrollo con reload

---

**¡Listo!** 🎉 La aplicación debería estar disponible en http://localhost:3000
