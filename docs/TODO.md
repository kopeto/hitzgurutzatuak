# TODO — Portal de Puzleak

## 🔴 Crítico

- [ ] **Responsive/mobile del grid**  
  La tabla HTML del crucigrama es inutilizable en móvil. Requiere rediseño del grid para pantallas pequeñas (táctil, zoom, scroll).

- [x] **Pantalla de victoria al completar**  
  Al verificar el koadroa correctamente aparece una barra de notificación permanente con tiempo, egiaztapenak y pistak. Las celdas vacías se marcan en amarillo, las incorrectas en rojo.

- [x] **Bug en selección de pistas (cw_scripts.js)**  
  - Límite hardcodeado a `50` celdas en `selectWordDown` y `selectWordAcross` (`while(index<50 && ...)`)
  - La función que clica una pista busca `<span class="n">` que no existe en el HTML
  - Hay dos comentarios `// ERROR PROBABLY HERE` marcando los puntos afectados

- [x] **Persistencia de progreso en base de datos**  
  Modelo `GameState` (`playerId, puzzleId, cells, updatedAt`). Guardado con debounce 2s + inmediato en `visibilitychange`/`beforeunload` (sendBeacon). Carga y rellena el grid al volver a la página. Los usuarios anónimos no guardan nada.

---

## 🟡 Importante

- [ ] **Seguridad del rol master**  
  El rol se asigna comparando el username con la variable de entorno `MASTERS` en el momento del registro. Cualquiera que se registre con ese username antes que el admin se convierte en master. Mover la asignación de roles a un comando de admin o script separado.

- [ ] **Estadísticas por usuario**  
  No se guarda quién completó qué puzzle, en cuánto tiempo ni con cuántas pistas. Ampliar el modelo `User` o crear un modelo `GameResult`.

- [ ] **Ranking / tabla de clasificación**  
  Sin motivación para competir o repetir. Añadir tabla de mejores tiempos por puzzle.

- [ ] **Verificación de email en registro**  
  El registro está completamente abierto sin verificación. Añadir email de confirmación para evitar cuentas basura.

- [x] **Timestamps y contador de jugadas en puzzles**  
  `{ timestamps: true }` en Mongoose. Modelo `PlaySession` (`userId, puzzleId, startedAt, completedAt`): se crea al abrir un puzzle (solo usuarios logueados), se marca `completedAt` al verificar el grid completo. La lista de puzzles muestra badge Hasi Gabea / Hasia / Osatua por usuario. El estado Osatua es permanente; el grid se resetea al volver a jugar.

---

## 🟠 Mejoras de calidad

- [x] **Rate limiting en APIs**  
  Sin límite de peticiones en `/api/game/check-cell` etc. Añadir `express-rate-limit`.

- [ ] **Paginación y búsqueda en la lista de puzzles**  
  Con 20+ puzzles la lista se vuelve incómoda. Añadir filtros por autor, tamaño de grid, y paginación.

- [ ] **Metadatos de puzzle: dificultad, categorías, etiquetas**  
  La tabla de puzzles muestra poca información de valor. Añadir nivel de dificultad y etiquetas opcionales al modelo.

- [x] **SEO básico**  
  `<title>` dinámico con nombre del puzzle. `block meta` en `layout.pug` con defaults; `game.pug` sobreescribe con datos del puzzle (`name`, `author`, `width×height`). `og:title`, `og:description`, `og:type`. `charset` y `viewport` añadidos.

- [ ] **Accesibilidad (a11y)**  
  El grid no tiene ARIA labels. Pendiente (descartado por ahora).

- [x] **Consistencia de idioma en la UI**  
  La interfaz mezcla euskera y inglés en mensajes de error del servidor. Unificar al euskera si el objetivo es un portal en euskera.

---

## ✅ Está bien

- Solución nunca llega al cliente — `sanitizeWords` + sesión de servidor
- Contraseñas con bcrypt, autenticación con Passport.js
- API REST limpia y bien separada (check-cell, check-word, check-grid, solve-*)
- Navegación por teclado completa (flechas, backspace, letras)
- Verificación a nivel de celda, palabra y grid completo
- Pistas a nivel de celda y palabra
- Formato `.puz` estándar — compatible con herramientas externas
- Docker disponible para despliegue
- Numeración unificada de celdas (across/down comparten número si empiezan en la misma celda)
- Undo/redo (Ctrl+Z / Ctrl+Y) con pila de acciones en cliente; botones Desegin/Berregin
- Zuzendu/Bete Hitza identifica la palabra por dirección + coordenadas, no por número compartido
- Persistencia de progreso: debounce 2s + save-on-exit (sendBeacon); anónimos sin guardar
- PlaySession por usuario: badges Hasi Gabea / Hasia / Osatua en lista de puzzles
- Notificación en barra in-page (debajo del grid): errores, huecos vacíos, y victoria permanente
- Celdas vacías al Zuzendu koadroa marcadas en amarillo; se limpian con cualquier interacción
- Zuzendu koadroa destacado como botón primario
