# TODO — Portal de Puzleak

## 🔴 Crítico

- [ ] **Responsive/mobile del grid**  
  La tabla HTML del crucigrama es inutilizable en móvil. Requiere rediseño del grid para pantallas pequeñas (táctil, zoom, scroll).

- [ ] **Pantalla de victoria al completar**  
  El API devuelve `complete: true` pero el frontend no reacciona. Añadir modal/animación con tiempo final, contadores de chequeos y pistas usadas.

- [ ] **Bug en selección de pistas (cw_scripts.js)**  
  - Límite hardcodeado a `50` celdas en `selectWordDown` y `selectWordAcross` (`while(index<50 && ...)`)
  - La función que clica una pista busca `<span class="n">` que no existe en el HTML
  - Hay dos comentarios `// ERROR PROBABLY HERE` marcando los puntos afectados

- [ ] **Persistencia de progreso en base de datos**  
  El progreso del usuario vive solo en la sesión HTTP. Si se cierra el navegador o expira la sesión, se pierde todo. Guardar estado por `(userId, puzzleId)` en MongoDB.

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

- [ ] **Timestamps y contador de jugadas en puzzles**  
  El schema de `Crossword` no tiene `createdAt` ni `playCount`. Añadir `{ timestamps: true }` en Mongoose y un contador que se incrementa al iniciar partida.

---

## 🟠 Mejoras de calidad

- [x] **Rate limiting en APIs**  
  Sin límite de peticiones en `/api/game/check-cell` etc. Añadir `express-rate-limit`.

- [ ] **Paginación y búsqueda en la lista de puzzles**  
  Con 20+ puzzles la lista se vuelve incómoda. Añadir filtros por autor, tamaño de grid, y paginación.

- [ ] **Metadatos de puzzle: dificultad, categorías, etiquetas**  
  La tabla de puzzles muestra poca información de valor. Añadir nivel de dificultad y etiquetas opcionales al modelo.

- [ ] **SEO básico**  
  No hay `<meta description>`, `og:title` ni nada. El `<title>` es idéntico para todos los puzzles. Añadir metadatos dinámicos en `layout.pug`.

- [ ] **Accesibilidad (a11y)**  
  El grid no tiene ARIA labels. Añadir roles y descripciones para lectores de pantalla.

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
