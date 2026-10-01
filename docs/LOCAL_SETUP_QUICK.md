# 🚀 Lanzar Hitzgurutzatuak en Local - GUÍA RÁPIDA

## ⚠️ PASO 1: Requisito

Instala Node.js y MongoDB localmente, y asegúrate de que MongoDB esté corriendo en `127.0.0.1:27017`. Los scripts no usan Docker y siempre conectan a la base local `HG_develop`, separada de la base de producción. Consulta `MONGODB_INSTALL.md` si necesitas instalar MongoDB.

## 🎯 PASO 2: Lanzar la Aplicación

Desde la raíz del proyecto, ejecuta el script correspondiente:

### Windows - Script Automático:
```cmd
scripts/start-local.bat
```

### Windows - Lanzamiento nativo (requiere Node.js y MongoDB locales):
```cmd
npm start
```

### macOS/Linux - Script:
```bash
./scripts/start-local.sh
```

### macOS/Linux - Lanzamiento nativo (requiere Node.js y MongoDB locales):
```bash
npm start
```

---

## 🔐 PASO 3: Acceder a la Aplicación

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
2. **`scripts/start-local.bat`** - Script de inicio automático (Windows)
3. **`scripts/start-local.sh`** - Script de inicio automático (Linux/macOS)
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
