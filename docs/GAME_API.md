# 🎮 API de Juego Segura - Documentación

## 📋 Descripción General

Sistema de API REST para gestionar crucigramas de forma segura, **sin exponer las soluciones al cliente**.

### 🔐 Principios de Seguridad

1. **Servidor autoritario**: Todas las respuestas se validan en el backend
2. **Sin soluciones en cliente**: El `filled_grid` NUNCA se envía al navegador
3. **Sesiones por usuario**: Cada juego se almacena en `req.session`
4. **Verificación bajo demanda**: Solo se revela información cuando el usuario la solicita

---

## 🛡️ Arquitectura

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Cliente   │ ◄─────► │  API Routes  │ ◄─────► │   MongoDB    │
│ (Browser)   │  AJAX   │  (Backend)   │  Query  │  (Puzzles)   │
└─────────────┘         └──────────────┘         └──────────────┘
      │                        │
      │                        ▼
      │                 ┌──────────────┐
      └────────────────►│   Session    │
                        │   Storage    │
                        └──────────────┘
```

**Flujo de datos:**
1. Cliente solicita iniciar juego
2. Backend carga puzzle de MongoDB
3. Backend guarda solución en sesión
4. Cliente recibe SOLO: `void_grid`, `clues`, posiciones
5. Cliente envía intentos al backend
6. Backend valida contra solución en sesión
7. Backend responde: ✓/✗ (sin revelar respuesta)

---

## 📡 Endpoints

### Base URL
```
/api/game
```

---

### 1. **POST** `/start/:id`

Inicia una nueva sesión de juego.

**Parámetros:**
- `id` (URL param): ID del puzzle en MongoDB

**Respuesta:**
```json
{
  "success": true,
  "game": {
    "id": "698f64d2b5ccb935c826a6dd",
    "name": "Martxoak 23 12x12",
    "author": "Joxan Elosegi",
    "width": 12,
    "height": 12,
    "void_grid": [
      [".", ".", "-", "-", ...],
      ...
    ],
    "words": [
      {
        "dir": "right",
        "x": 0,
        "y": 2,
        "length": 5
        // NO incluye "word": "ETXEA"
      },
      ...
    ],
    "clues": [
      "1. Casa en euskera",
      "2. Palabra vasca...",
      ...
    ]
  }
}
```

**Almacena en sesión:**
```javascript
req.session.currentGame = {
  puzzleId: "...",
  startedAt: Date,
  userGrid: [['-', '-', ...], ...],
  checkCount: 0,
  hintCount: 0
}
```

---

### 2. **POST** `/check-cell`

Verifica si una celda individual es correcta.

**Body:**
```json
{
  "row": 0,
  "col": 2,
  "value": "E"
}
```

**Respuesta:**
```json
{
  "success": true,
  "correct": true  // o false
}
```

**Notas:**
- NO devuelve la respuesta correcta si es falso
- Incrementa `checkCount` en sesión
- Si es correcta, actualiza `userGrid` en sesión

---

### 3. **POST** `/check-word`

Verifica si una palabra completa es correcta.

**Body:**
```json
{
  "wordIndex": 0
}
```

**Respuesta:**
```json
{
  "success": true,
  "correct": false
}
```

**Notas:**
- Compara letra por letra con el `filled_grid`
- NO revela qué letras están mal
- Incrementa `checkCount`

---

### 4. **POST** `/solve-cell`

Revela la respuesta de una celda (pista).

**Body:**
```json
{
  "row": 0,
  "col": 2
}
```

**Respuesta:**
```json
{
  "success": true,
  "value": "E"
}
```

**Notas:**
- Esta es la ÚNICA forma de obtener la respuesta del servidor
- Incrementa `hintCount`
- Actualiza `userGrid` automáticamente

---

### 5. **POST** `/check-grid`

Verifica el estado completo del crucigrama.

**Body:** (ninguno)

**Respuesta:**
```json
{
  "success": true,
  "complete": false,
  "progress": 45,
  "correctCells": 27,
  "totalCells": 60,
  "hasErrors": true,
  "errorCount": 5
}
```

**Notas:**
- NO devuelve posiciones de errores
- Útil para mostrar progreso al usuario
- Detecta cuando el juego está completo

---

### 6. **POST** `/solve-word`

Revela la solución completa de una palabra (hint fuerte).

**Body:**
```json
{
  "wordIndex": 0
}
```

**Respuesta:**
```json
{
  "success": true,
  "solvedLetters": [
    { "row": 0, "col": 2, "value": "E" },
    { "row": 0, "col": 3, "value": "T" },
    { "row": 0, "col": 4, "value": "X" },
    { "row": 0, "col": 5, "value": "E" },
    { "row": 0, "col": 6, "value": "A" }
  ]
}
```

**Notas:**
- Revela todas las letras de la palabra seleccionada
- Incrementa `hintCount` por cada letra revelada
- Actualiza `userGrid` automáticamente
- Útil cuando el usuario se rinde con una palabra específica

---

### 7. **POST** `/solve-grid`

Revela la solución completa del crucigrama (rendirse).

**Body:** (ninguno)

**Respuesta:**
```json
{
  "success": true,
  "message": "Puzzle resuelto completamente",
  "solvedLetters": [
    { "row": 0, "col": 2, "value": "E" },
    { "row": 0, "col": 3, "value": "T" },
    ...
  ]
}
```

**Notas:**
- Revela TODAS las celdas del crucigrama
- Incrementa `hintCount` por todas las celdas
- Actualiza `userGrid` con la solución completa
- Marca el juego como completado con ayuda total

---

### 8. **GET** `/status`

Obtiene el estado actual del juego.

**Respuesta:**
```json
{
  "success": true,
  "game": {
    "puzzleId": "698f64d2b5ccb935c826a6dd",
    "startedAt": "2026-02-13T21:00:00.000Z",
    "checkCount": 12,
    "hintCount": 3,
    "userGrid": [['-', 'E', ...], ...]
  }
}
```

**Uso:**
- Auto-guardar progreso
- Restaurar sesión
- Mostrar estadísticas

---

### 9. **POST** `/end`

Finaliza la sesión de juego.

**Respuesta:**
```json
{
  "success": true,
  "message": "Juego finalizado",
  "stats": {
    "duration": 1234567,  // milisegundos
    "checks": 12,
    "hints": 3
  }
}
```

**Notas:**
- Limpia `req.session.currentGame`
- Retorna estadísticas finales

---

## 🔒 Seguridad Implementada

### ✅ Prevención de Trampas

1. **Sin soluciones en HTML:**
   - Eliminado `<div#hidden_grid>`
   - `filled_grid` NUNCA se envía al cliente

