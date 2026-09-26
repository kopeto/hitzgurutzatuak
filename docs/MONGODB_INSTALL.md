# MongoDB - Guía de Instalación

## ⚡ Opción 1: Instalación Rápida (RECOMENDADO)

### Windows - Con Chocolatey

```powershell
# 1. Abre PowerShell como Administrador

# 2. Instala Chocolatey (si no lo tienes):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
iex "$(irm https://community.chocolatey.org/install.ps1)"

# 3. Instala MongoDB:
choco install mongodb-community

# 4. Inicia MongoDB:
mongod
```

### Windows - Sin Chocolatey (Instalador MSI)

```
1. Descarga: https://www.mongodb.com/try/download/community
2. Descarga la versión "Windows Server 2016 and later (64-bit msi)"
3. Ejecuta el instalador
4. Sigue los pasos (default está bien)
5. En PowerShell: mongod
```

### macOS

```bash
# Con Homebrew:
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ver si está corriendo:
brew services list
```

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

---

## ✔️ Verificar Instalación

Abre una terminal nueva y ejecuta:

```bash
mongod
```

Debes ver algo como:
```
{"t":{"$date":"2026-09-26T..."},"s":"I",  "c":"CONTROL",  "id":23285,   "ctx":"main","msg":"Listening on","attr":{"address":"127.0.0.1:27017"}}
```

**IMPORTANTE**: Mantén esta terminal abierta mientras usas la aplicación.

---

## 🌐 Opción 2: MongoDB Atlas (Cloud - Sin Instalación Local)

Si prefieres no instalar MongoDB localmente, puedes usar MongoDB Atlas:

### Pasos:

1. Regístrate en: https://www.mongodb.com/cloud/atlas
2. Crea un clúster gratis (M0)
3. Obtén la cadena de conexión (connection string)
4. Edita `.env` en el proyecto:

```env
DB_CONNECTION=mongodb+srv://usuario:contraseña@cluster.mongodb.net/CW
PORT=3000
MY_SECRET=secret
MASTERS=master
```

5. Luego ejecuta:
```bash
npm start
```

**Ventaja**: No requiere instalar nada localmente
**Desventaja**: Requiere conexión a internet

---

## 📋 Una Vez MongoDB esté Corriendo

```bash
# En terminal NUEVA (NO la de mongod):
cd C:\Users\ander\hitzgurutzatuak

# 1. Crear usuario maestro:
node create-master.js master 1234 master@hitzgurutzatuak.local

# 2. Lanzar aplicación:
npm start

# 3. Acceder:
# http://localhost:3000
# Usuario: master
# Contraseña: 1234
```

---

## ✅ Checklist

- [ ] MongoDB instalado (`mongod --version`)
- [ ] MongoDB corriendo en terminal (`mongod`)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Usuario maestro creado (`node create-master.js master 1234`)
- [ ] Aplicación corriendo (`npm start`)
- [ ] Acceso a http://localhost:3000
- [ ] Login con master/1234

---

**Una vez MongoDB esté corriendo, ejecuta desde otra terminal:**

```bash
cd c:\Users\ander\hitzgurutzatuak
.\start-local.bat
```

O manualmente:
```bash
npm start
```
