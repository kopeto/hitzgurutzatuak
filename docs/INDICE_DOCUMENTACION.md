# 📑 ÍNDICE COMPLETO - Setup Local Hitzgurutzatuak

## 🎯 ¿POR DÓNDE EMPIEZO?

### 👉 SI TIENES PRISA (5 MIN)
Lee: **LOCAL_SETUP_QUICK.md**
- 3 pasos simples
- Mínima información
- Directo al grano

### 👉 SI QUIERES INSTRUCCIONES PASO A PASO (10-15 MIN)
Lee: **SETUP_RESUMEN.md**
- Explicación clara
- Con contexto
- Soluciones rápidas incluidas

### 👉 SI NECESITAS DETALLE COMPLETO
Lee: **GUIA_LOCAL_SETUP.md**
- Guía exhaustiva
- Todas las opciones
- Troubleshooting completo

### 👉 SI NECESITAS INSTALAR MONGODB
Lee: **MONGODB_INSTALL.md**
- Cómo instalar en cada SO
- Verificar instalación
- Opciones (local vs. cloud)

### 👉 SI NECESITAS COMANDOS DE REFERENCIA
Lee: **COMANDOS_RAPIDOS.md**
- Copiar y pegar comandos
- Para consulta rápida
- Mientras trabajas

### 👉 SI QUIERES VERIFICAR ANTES DE LANZAR
Lee: **CHECKLIST_PRELANZAMIENTO.md**
- Verificación paso a paso
- Qué debe salir bien
- Qué hacer si algo falla

---

## 📁 ARCHIVOS DE DOCUMENTACIÓN CREADOS

```
c:\Users\ander\hitzgurutzatuak\
├── 📄 LOCAL_SETUP_QUICK.md          👈 COMIENZA AQUÍ
├── 📄 SETUP_RESUMEN.md              👈 O AQUÍ (detallado)
├── 📄 GUIA_LOCAL_SETUP.md           👈 Guía completa
├── 📄 MONGODB_INSTALL.md            👈 Instalar MongoDB
├── 📄 COMANDOS_RAPIDOS.md           👈 Referencia rápida
├── 📄 CHECKLIST_PRELANZAMIENTO.md   👈 Antes de lanzar
├── 📄 INDICE_DOCUMENTACION.md       👈 Este archivo
│
├── 🔧 create-master.js              ← Script crear usuario maestro
├── 🔧 scripts/start-local.bat               ← Script lanzar (Windows)
├── 🔧 scripts/start-local.sh                ← Script lanzar (Linux/Mac)
└── ...resto de proyecto...
```

---

## 🚀 FLUJO RÁPIDO (3 PASOS)

### Paso 1: MongoDB
```bash
# Instalar
choco install mongodb-community

# Lanzar en Terminal 1
mongod
```

### Paso 2: Usuario Maestro
```bash
# En Terminal 2
cd c:\Users\ander\hitzgurutzatuak
node create-master.js master 1234
```

### Paso 3: Aplicación
```bash
# En Terminal 2 (misma)
npm start
```

**Acceso**: http://localhost:3000 → master/1234

---

## 📚 GUÍA DE DOCUMENTOS POR PROPÓSITO

### 🟢 QUIERO LANZAR LA APP AHORA

**Camino más corto:**
1. Leer: **LOCAL_SETUP_QUICK.md** (5 min)
2. Instalar: **MongoDB** (desde MONGODB_INSTALL.md)
3. Ejecutar: Los comandos en SETUP_RESUMEN.md
4. Acceder: http://localhost:3000

### 🟡 TENGO DUDAS Y QUIERO ENTENDER BIEN

1. Leer: **SETUP_RESUMEN.md** (entiende todo)
2. Instalar: **MongoDB** (desde MONGODB_INSTALL.md)
3. Seguir: **CHECKLIST_PRELANZAMIENTO.md** (verifica todo)
4. Usar: **COMANDOS_RAPIDOS.md** (mientras trabajas)

### 🔴 ALGO SALIÓ MAL Y NECESITO AYUDA

