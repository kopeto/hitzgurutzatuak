# 📋 Resumen: Configuración para Lanzar Hitzgurutzatuak en Local

## ✅ Lo Que He Preparado Para Ti

He creado una configuración completa para lanzar la aplicación en local sin Docker. Aquí está lo que he hecho:

### 1. **Script de Creación de Usuario Maestro** (`create-master.js`)
   - Crea automáticamente el usuario maestro
   - Credenciales: `master` / `1234`
   - Se puede ejecutar múltiples veces sin problemas

### 2. **Scripts de Inicio Automático**
   - **`start-local.bat`** (Windows) - Automatiza todo el proceso
   - **`start-local.sh`** (Linux/macOS) - Versión para Unix
   - Verifican MongoDB
   - Instalan dependencias si es necesario
   - Crean usuario maestro
   - Lanzan la app

### 3. **Documentación Completa**
   - **`LOCAL_SETUP_QUICK.md`** - Guía RÁPIDA (5 min)
   - **`GUIA_LOCAL_SETUP.md`** - Guía DETALLADA (completa)
   - **`MONGODB_INSTALL.md`** - Cómo instalar MongoDB

### 4. **Modificaciones al Código**
   - Agregué `create-master.js` para facilitar creación de usuarios
   - Agregué scripts de inicio `.bat` y `.sh`
   - Todo es compatible con el código existente

---

## 🚀 LOS 3 PASOS PARA LANZAR LA APP

### PASO 1: Instalar MongoDB (Solo 1 vez)

**Windows (Opción rápida con Chocolatey):**
```powershell
# PowerShell como Administrador:
choco install mongodb-community
```

**Windows (Descarga manual):**
Descarga desde: https://www.mongodb.com/try/download/community

**macOS:**
```bash
brew install mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
```

Ver detalles en: **MONGODB_INSTALL.md**

---

### PASO 2: Lanzar MongoDB

Abre una terminal y ejecuta:
```bash
mongod
```

**IMPORTANTE**: Mantén esta terminal ABIERTA mientras usas la app

Debe mostrar algo como:
```
{"s":"I","msg":"Listening on","address":"127.0.0.1:27017"}
```

---

### PASO 3: Lanzar la Aplicación

Abre una **NUEVA terminal** en el directorio del proyecto:

**Windows:**
```cmd
cd c:\Users\ander\hitzgurutzatuak
start-local.bat
```

**macOS/Linux:**
```bash
cd ~/hitzgurutzatuak
chmod +x start-local.sh
./start-local.sh
```

**O manual (cualquier SO):**
```bash
cd c:\Users\ander\hitzgurutzatuak
node create-master.js master 1234
npm start
```

---

## 🌐 Acceder a la Aplicación

Una vez la app esté corriendo:

- **URL**: http://localhost:3000
- **Usuario**: `master`
- **Contraseña**: `1234`

---

## 📊 Estructura de Terminales (Durante uso)

```
TERMINAL 1 (MongoDB)          TERMINAL 2 (App)
━━━━━━━━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━━━━━
$ mongod                        $ cd project
✓ Listening on 27017            $ npm start
(mantén abierta)                Connected to mongodb ✓
                                Server running on 3000 ✓
```

Luego abre navegador → http://localhost:3000

---

## ✨ Información Importante

### Base de Datos
- **Sistema**: MongoDB
- **BD**: `CW`
- **Host**: `localhost`
- **Puerto**: `27017`
- **Configurado en**: `.env` (ya está lista)

### Aplicación
- **Framework**: Express.js
- **Puerto**: `3000`
- **Idioma**: Node.js v24.14.0
- **Dependencias**: Todas instaladas en `node_modules/`

### Usuario Maestro
- **Creado por**: `create-master.js`
- **Username**: `master`
- **Password**: `1234`
- **Email**: `master@hitzgurutzatuak.local`
- **Rol**: Master (acceso total)

---

## 🎯 Checklist de Configuración

- [ ] MongoDB instalado (`mongod --version`)
- [ ] MongoDB corriendo en terminal (`mongod`)
- [ ] Navegador abierto en http://localhost:3000
- [ ] Login exitoso con master/1234
- [ ] Puedes ver la página de inicio
- [ ] Puedes ver lista de puzzles (/puzzles)
- [ ] Puedes subir puzzles (.puz o .ipuz)

---

## 🐛 Si Algo Sale Mal

### "Connection refused" (MongoDB)
```bash
# Solución: Instala y lanza MongoDB
mongod
```

### "Port 3000 in use"
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### "Module not found"
```bash
npm install
```

### "User not found"
```bash
node create-master.js master 1234
```

Ver más en: **GUIA_LOCAL_SETUP.md** (sección "Solucionar Problemas")

---

## 📁 Archivos Nuevos Creados

```
proyecto/
├── create-master.js              ← Script crear usuario maestro
├── start-local.bat               ← Script inicio (Windows)
├── start-local.sh                ← Script inicio (Linux/macOS)
├── LOCAL_SETUP_QUICK.md          ← Este archivo (guía rápida)
├── GUIA_LOCAL_SETUP.md           ← Guía detallada completa
├── MONGODB_INSTALL.md            ← Cómo instalar MongoDB
└── ...resto de archivos igual...
```

---

## 🎓 Próximos Pasos (Después de Funcionando)

Una vez la app esté corriendo:

1. **Explorar la interfaz**: /puzzles, /home, etc.
2. **Subir puzzles**: Prueba con archivos `.puz` o `.ipuz`
3. **Jugar**: Haz click en un puzzle y juega
4. **Crear usuarios**: Vía /users/register
5. **Dar permisos master**: 
   ```bash
   npm run user:grant-master <username>
   ```

---

## 💬 Resumen Ejecutivo

**TL;DR** (Too Long; Didn't Read)

1. Instala MongoDB → `choco install mongodb-community`
2. Lanza MongoDB → `mongod`
3. En nueva terminal → `start-local.bat` (o `npm start`)
4. Abre → http://localhost:3000
5. Login → master / 1234

**¡Done!** 🎉

---

## 📞 Ayuda Rápida

| Problema | Comando |
|----------|---------|
| Instalar dependencias | `npm install` |
| Crear usuario maestro | `node create-master.js master 1234` |
| Lanzar en desarrollo | `npm run dev` |
| Ver versión Node | `node --version` |
| Ver versión npm | `npm --version` |
| Ver versión MongoDB | `mongod --version` |

---

## ✅ Estado Actual

- ✓ Código listo para lanzar
- ✓ Dependencias instaladas
- ✓ Scripts de inicio preparados
- ✓ Documentación completa
- ⏳ En espera: MongoDB instalado y corriendo
- ⏳ En espera: Ejecutar `start-local.bat` o `npm start`

---

**¡Listo para lanzar!** Sigue los 3 pasos arriba y tendrás la app corriendo en http://localhost:3000 con el usuario master/1234.