2. **Validación server-side:**
   - Todas las verificaciones se hacen en el backend
   - Cliente no puede modificar respuestas

3. **Sesiones seguras:**
   - Cada usuario tiene su propio estado
   - No se puede acceder a sesiones de otros usuarios

4. **Rate limiting:**
   - Protección contra spam de verificaciones
   - Implementado en `app.js`

### ⚠️ Consideraciones Adicionales

**Ataques potenciales mitigados:**
- ✅ **Inspect Element**: No hay soluciones en DOM
- ✅ **Network tampering**: Validación server-side
- ✅ **Session hijacking**: Cookies httpOnly
- ✅ **Brute force**: Rate limiting activo

**Posibles mejoras futuras:**
- [ ] CSRF tokens en endpoints de juego
- [ ] Rate limit por usuario (no solo por IP)
- [ ] Penalización por muchos errores
- [ ] Timeout de sesión de juego
- [ ] Guardar progreso en MongoDB para persistencia

---

## 💻 Uso desde el Cliente

### JavaScript (con fetch)

```javascript
// Verificar celda
const result = await fetch('/api/game/check-cell', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ row: 0, col: 2, value: 'E' })
});
const data = await result.json();

if (data.correct) {
  console.log('¡Correcto!');
} else {
  console.log('Incorrecto');
}
```

### jQuery (alternativa)

```javascript
$.post('/api/game/check-cell', {
  row: 0,
  col: 2,
  value: 'E'
}, function(data) {
  if (data.correct) {
    alert('¡Correcto!');
  }
});
```

---

## 📊 Flujo Completo de Juego

1. **Usuario abre `/puzzles/game/:id`**
   - Backend crea sesión de juego
   - Envía `void_grid` y clues
   - Cliente renderiza grid vacío

2. **Usuario llena celdas**
   - Input local en el navegador
   - Sin validación automática

3. **Usuario clickea "Verificar celda"**
   - Cliente envía `POST /api/game/check-cell`
   - Backend compara con solución
   - Responde ✓/✗
   - Cliente muestra feedback visual

4. **Usuario completa el crucigrama**
   - Cliente envía `POST /api/game/check-grid`
   - Backend detecta 100% completo
   - Muestra modal de victoria

5. **Usuario sale del juego**
   - `POST /api/game/end`
   - Limpia sesión
   - Muestra estadísticas

---

## 🧪 Testing

### Test manual con curl

```bash
# 1. Iniciar juego (requiere sesión activa en navegador)
curl -X POST http://localhost:3000/api/game/start/698f64d2b5ccb935c826a6dd \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"

# 2. Verificar celda
curl -X POST http://localhost:3000/api/game/check-cell \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{"row":0,"col":2,"value":"E"}'

# 3. Obtener estado
curl http://localhost:3000/api/game/status \
  -H "Cookie: connect.sid=..."
```

### Test automatizado (Jest)

```javascript
describe('Game API', () => {
  test('check-cell returns correct result', async () => {
    const response = await request(app)
      .post('/api/game/check-cell')
      .send({ row: 0, col: 2, value: 'E' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('correct');
  });
});
```

---

## 📈 Métricas y Logging

El sistema registra automáticamente:
- ✅ Inicio de juegos (con usuario y puzzle)
- ✅ Verificaciones realizadas
- ✅ Pistas solicitadas
- ✅ Finalización de juegos

**Ejemplo de log:**
```
[2026-02-13_22:00:15] - User ander started game: Martxoak 23 12x12
[2026-02-13_22:05:30] - User ander completed game (checks: 12, hints: 3)
```

---

## 🎯 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Solución en cliente** | ✗ Sí (en `#hidden_grid`) | ✅ No |
| **Validación** | ✗ JavaScript local | ✅ Backend |
| **Trampas posibles** | ✗ Muy fáciles | ✅ Difíciles |
| **Sesiones de juego** | ✗ No | ✅ Sí |
| **Estadísticas** | ✗ No | ✅ Sí |
| **Seguridad** | ✗ Baja | ✅ Alta |

---

## 📚 Referencias

- [Express Session Docs](https://expressjs.com/en/resources/middleware/session.html)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [REST API Best Practices](https://restfulapi.net/)

---

**Actualizado:** 13 Febrero 2026  
**Versión:** 1.0.0
