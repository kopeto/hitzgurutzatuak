# 🚀 Guía de Uso - API de Juego Segura

## 📖 Para Desarrolladores

Esta guía explica cómo usar la nueva API de juego desde el frontend.

---

## 🎮 Inicialización

La página de juego (`/puzzles/game/:id`) automáticamente inicializa el juego cuando se carga:

```javascript
// Esto ocurre en el backend (routes/puzzles.js)
// El usuario NO necesita hacer esto manualmente
app.get('/game/:id', async (req, res) => {
  // Se crea automáticamente req.session.currentGame
  // Se envía solo void_grid al cliente
});
```

---

## 🔌 Uso de la API desde el Cliente

### Importar el módulo

```html
<!-- En game.pug -->
script(src='/scripts/game_api.js')
```

### Objeto GameAPI disponible globalmente

El archivo `game_api.js` expone dos objetos globales:

1. **`GameAPI`** - Para comunicación con el backend
2. **`GameUI`** - Para feedback visual

---

## 📡 Métodos del GameAPI

### 1. Verificar una celda

```javascript
const result = await GameAPI.checkCell(row, col, value);

// Ejemplo:
const result = await GameAPI.checkCell(0, 2, 'E');

if (result.correct) {
  GameUI.markCorrect(0, 2);
  console.log('¡Correcto!');
} else {
  GameUI.markIncorrect(0, 2);
  console.log('Incorrecto');
}
```

**Parámetros:**
- `row` (number): Fila de la celda (0-indexed)
- `col` (number): Columna de la celda (0-indexed)
- `value` (string): Letra introducida por el usuario

**Retorna:**
```javascript
{
  success: true,
  correct: true  // o false
}
```

---

### 2. Verificar una palabra completa

```javascript
const result = await GameAPI.checkWord(wordIndex);

// Ejemplo:
const result = await GameAPI.checkWord(0);  // Primera palabra

if (result.correct) {
  console.log('¡Palabra correcta!');
} else {
  console.log('Palabra incorrecta');
}
```

**Parámetros:**
- `wordIndex` (number): Índice de la palabra en el array `puz.words`

**Retorna:**
```javascript
{
  success: true,
  correct: false
}
```

**IMPORTANTE:** NO revela qué letras están mal, solo si la palabra completa es correcta.

---

### 3. Pedir pista de una celda

```javascript
const result = await GameAPI.solveCell(row, col);

// Ejemplo:
const result = await GameAPI.solveCell(0, 2);

console.log(`La respuesta es: ${result.value}`);
// Actualizar input en el DOM
document.querySelector(`[data-row="0"][data-col="2"]`).value = result.value;
```

**Parámetros:**
- `row` (number): Fila de la celda
- `col` (number): Columna de la celda

**Retorna:**
```javascript
{
  success: true,
  value: "E"  // La letra correcta
}
```

**Nota:** Esta es la ÚNICA forma de obtener la respuesta correcta del servidor.

---

### 4. Pedir pista de una palabra completa

```javascript
const result = await GameAPI.solveWord(wordIndex);

// Ejemplo:
const result = await GameAPI.solveWord(0);

result.solvedLetters.forEach(({ row, col, value }) => {
  const input = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  input.value = value;
  GameUI.markCorrect(row, col);
});
```

**Parámetros:**
- `wordIndex` (number): Índice de la palabra

**Retorna:**
```javascript
{
  success: true,
  solvedLetters: [
    { row: 0, col: 2, value: "E" },
    { row: 0, col: 3, value: "T" },
    { row: 0, col: 4, value: "X" },
    // ...
  ]
}
```

---

### 5. Verificar el progreso del grid

```javascript
const result = await GameAPI.checkGrid();

// Ejemplo:
const result = await GameAPI.checkGrid();

GameUI.showProgress(result);

if (result.complete) {
  GameUI.showVictory({
    checks: result.checkCount,
    hints: result.hintCount
  });
}
```

**Retorna:**
```javascript
{
  success: true,
  complete: false,
  progress: 45,          // Porcentaje 0-100
  correctCells: 27,
  totalCells: 60,
  hasErrors: true,
  errorCount: 5
}
```

**IMPORTANTE:** NO devuelve las posiciones de los errores (para evitar facilitar trampas).

---

### 6. Revelar solución completa (rendirse)

