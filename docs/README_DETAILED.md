# Hitzgurutzatuak — Documentación Detallada

Última actualización: 2026-03-14

## Resumen del proyecto

- Nombre: Hitzgurutzatuak
- Propósito: aplicación web para jugar, corregir y administrar puzles de crucigrama (formato `.puz`). Ofrece subida de puzles, juego interactivo en cliente, verificación por celda/habitual, pistas y persistencia de estado por usuario.
- Stack: Node.js + Express, MongoDB + Mongoose, Pug (servidor), jQuery/Vanilla JS (cliente), Bootstrap CSS.

## Estructura del repositorio (alto nivel)

- `app.js` — entrada de la aplicación Express
- `package.json` — dependencias y scripts
- `Dockerfile`, `docker-compose.yml` — contenedores/deploy
- `routes/` — rutas Express principales (`api.js`, `puzzles.js`, `users.js`, ...)
- `models/` — Mongoose models (`crosswords.js`, `gamestate.js`, `playsession.js`, `user.js`)
- `views/` — plantillas Pug (`game.pug`, `puzzles.pug`, `layout.pug`, ...)
- `public/` — assets: `scripts/` y `style/` (cliente)
- `cw/` — utilidades para parsear `.puz` y generar grids
- `docs/` — (aquí) documentación y guía OpenAPI/Swagger

## Flujo y arquitectura

1. El usuario solicita `GET /puzzles/game/:id`.
   - `routes/puzzles.js` carga el puzzle de la BD (`CrosswordModel`) y crea `req.session.currentGame` (plantilla `userGrid`, timestamps, counters).
   - `views/game.pug` renderiza la estructura del grid y carga JS cliente.
2. Cliente monta la UI y ejecuta `cw_scripts.js` para interacción: seleccionar celda, escribir, navegar, undo/redo, pedir checks y pistas.
3. Para comprobaciones el cliente llama a endpoints en `routes/api.js` (`/api/game/*`). El servidor compara con `puzzle.filled_grid` y devuelve `cellResults` cuando procede.
4. Estado persistente: `GameState` (snapshot de celdas no vacías y `cellResults`) y `PlaySession` (estadísticas/tiempo) para usuarios autenticados.

## Modelos principales

- `Crossword` (`models/crosswords.js`): contiene `filled_grid` (solución), `void_grid` (plantilla), `words` (metadatos), `clues`, `width/height`, `name`, `author`.
- `GameState` (`models/gamestate.js`): { `playerId`, `puzzleId`, `cells`: [{row,col,value}], `cellResults`: [{row,col,correct,empty,correctLetter}], `elapsedSeconds`, `usedVerify`, `completed`, `updatedAt` }.
- `PlaySession` (`models/playsession.js`): historial/estadísticas por usuario y puzzle (startedAt, elapsedSeconds, completedAt, errorCount, checks).

## Endpoints importantes (resumen)

- `POST /api/game/check-cell` — comprueba 1 celda
  - body: `{row, col, value}`
  - resp: `{ success, correct, correctLetter? }`
- `POST /api/game/check-word` — comprueba un hitza
  - body: `{ wordDir, wordX, wordY, cells: [{row,col,value}] }`
  - resp: `{ success, correct, cellResults: [{row,col,correct,correctLetter?}] }`
- `POST /api/game/check-grid` — comprueba todo el grid (finaliza juego)
  - body: `{ cells: [...] }`
  - resp: `{ success, complete, progress, cellResults, stats }`
  - efecto: el servidor guarda `GameState` final y actualiza `PlaySession` para usuarios autenticados.
- `POST /api/game/solve-cell`, `/solve-word`, `/solve-grid` — pistas (muestran letras o resuelven)
- `POST /api/game/timer/pause` y `/resume` — pausa y reanuda conteo de tiempo; `pause` persiste `elapsedSeconds`.
- `GET /api/game/history/:puzzleId` — recuperar `cells` guardadas (loadState)

Ver `routes/api.js` para la implementación completa.

## Frontend - comportamiento y componentes

- `views/game.pug` genera la tabla `#jokoa` con `td#c_{row}_{col}` y `span.char` dentro para la letra.
- `public/scripts/cw_scripts.js`:
  - controla selección de celda, palabra, navegación por teclado, undo/redo.
  - `loadAndReplay()` carga el estado guardado y repinta celdas.
  - guardado debounced y `sendBeacon` al cerrar pestaña para persistencia.
  - aplica `td.right` / `td.wrong` en las celdas tras comprobaciones; muestra `span.cell-hint` con la letra correcta en esquina inferior derecha.
- `public/scripts/game_api.js` gestiona llamadas fetch y `GameUI` helper para feedback visual (markCorrect/markIncorrect, notificaciones, progreso).
- `public/style/cw.css` contiene estilos del grid, selección, estados right/wrong y reglas para que la selección prevalezca.

## Correcciones históricas y reload

- Tras `check-grid`, se guarda `cellResults` (por celda) en `GameState`.
- Si el usuario reabre un juego completado, `game.pug` embebe `cellResults` como JSON (solo si `completed`) y `cw_scripts.js` aplica visualmente las correcciones antes de `freezeGame()`.

## Seguridad / controles existentes

- Limitadores de frecuencia (`actionLimiter`) en endpoints sensibles (checks/solves).
- Validaciones básicas en rutas (comprobación de campos y existencia del puzzle).
- `requireGameSession` y `checkAuth` para rutas que requieren sesión o autenticación.

## Instrucciones rápidas para desarrollo

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en dev:

```bash
npm run dev
# o si hay script: node app.js
```

3. Levantar con Docker (si procede):

```bash
docker-compose up --build
```

4. Ejecutar tests simples (si existen):

```bash
# ejemplo
npm test
./tests/test-game-api.sh
```

## Mejoras recomendadas antes de producción

Prioridad alta:
- Auditoría y actualización de dependencias; CI con `npm audit`.
- Forzar HTTPS y headers de seguridad (CSP, HSTS, X-Frame-Options).
- Harden sessions (secure, httpOnly, sameSite), mover session store a Redis si escalable.
- Validación y sanitización robusta de inputs (express-validator / Joi).
- Backups y despliegue de MongoDB en clúster gestionado.

Prioridad media:
- CI/CD: tests automáticos (unit, integration, e2e), lint, formateo.
- Monitoring/logging centralizado (Prometheus/Grafana, ELK o Datadog).
- Rate limiting y mecanismos anti-abuse en endpoints de pistas/solves.

Prioridad baja:
- Documentación OpenAPI/Swagger y generación de SDKs.
- Mejoras de accesibilidad y i18n completas.

---

Si quieres, guardo este fichero en `docs/README_DETAILED.md` (ya lo he creado) y puedo además:
- generar `openapi.yaml` esqueleto con los endpoints principales,
- añadir Swagger UI en `/docs` o una página estática de documentación,
- crear una lista de issues priorizados.

Dime qué quieres que haga a continuación.