1. Ir a: **GUIA_LOCAL_SETUP.md** → sección "Solucionar Problemas"
2. Buscar tu error específico
3. Ejecutar solución recomendada
4. Si persiste: Ver **COMANDOS_RAPIDOS.md** para diagnosticar

### 🟣 QUIERO REFERENCIA RÁPIDA MIENTRAS TRABAJO

Mantener abierto: **COMANDOS_RAPIDOS.md**
- Copiar y pegar comandos
- Consultas rápidas
- Soluciones frecuentes

---

## 📖 RESUMEN DE CADA DOCUMENTO

### 📄 LOCAL_SETUP_QUICK.md
**Para**: Personas con prisa
**Tiempo**: 5 minutos
**Contenido**:
- 3 pasos principales
- Checklist de configuración
- TL;DR (resumen ejecutivo)
**Cuándo usar**: Primera vez si sabes qué haces

### 📄 SETUP_RESUMEN.md
**Para**: Usuarios típicos
**Tiempo**: 10 minutos
**Contenido**:
- Qué he preparado para ti
- Los 3 pasos detallados
- Información importante
- Checklist de configuración
- Próximos pasos
**Cuándo usar**: Recomendado para la mayoría

### 📄 GUIA_LOCAL_SETUP.md
**Para**: Máximo detalle
**Tiempo**: 20-30 minutos (si lo lees todo)
**Contenido**:
- Prerrequisitos detallados
- Múltiples opciones de instalación
- Instrucciones paso a paso
- Solucionar problemas (completo)
- Comandos útiles
- Variables de entorno
**Cuándo usar**: Cuando necesitas entender TODO

### 📄 MONGODB_INSTALL.md
**Para**: Instalar MongoDB
**Tiempo**: 10-15 minutos
**Contenido**:
- Instalación por SO (Windows, Mac, Linux)
- 3 opciones diferentes
- Verificación de instalación
- Alternativa cloud (MongoDB Atlas)
**Cuándo usar**: Cuando MongoDB no está instalado

### 📄 COMANDOS_RAPIDOS.md
**Para**: Referencia durante trabajo
**Tiempo**: Consulta rápida (1-2 min)
**Contenido**:
- Comandos copy-paste
- Lanzar aplicación
- Gestión MongoDB
- Crear/resetear usuarios
- Troubleshooting rápido
- URLs internas
**Cuándo usar**: Mientras estás trabajando, necesitas copiar un comando

### 📄 CHECKLIST_PRELANZAMIENTO.md
**Para**: Verificación pre-launch
**Tiempo**: 10 minutos
**Contenido**:
- 8 secciones de verificación
- Qué verificar en cada paso
- Soluciones si algo falla
- Estado de cada componente
**Cuándo usar**: Antes de lanzar por primera vez

### 📄 INDICE_DOCUMENTACION.md
**Para**: Orientarse en la documentación
**Tiempo**: Lectura actual
**Contenido**:
- Mapa de documentación
- Cómo elegir qué leer
- Resumen de cada documento
**Cuándo usar**: Ahora, para saber por dónde empezar

---

## 🎯 MATRIZ DE DECISIÓN

### ¿Cuál documento leer?

```
¿Tienes prisa?
├─ SÍ (5 min) → LOCAL_SETUP_QUICK.md
└─ NO (10+ min)
   ├─ ¿Quieres entender bien? → SETUP_RESUMEN.md
   ├─ ¿Quieres TODO? → GUIA_LOCAL_SETUP.md
   ├─ ¿Necesitas instalar MongoDB? → MONGODB_INSTALL.md
   ├─ ¿Necesitas un comando? → COMANDOS_RAPIDOS.md
   └─ ¿Quieres verificar todo? → CHECKLIST_PRELANZAMIENTO.md
```

---

## 🔧 SCRIPTS DISPONIBLES

### create-master.js
**Propósito**: Crear usuario maestro
**Uso**:
```bash
node create-master.js [username] [password] [email]
# Ejemplo:
node create-master.js master 1234 master@hitzgurutzatuak.local
```
**Ubicación**: Raíz del proyecto

