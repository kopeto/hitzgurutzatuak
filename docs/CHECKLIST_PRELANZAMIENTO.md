# ✅ CHECKLIST PRE-LANZAMIENTO

## Antes de Lanzar la Aplicación

### 1️⃣ VERIFICAR REQUISITOS DEL SISTEMA

- [ ] **Node.js instalado**
  ```bash
  node --version
  # Debe mostrar: v24.14.0 o similar
  ```

- [ ] **npm instalado**
  ```bash
  npm --version
  # Debe mostrar: 11.9.0 o similar
  ```

- [ ] **Git instalado** (opcional pero recomendado)
  ```bash
  git --version
  ```

---

### 2️⃣ INSTALAR MONGODB

- [ ] **MongoDB descargado**
  - [ ] Descargado desde: https://www.mongodb.com/try/download/community
  - O
  - [ ] Instalado con: `choco install mongodb-community`

- [ ] **MongoDB instalado**
  ```bash
  mongod --version
  # Debe mostrar: version 7.x o similar
  ```

- [ ] **MongoDB corriendo**
  ```bash
  mongod
  # Abre terminal APARTE y deja abierta
  ```

---

### 3️⃣ VERIFICAR DIRECTORIO DEL PROYECTO

- [ ] **Ubicación correcta**
  ```bash
  cd c:\Users\ander\hitzgurutzatuak
  ```

- [ ] **Archivos esenciales presentes**
  - [ ] `package.json`
  - [ ] `app.js`
  - [ ] `.env`
  - [ ] `node_modules/` (carpeta)

- [ ] **Dependencias instaladas**
  ```bash
  npm list mongoose
  # Debe mostrar versión (8.0.0 o similar)
  ```

---

### 4️⃣ VERIFICAR PUERTO DISPONIBLE

- [ ] **Puerto 3000 libre**
  ```bash
  # Windows:
  netstat -ano | findstr :3000
  # Debe estar VACÍO
  
  # macOS/Linux:
  lsof -i :3000
  # Debe estar VACÍO
  ```

- [ ] **Si puerto ocupado**
  ```bash
  # Matando proceso en Windows:
  taskkill /PID <PID> /F
  
  # Matando proceso en macOS/Linux:
  kill -9 <PID>
  ```

---

### 5️⃣ CREAR USUARIO MAESTRO

- [ ] **En terminal (en el directorio del proyecto)**
  ```bash
  node create-master.js master 1234
  # Debe mostrar: "✓ Master erabiltzailea sortu da"
  ```

- [ ] **Verificar que se creó**
  - En navegador: http://localhost:3000/users/login
  - Luego de lanzar la app (paso siguiente)
  - Intenta login: master / 1234

---

### 6️⃣ LANZAR LA APLICACIÓN

- [ ] **Abrir nueva terminal**
  - (MongoDB sigue corriendo en otra terminal)

- [ ] **Navegar al directorio**
  ```bash
  cd c:\Users\ander\hitzgurutzatuak
  ```

- [ ] **Lanzar app**
  ```bash
  npm start
  # O:
  scripts/start-local.bat
  ```

- [ ] **Verificar inicio correcto**
  Debe mostrar algo como:
  ```
  Connected to mongodb
  Server running on port: 3000
  ```

---

### 7️⃣ VERIFICAR ACCESO

- [ ] **Abrir navegador**
  ```
  http://localhost:3000
  ```

- [ ] **Ver página de inicio**
  - [ ] Debe cargar sin errores
  - [ ] Debe ver botones: Home, Login, Puzzles, etc.

- [ ] **Ir a Login**
  ```
  http://localhost:3000/users/login
  ```

- [ ] **Intentar login**
  - Usuario: `master`
  - Contraseña: `1234`
  - Debe permitir acceso

- [ ] **Acceso a panel maestro**
  ```
  http://localhost:3000/master
  ```
  - Debe estar disponible solo para usuario master

- [ ] **Ir a Puzzles**
  ```
  http://localhost:3000/puzzles
  ```
  - Debe listar puzzles disponibles

---

### 8️⃣ VERIFICAR FUNCIONALIDADES BÁSICAS

- [ ] **Upload de Puzzles**
  - Ir a: http://localhost:3000/puzzles/upload
  - Subir archivo `.puz` o `.ipuz`
  - Debe aceptar y crear puzzle

- [ ] **Jugar Puzzle**
  - Hacer click en puzzle
  - Debe abrir el juego
  - Debe ser interactivo

- [ ] **Cerrar sesión**
  - Hacer logout
  - Debe volver a login

---

## 🎯 RESUMEN DE ESTADO

| Componente | Estado | Acción |
|-----------|--------|--------|
| Node.js | ✅ Instalado | Verificado |
| npm | ✅ Instalado | Verificado |
| MongoDB | ⏳ Pendiente | Instalar y lanzar |
| Dependencias | ✅ Instaladas | En node_modules |
| Scripts | ✅ Listos | create-master.js, scripts/start-local.bat |
| Código | ✅ Listo | Sin cambios pendientes |
| Puerto 3000 | ⏳ Por verificar | Antes de lanzar |
| Aplicación | ⏳ Pendiente | Lanzar npm start |

---

## 🚀 ORDEN CORRECTO DE EJECUCIÓN

```
1. Instalar MongoDB (si no está)
2. Lanzar mongod en Terminal 1
3. Ir a proyecto en Terminal 2
4. Ejecutar: node create-master.js master 1234
5. Ejecutar: npm start
6. Abrir navegador: http://localhost:3000
7. Login: master / 1234
```

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### MongoDB no conecta
```bash
# Verificar MongoDB corriendo:
mongod

# En otra terminal, verificar conexión:
mongosh
```

### Puerto 3000 ocupado
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <numero> /F

# macOS/Linux:
lsof -i :3000
kill -9 <numero>
```

### Usuario master no funciona
```bash
# Recrear usuario:
node create-master.js master 1234
```

### Dependencias faltando
```bash
npm install
npm start
```

### Errores en consola
- Ver archivo de error completo
- Verificar `.env` está correcto
- Verificar MongoDB está corriendo

---

## 📞 CONTACTOS DE REFERENCIA

- **Documentación completa**: Ver `GUIA_LOCAL_SETUP.md`
- **Instalación MongoDB**: Ver `MONGODB_INSTALL.md`
- **Comandos rápidos**: Ver `COMANDOS_RAPIDOS.md`
- **Resumen setup**: Ver `SETUP_RESUMEN.md`

---

## ✨ NOTAS IMPORTANTES

- **MongoDB debe estar SIEMPRE corriendo** en una terminal aparte
- **Mantén MongoDB abierto** mientras usas la aplicación
- **Puedes lanzar/parar la app**, pero MongoDB debe seguir corriendo
- **Primera vez es la más lenta** (descarga dependencias, crea DB)
- **Verificar logs** en consola para diagnosticar problemas

---

## 🎉 ¡LISTO!

Una vez completado este checklist, tendrás:

✅ Aplicación corriendo en http://localhost:3000
✅ Usuario maestro funcional (master/1234)
✅ Base de datos MongoDB conectada
✅ Sistema listo para desarrollo

---

**Próximo paso**: Sigue este checklist en orden y la app estará corriendo en 10 minutos.
