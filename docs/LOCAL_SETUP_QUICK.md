# 🚀 Lanzar Hitzgurutzatuak en Local - GUÍA RÁPIDA

## ⚠️ PASO 1: Instalar MongoDB (REQUERIDO)

MongoDB es la base de datos necesaria. Elige una opción:

### Opción A: Instalación Rápida (Windows + Chocolatey)
```powershell
# En PowerShell como Administrador:
choco install mongodb-community
```

### Opción B: Descarga e Instala Manualmente
Descarga desde: https://www.mongodb.com/try/download/community

### Opción C: macOS con Homebrew
```bash
brew install mongodb-community
brew services start mongodb-community
```

Ver detalles en: **MONGODB_INSTALL.md**

---

## ✅ PASO 2: Verificar MongoDB está Corriendo

```bash
mongod
```

**Importante**: Mantén esta terminal ABIERTA

---

## 🎯 PASO 3: Lanzar la Aplicación

Abre una **NUEVA terminal** en el directorio del proyecto:

### Windows - Script Automático:
```cmd
start-local.bat
```

### Windows - Manual:
```cmd
npm start
```

### macOS/Linux - Script:
```bash
./start-local.sh
```

### macOS/Linux - Manual:
```bash
npm start
```

---

## 🔐 PASO 4: Acceder a la Aplicación

Abre tu navegador:
- 🌐 **URL**: http://localhost:3000
- 👤 **Usuario**: `master`
- 🔑 **Contraseña**: `1234`

---

## 📋 Flujo Completo (Primavez)

### Terminal 1: MongoDB
```bash
mongod
# Mantén abierta
```

### Terminal 2: Aplicación
```bash
cd c:\Users\ander\hitzgurutzatuak
node create-master.js master 1234
npm start
```

### Terminal 3: Navegador
```
http://localhost:3000
```

---

## 🐛 Problemas Comunes

### "Cannot connect to MongoDB"
→ Instala MongoDB y ejecuta `mongod` en terminal aparte

### "Port 3000 in use"
→ Cierra otros procesos en puerto 3000
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### "Module not found"
→ Instala dependencias:
```bash
npm install
```

---

## 📚 Archivos Nuevos Creados

1. **`create-master.js`** - Script para crear usuario maestro
2. **`start-local.bat`** - Script de inicio automático (Windows)
3. **`start-local.sh`** - Script de inicio automático (Linux/macOS)
4. **`GUIA_LOCAL_SETUP.md`** - Guía detallada
5. **`MONGODB_INSTALL.md`** - Guía instalación MongoDB
6. **`LOCAL_SETUP_QUICK.md`** - Este archivo

---

## 🎉 ¡Listo!

Una vez completados los pasos:

```
http://localhost:3000
master / 1234
```

---

## ℹ️ Más Información

- Guía detallada: Ver **GUIA_LOCAL_SETUP.md**
- Instalar MongoDB: Ver **MONGODB_INSTALL.md**
- Solucionar problemas: Ver **GUIA_LOCAL_SETUP.md** (Solucionar Problemas)

---

## 💡 Notas

- La aplicación usa Mongoose para MongoDB
- Todas las dependencias están en `package.json`
- Configuración en `.env` (ya está lista)
- Puedes ver logs en consola mientras corre

**¡IMPORTANTE**: MongoDB debe estar corriendo SIEMPRE en una terminal aparte