### scripts/start-local.bat (Windows)
**Propósito**: Lanzar la app automáticamente
**Uso**:
```cmd
scripts/start-local.bat
```
**Qué hace**:
- Verifica Node.js
- Verifica MongoDB
- Instala dependencias si falta
- Crea usuario maestro
- Lanza npm start

### scripts/start-local.sh (Linux/macOS)
**Propósito**: Lanzar la app automáticamente
**Uso**:
```bash
chmod +x scripts/start-local.sh
./scripts/start-local.sh
```
**Qué hace**: Lo mismo que .bat

---

## 📋 TODO CREADO EN ESTA SESIÓN

✅ **Scripts Creados**:
- create-master.js (crear usuario maestro)
- scripts/start-local.bat (lanzar app automático - Windows)
- scripts/start-local.sh (lanzar app automático - Linux/Mac)

✅ **Documentación Creada**:
- LOCAL_SETUP_QUICK.md (guía rápida)
- SETUP_RESUMEN.md (resumen ejecutivo)
- GUIA_LOCAL_SETUP.md (guía completa)
- MONGODB_INSTALL.md (instalar MongoDB)
- COMANDOS_RAPIDOS.md (referencia rápida)
- CHECKLIST_PRELANZAMIENTO.md (verificaciones)
- INDICE_DOCUMENTACION.md (este archivo)

✅ **Características Implementadas**:
- Sistema de usuarios con roles maestro
- Autenticación con bcryptjs
- Soporte para formats .puz e .ipuz
- Scripts automatizados para lanzar

---

## 🎓 CAMINOS DE APRENDIZAJE

### Camino 1: "Solo quiero que funcione"
1. LOCAL_SETUP_QUICK.md
2. MONGODB_INSTALL.md
3. Ejecutar comandos
4. Abrir navegador

### Camino 2: "Quiero entender qué pasa"
1. SETUP_RESUMEN.md
2. MONGODB_INSTALL.md
3. CHECKLIST_PRELANZAMIENTO.md
4. Ejecutar paso a paso

### Camino 3: "Quiero ser experto"
1. GUIA_LOCAL_SETUP.md
2. MONGODB_INSTALL.md
3. COMANDOS_RAPIDOS.md
4. CHECKLIST_PRELANZAMIENTO.md
5. Experiencia práctica

### Camino 4: "Necesito referencia mientras trabajo"
- Siempre abierto: COMANDOS_RAPIDOS.md
- Consultar según necesidad

---

## ✨ NOTAS IMPORTANTES

- **MongoDB es CRÍTICO**: Debe estar corriendo siempre
- **Los scripts automatizan el arranque local**: `scripts/start-local.bat` y `scripts/start-local.sh` preparan las dependencias, comprueban MongoDB y lanzan la app sin Docker
- **Primera vez es la más lenta**: Descarga dependencias
- **Puedes parar la app**: MongoDB sigue corriendo
- **Documentación es redundante**: Es intencional (copiar/pegar comandos)

---

## 🚀 PRÓXIMOS PASOS (ORDEN)

1. **Elige tu documento** según el cuadro arriba
2. **Instala MongoDB** (si no lo tienes)
3. **Ejecuta los comandos** del documento elegido
4. **Abre navegador**: http://localhost:3000
5. **Login**: master / 1234
6. **¡Disfruta!** 🎉

---

## 📞 REFERENCIA RÁPIDA

| Necesito | Documento |
|----------|-----------|
| Empezar rápido | LOCAL_SETUP_QUICK.md |
| Instrucciones claras | SETUP_RESUMEN.md |
| Detalle completo | GUIA_LOCAL_SETUP.md |
| Instalar MongoDB | MONGODB_INSTALL.md |
| Comando específico | COMANDOS_RAPIDOS.md |
| Verificar todo | CHECKLIST_PRELANZAMIENTO.md |
| Mapa de docs | INDICE_DOCUMENTACION.md |

---

**¡Elige un documento y comienza!** 🚀

La mayoría de usuarios deberían empezar con: **SETUP_RESUMEN.md**