```javascript
const result = await GameAPI.solveGrid();

// Ejemplo:
result.solvedLetters.forEach(({ row, col, value }) => {
  const input = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  input.value = value;
});

GameUI.showNotification('Puzzle resuelto completamente', 'info');
```

**Retorna:**
```javascript
{
  success: true,
  message: "Puzzle resuelto completamente",
  solvedLetters: [
    { row: 0, col: 0, value: "K" },
    { row: 0, col: 1, value: "A" },
    // ... todas las celdas
  ]
}
```

---

### 7. Obtener estado del juego

```javascript
const status = await GameAPI.getStatus();

console.log('Verificaciones:', status.game.checkCount);
console.log('Pistas:', status.game.hintCount);
console.log('Grid actual:', status.game.userGrid);
```

**Retorna:**
```javascript
{
  success: true,
  game: {
    puzzleId: "698f64d2b5ccb935c826a6dd",
    startedAt: "2026-02-13T21:00:00.000Z",
    checkCount: 12,
    hintCount: 3,
    userGrid: [['-', 'E', 'T', ...], ...]
  }
}
```

**Uso:**
- Auto-guardar progreso
- Mostrar estadísticas
- Restaurar sesión

---

### 8. Finalizar juego

```javascript
const stats = await GameAPI.endGame();

console.log('Duración:', stats.stats.duration / 1000, 'segundos');
console.log('Verificaciones:', stats.stats.checks);
console.log('Pistas usadas:', stats.stats.hints);
```

**Retorna:**
```javascript
{
  success: true,
  message: "Juego finalizado",
  stats: {
    duration: 1234567,  // milisegundos
    checks: 12,
    hints: 3
  }
}
```

---

## 🎨 Métodos del GameUI

### 1. Marcar celda correcta

```javascript
GameUI.markCorrect(row, col);
```

Añade clase `.correct` y animación verde a la celda.

---

### 2. Marcar celda incorrecta

```javascript
GameUI.markIncorrect(row, col);
```

Añade clase `.incorrect` y animación roja (temporal, se quita después de 2s).

---

### 3. Mostrar progreso

```javascript
GameUI.showProgress({
  progress: 45,
  correctCells: 27,
  totalCells: 60
});
```

Actualiza el `#game-status` con el porcentaje completado.

---

### 4. Mostrar modal de victoria

```javascript
GameUI.showVictory({
  checks: 12,
  hints: 3
});
```

Muestra un modal con las estadísticas finales.

---

### 5. Mostrar notificación

```javascript
GameUI.showNotification('¡Celda correcta!', 'success');
GameUI.showNotification('Celda incorrecta', 'error');
GameUI.showNotification('Progreso: 50%', 'info');
```

Muestra un toast en la esquina superior derecha.

---

## 📝 Ejemplos Completos

### Ejemplo 1: Verificar celda al cambiar input

```javascript
// Escuchar cambios en los inputs
document.querySelectorAll('.crossword-cell input').forEach(input => {
  input.addEventListener('blur', async function() {
    const row = parseInt(this.dataset.row);
    const col = parseInt(this.dataset.col);
    const value = this.value.toUpperCase();
    
    if (value.length === 1) {
      const result = await GameAPI.checkCell(row, col, value);
      
      if (result.correct) {
        GameUI.markCorrect(row, col);
      } else {
        GameUI.markIncorrect(row, col);
      }
    }
  });
});
```

---

### Ejemplo 2: Botón "Verificar palabra"

```javascript
document.querySelectorAll('.check-word-btn').forEach(btn => {
  btn.addEventListener('click', async function() {
    const wordIndex = parseInt(this.dataset.wordIndex);
    
    const result = await GameAPI.checkWord(wordIndex);
    
    if (result.correct) {
      GameUI.showNotification('¡Palabra correcta!', 'success');
      this.style.color = 'green';
    } else {
      GameUI.showNotification('Palabra incorrecta', 'error');
    }
  });
});
```

---

### Ejemplo 3: Botón "Pista"

```javascript
document.querySelectorAll('.hint-btn').forEach(btn => {
  btn.addEventListener('click', async function() {
    const row = parseInt(this.dataset.row);
    const col = parseInt(this.dataset.col);
    
    const result = await GameAPI.solveCell(row, col);
    
    // Rellenar input
    const input = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    input.value = result.value;
    
    // Marcar como revelada
    input.classList.add('revealed');
    GameUI.markCorrect(row, col);
    
    GameUI.showNotification('Pista revelada', 'info');
  });
});
```

