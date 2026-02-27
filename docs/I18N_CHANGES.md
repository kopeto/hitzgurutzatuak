# 🌐 Internacionalización - Cambios UI Euskera / Código Inglés

## Mensajes API (routes/api.js)

### Español → Euskera (mensajes para usuario)

| Español | Euskera |
|---------|---------|
| No hay juego activo en la sesión | Ez dago joko aktiborik saioan |
| Puzzle no encontrado | Puzlea ez da aurkitu |
| Error al iniciar el juego | Errorea jokoa hastean |
| Datos incompletos | Datu osatugabeak |
| Error al verificar celda | Errorea zelula egiaztatzean |
| Índice de palabra requerido | Hitz indizea beharrezkoa da |
| Palabra no encontrada | Hitza ez da aurkitu |
| Error al verificar palabra | Errorea hitza egiaztatzean |
| Posición de celda requerida | Zelula kokapena beharrezkoa da |
| Error al resolver celda | Errorea zelula ebaztean |
| Error al verificar grid | Errorea koadroa egiaztatzean |
| Juego finalizado | Jokoa amaituta |
| Error al finalizar juego | Errorea jokoa amaitzean |
| Error al resolver palabra | Errorea hitza ebaztean |
| Puzzle resuelto completamente | Puzlea erabat ebatzi da |
| Error al resolver grid | Errorea koadroa ebaztean |

### Comentarios Español → Inglés

| Español | Inglés |
|---------|--------|
| Middleware para verificar... | Middleware to verify... |
| Inicia una nueva sesión | Starts a new game session |
| Crear estado del juego | Create game state |
| Enviar solo datos públicos | Send only public data |
| Solo las celdas negras | Only black cells |
| Sin las respuestas | Without answers |
| Verifica una celda | Verifies a cell |
| Actualizar grid del usuario | Update user grid |
| Verifica si una palabra | Verifies if a word |
| Construir la palabra del usuario | Build user's word |
| Revela la respuesta de una celda | Reveals cell answer (hint) |
| Verifica si el grid | Verifies if grid |
| Comparar grids | Compare grids |
| No enviar posiciones | Don't send positions |
| Obtiene el estado actual | Gets current game state |
| Finaliza la sesión | Ends game session |
| Funciones auxiliares | Helper functions |
| Remover la propiedad | Remove property |

## Mensajes Frontend (public/scripts/game_api.js)

### Español → Euskera

| Español | Euskera |
|---------|---------|
| Error de conexión | Konexio errorea |
| Selecciona una celda primero | Lehenengo zelula bat hautatu |
| La celda está vacía | Zelula hutsik dago |
| ¡Correcto! ✓ | Zuzena! ✓ |
| Incorrecto ✗ | Okerra ✗ |
| Selecciona una palabra primero | Lehenengo hitz bat hautatu |
| Selecciona una pista primero | Lehenengo pista bat hautatu |
| ¡Palabra correcta! ✓ | Hitz zuzena! ✓ |
| La palabra tiene errores ✗ | Hitzak akatsak ditu ✗ |
| Pista revelada | Pista agerian |
| Pista de palabra revelada | Hitz pista agerian |
| Hay X error(es) | X akats daude |
| Progreso: X% | Aurrerapena: X% |
| ¡Sigue así! | Segi horrela! |
| ¿Seguro que quieres revelar? | Ziur zaude agerian jarri nahi duzula? |
| Esto terminará el juego | Honek jokoa amaitu egingo du |
| Puzzle resuelto completamente | Puzlea erabat ebatzi da |

### Comentarios Español → Inglés

| Español | Inglés |
|---------|--------|
| API Client para gestión | API Client for crossword management |
| Maneja toda la comunicación | Handles all communication |
| sin exponer soluciones | without exposing solutions |
| Verifica una celda individual | Verifies an individual cell |
| Verifica una palabra completa | Verifies a complete word |
| Solicita pista | Requests hint |
| Revela una celda | Reveals a cell |
| Verifica el grid completo | Verifies complete grid |
| Revela una palabra completa | Reveals complete word |
| Revela el grid completo | Reveals complete grid |
| Obtiene el estado actual | Gets current state |
| Finaliza el juego | Ends the game |
| Feedback visual para el usuario | Visual feedback for user |
| Marca una celda como correcta | Marks cell as correct |
| Marca una celda como incorrecta | Marks cell as incorrect |
| Muestra progreso del juego | Shows game progress |
| Muestra mensaje de victoria | Shows victory message |
| Muestra notificación | Shows notification |

## Otros archivos

### views/login.pug
Ya está en euskera ✅

### views/register.pug  
Ya está en euskera ✅

### views/layout.pug
Ya está en euskera ✅

### views/game.pug
Ya está en euskera ✅

### routes/users.js
Revisar mensajes flash

### config/*.js
Comentarios a inglés

## Implementación

Crear script de reemplazo automático o hacer cambios manuales archivo por archivo.