---

### Ejemplo 4: Verificar progreso periódicamente

```javascript
// Auto-guardar cada 30 segundos
setInterval(async () => {
  const status = await GameAPI.getStatus();
  
  GameUI.showProgress({
    progress: Math.round((status.game.correctCells / 60) * 100)
  });
  
  // Guardar en localStorage por si acaso
  localStorage.setItem('gameProgress', JSON.stringify(status.game.userGrid));
}, 30000);
```

---

### Ejemplo 5: Modal de victoria al completar

```javascript
document.getElementById('check-all-btn').addEventListener('click', async () => {
  const result = await GameAPI.checkGrid();
  
  GameUI.showProgress(result);
  
  if (result.complete) {
    const stats = await GameAPI.getStatus();
    
    GameUI.showVictory({
      checks: stats.game.checkCount,
      hints: stats.game.hintCount,
      duration: new Date() - new Date(stats.game.startedAt)
    });
    
    // Finalizar juego
    await GameAPI.endGame();
  } else {
    GameUI.showNotification(
      `Progreso: ${result.progress}% (${result.errorCount} errores)`,
      'info'
    );
  }
});
```

---

## ⚠️ Errores Comunes

### Error 1: "No hay juego activo en la sesión"

**Causa:** Intentar usar la API sin haber iniciado el juego.

**Solución:** 
- Asegurarse de estar en `/puzzles/game/:id`
- El juego se inicia automáticamente al cargar la página

---

### Error 2: "Puzzle no encontrado"

**Causa:** ID de puzzle inválido o no existe en la base de datos.

**Solución:**
- Verificar que el ID del puzzle existe en MongoDB
- Usar IDs válidos de puzzles existentes

---

### Error 3: "CORS error"

**Causa:** Intentar hacer peticiones desde otro dominio.

**Solución:**
- La API solo funciona desde el mismo dominio
- Configurar CORS en `app.js` si es necesario

---

### Error 4: "Session expired"

**Causa:** Cookie de sesión expirada.

**Solución:**
- Recargar la página para crear nueva sesión
- Ajustar tiempo de expiración en `config/sessionconfig.js`

---

## 🔒 Consideraciones de Seguridad

### ✅ Lo que NUNCA verás en las respuestas:

- `filled_grid` completo
- Respuestas correctas (excepto en `solve-*`)
- Posiciones exactas de errores en `check-grid`

### ⚠️ Lo que SÍ puedes ver:

- `void_grid` (solo indica celdas negras)
- `clues` (pistas textuales)
- `words` (posiciones y longitudes, SIN respuestas)
- Respuestas correctas SOLO cuando solicitas pistas (`solve-cell`, `solve-word`, `solve-grid`)

### 🛡️ Protecciones implementadas:

1. **Validación server-side:** Todas las verificaciones en el backend
2. **Sesiones:** Estado del juego en `req.session`
3. **Rate limiting:** Protección contra spam
4. **Sanitización:** Datos limpios antes de enviar al cliente

---

## 📚 Integración con Código Existente

### Si ya tienes `cw_scripts.js`:

```javascript
// En cw_scripts.js, reemplaza validaciones locales con API calls

// ANTES (inseguro):
function checkCell(row, col, value) {
  const correct = hiddenGrid[row][col];  // ❌ Expuesto
  return value === correct;
}

// AHORA (seguro):
async function checkCell(row, col, value) {
  const result = await GameAPI.checkCell(row, col, value);
  return result.correct;
}
```

---

## 🧪 Testing

### Test desde la consola del navegador:

```javascript
// Abrir /puzzles/game/:id
// Abrir DevTools Console (F12)

// Test 1: Verificar celda
await GameAPI.checkCell(0, 2, 'E');

// Test 2: Estado del juego
await GameAPI.getStatus();

// Test 3: Progreso
await GameAPI.checkGrid();

// Test 4: Intentar ver solución (NO FUNCIONA)
console.log(document.querySelector('#hidden_grid'));  // null ✅

// Test 5: Buscar filled_grid en el código fuente
// View Page Source → buscar "filled_grid" → ❌ No encontrado ✅
```

---

## 📞 Soporte

Si encuentras problemas:

1. **Verificar logs del servidor:** `tail -f logs/app.log`
2. **Verificar errores en DevTools:** Console → Network tab
3. **Consultar documentación:** `docs/GAME_API.md`

---

**¡Feliz desarrollo!** 🎮
