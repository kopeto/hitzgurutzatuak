# Hitzgurutzatuak — Plan de producto y modernización

**Estado:** Propuesta aprobable antes de implementar  
**Objetivo:** convertir Hitzgurutzatuak en una plataforma profesional de crucigramas para jugadores, conservando todas las capacidades actuales.  
**Idioma de interfaz:** euskera (Euskara) de forma completa y consistente.  
**Convención de código:** los comentarios nuevos o modificados se escribirán en euskera o inglés.

---

## 1. Visión de producto

Hitzgurutzatuak será un portal de crucigramas en euskera con una experiencia de juego excelente en móvil y escritorio. El producto debe dar valor a dos perfiles:

| Perfil | Necesidad principal | Resultado esperado |
| --- | --- | --- |
| Jokalaría | Encontrar, jugar y retomar crucigramas cómodamente | Catálogo útil, juego fluido, progreso y estadísticas personales |
| Kudeatzailea (master) | Publicar y administrar contenido de forma segura | Gestión de puzles, usuarios, actividad y archivos sin exponer datos sensibles |

La aplicación seguirá protegiendo la solución: el navegador no recibirá `filled_grid` ni las respuestas de las palabras. El servidor seguirá siendo la fuente autoritativa para correcciones y pistas.

## 2. Alcance y compatibilidad

### Funcionalidad que se conserva

- Registro, inicio y cierre de sesión con Passport.
- Roles `master` y panel de administración.
- Subida de archivos `.puz` desde la interfaz y la API externa.
- Lectura del formato `.puz`, almacenamiento de pistas, rejilla y solución.
- Juego mediante teclado, selección de palabra, navegación, deshacer y rehacer.
- Comprobación de celda, palabra y tablero.
- Pistas para celda, palabra y tablero completo.
- Cronómetro, guardado de progreso, historial y estado de partida.
- Estadísticas de sesiones y API externa protegida mediante API key.
- Despliegue con Docker Compose.

### Nuevas capacidades incluidas

- Portada orientada a jugadores.
- Búsqueda, filtros y paginación de puzles.
- Dificultad, etiquetas, estado de publicación y descripción editorial de puzles.
- Favoritos y lista de puzles pendientes.
- Perfil de jugador con estadísticas útiles.
- Experiencia móvil accesible para el tablero.
- Mejoras de administración, seguridad, observabilidad y pruebas.

### Fuera del alcance inicial

- Creación visual de crucigramas dentro de la web.
- Partidas multijugador en tiempo real.
- Pagos, suscripciones o publicidad.
- Traducción de pistas o contenidos existentes.

Estas opciones se podrán evaluar tras estabilizar la primera versión profesional.

## 3. Arquitectura de información

```text
/                         Hasiera / portada
/puzzles                  Puzleen katalogoa
/puzzles/:id              Puzlearen fitxa pública
/puzzles/game/:id         Jokoaren pantaila
/users/register           Kontua sortu
/users/login              Saioa hasi
/users/dashboard          Nire profila eta estatistikak
/master                   Kudeaketa panela (master)
/external/*               Kanpoko API pribatua
```

La ruta actual `/puzzles/game/:id` se mantiene para evitar romper enlaces y el funcionamiento del juego. La nueva ficha pública de puzle puede incorporarse antes de iniciar una partida; desde el catálogo el botón principal seguirá llevando a jugar o retomar la partida.

## 4. Diseño visual y sistema de componentes

### Principios

1. **Jokoa lehenengo:** el tablero, la pista activa y las acciones prioritarias dominan la pantalla de juego.
2. **Argitasuna:** cada estado (guardando, corregido, error, terminado, sin conexión) debe ser comprensible sin explicación adicional.
3. **Mugikorra lehenengo:** el tablero debe usarse sin zoom horizontal en pantallas estrechas.
4. **Irisgarria:** contraste AA, foco visible, uso por teclado y mensajes interpretables por lector de pantalla.
5. **Euskara naturala:** toda cadena que vea la persona usuaria estará en euskera, con terminología uniforme.

### Sistema visual propuesto

- Tipografía de interfaz legible y de carga rápida; tipografía opcional diferenciada para títulos.
- Paleta cálida y sobria: color de marca, superficie clara/oscura, colores semánticos para éxito, aviso y error.
- Escala fija de espaciado, radios, sombras y tamaños de texto mediante variables CSS.
- Iconos SVG accesibles acompañados de texto o `aria-label` cuando corresponda.
- Componentes reutilizables: botones, badges, tarjetas, alertas, formularios, modales, tablas, filtros, skeletons y estados vacíos.
- Modo oscuro como mejora posterior, diseñado desde las variables de color para evitar rehacer estilos.

### Pantallas a diseñar

| Área | Contenido principal |
| --- | --- |
| Hasiera | Hero breve, puzle destacado, últimos puzles, categorías, beneficios de crear una cuenta |
| Katalogoa | Buscador, filtros, ordenación, tarjetas y paginación |
| Puzlearen fitxa | Título, autor, dificultad, dimensiones, etiquetas, descripción, progreso y acción de jugar |
| Jokoa | Tablero responsive, pista activa, listado de pistas, cronómetro, progreso, controles y guardado |
| Nire profila | Resumen, partidas en curso, completadas, favoritos, métricas y actividad reciente |
| Kudeaketa | Métricas, gestión de puzles, usuarios, publicaciones, cargas y archivos |
| Autentifikazioa | Formularios claros, validación inmediata y enlaces de recuperación futuros |
| Erroreak | 404, 403 y 500 consistentes, en euskera y con una acción de retorno |

## 5. Experiencia de juego

### Tablero

- Calcular el tamaño de celda según ancho disponible, dimensiones del puzle y tamaño mínimo táctil.
- En móvil, mantener el tablero visible con desplazamiento controlado solo cuando sea inevitable; evitar que el navegador haga zoom accidental.
- Resaltar celda activa, palabra activa, cruces y pista correspondiente sin depender únicamente del color.
- Añadir `aria-label` en celdas y anunciar los resultados de corrección mediante región viva.
- Mantener los atajos existentes y mostrar una ayuda breve: flechas, tabulador, borrar, deshacer y rehacer.

### Acciones de juego

| Acción actual | Mejora propuesta |
| --- | --- |
| Zuzendu hizkia / hitza / koadroa | Separar visualmente corrección y pistas, describir el efecto antes de ejecutar |
| Bete hizkia / hitza / koadroa | Pedir confirmación antes de revelar una palabra o el tablero completo |
| Koadroa garbitu | Confirmación y opción de deshacer inmediato |
| Guardado | Indicador `Gordeta`, `Gordetzen...` o error recuperable |
| Fin de partida | Modal/resumen con tiempo, errores, pistas, progreso y siguiente acción |
| Partida retomada | Aviso discreto que confirme fecha y progreso recuperados |

### Métricas de juego

Se conservarán `elapsedSeconds`, errores y pistas. Se añadirán métricas derivadas en presentación: porcentaje de finalización, tiempo por puzle, racha y tasa de completado. No se utilizarán para bloquear ni penalizar a la persona jugadora.

## 6. Datos y migraciones

### Extensión de Crossword

```js
{
  // Existing fields remain unchanged.
  description: String,
  difficulty: 'erraza' | 'ertaina' | 'zaila',
  tags: [String],
  status: 'draft' | 'published' | 'archived',
  publishedAt: Date,
  fileHash: String,
  playCount: Number,
  completedCount: Number
}
```

### Nuevos datos de jugador

Se incorporará un modelo `FavoritePuzzle` o un campo equivalente con índice único por `(userId, puzzleId)`. La decisión se tomará al implementar: un modelo independiente facilita consultas y escalabilidad; un array en `User` simplifica una primera versión pero tiene peor comportamiento a gran escala.

### Índices previstos

- `Crossword`: `status + publishedAt`, `difficulty`, `tags`, `author`, `fileHash` único cuando esté informado.
- `FavoritePuzzle`: `userId + puzzleId` único.
- `PlaySession`: conservar el índice único actual por usuario y puzle; añadir índices para consultas de finalizadas y recientes si la carga lo requiere.
- `GameState`: conservar el índice único actual por jugador y puzle.

### Migración segura

1. Añadir campos como opcionales y con valores por defecto.
2. Crear un script idempotente para publicar los puzles existentes con dificultad `ertaina` y sin etiquetas.
3. Verificar índices antes de activarlos en producción.
4. No modificar ni borrar `filled_grid`, `void_grid`, pistas, resultados o sesiones existentes.
5. Realizar backup de MongoDB antes de cualquier migración productiva.

## 7. Euskera e internacionalización

El euskera será el único idioma visible inicialmente. Se creará un diccionario central de cadenas para evitar textos dispersos entre Pug, rutas y JavaScript.

### Reglas lingüísticas

- Mantener `puzlea`, `hitz gurutzatua`, `pista`, `egiaztatu`, `gorde`, `osatu` y `jokalaria` como terminología base.
- Usar frases cortas orientadas a la acción: `Jarraitu jokatzen`, `Gorde da`, `Ezin izan da gorde`.
- No mostrar errores de infraestructura, claves, rutas o trazas a usuarios finales.
- Los mensajes de API también se devolverán en euskera.

## 8. Seguridad, privacidad y operación

Estas tareas son bloqueantes antes de declarar el producto listo para producción:

- Reauditar dependencias con el `package-lock.json` actual; los informes históricos no se tomarán como estado actual sin verificar versiones.
- Eliminar la asignación automática de master por nombre de usuario en el registro. El rol se concederá mediante script administrativo autenticado o migración controlada.
- Validar y normalizar los nombres de carga con `path.basename`, nombre aleatorio interno y límite de tamaño.
- Validar el archivo `.puz` antes de persistirlo y borrar de forma controlada cualquier carga fallida.
- Aplicar validación de esquema a todos los parámetros, cuerpos, coordenadas y valores de la API.
- Configurar sesiones con cookies `httpOnly`, `secure` en HTTPS, `sameSite`, `resave: false` y secreto obligatorio fuera de desarrollo.
- Añadir protección CSRF a rutas autenticadas que cambien estado, teniendo en cuenta `sendBeacon` y la API de juego.
- No mostrar nunca `EXTERNAL_API_KEY` en una vista ni en logs.
- Establecer CSP compatible con scripts propios y revisar cabeceras de Helmet.
- Añadir endpoints `/health` y `/ready` para Docker y el proxy de producción.
- Usar HTTPS y un proxy inverso en producción; no publicar MongoDB al exterior.
- Registrar eventos técnicos estructurados sin contraseñas, sesiones, soluciones ni claves.

## 9. Calidad, pruebas y entrega continua

### Pirámide de pruebas

| Nivel | Casos mínimos |
| --- | --- |
| Unitarias | Parser `.puz`, sanitización de palabras, validadores, permisos y cálculos de progreso |
| Integración | Registro, login, juego, guardado, corrección, pistas, historial, subida, API externa y permisos master |
| Navegador | Flujo de jugador en escritorio y móvil, teclado, reanudación y accesibilidad básica |
| Seguridad | No exposición de `filled_grid`, CSRF, permisos, rutas de descarga y carga maliciosa |

Se sustituirá el `npm test` actual por una suite reproducible. Se añadirán linting, formateo y una canalización CI que ejecute instalación limpia, pruebas y auditoría de dependencias.

## 10. Fases de implementación

### Fase 0 — Línea base y decisiones (entrega: inventario verificable)

- Auditar rutas, vistas, scripts, estilos y textos visibles.
- Ejecutar y reparar el conjunto de pruebas base.
- Tomar capturas de las pantallas actuales para comparar regresiones.
- Definir diccionario de euskera y tokens del sistema visual.
- Confirmar las rutas públicas y los datos que deben permanecer compatibles.

**Criterio de salida:** inventario firmado, entorno local y Docker reproducibles, sin cambios funcionales para usuarios.

### Fase 1 — Fundaciones técnicas y seguridad (entrega: base segura)

- Reforzar configuración de sesiones, validación, manejo de errores y cargas.
- Corregir el mecanismo de asignación de roles master.
- Añadir health checks, configuración por entorno y logging útil.
- Crear la base de pruebas y CI.

**Criterio de salida:** las rutas existentes conservan comportamiento; las pruebas cubren los flujos críticos; no se muestran secretos ni soluciones.

### Fase 2 — Sistema visual y páginas públicas (entrega: nuevo portal)

- Crear layout, cabecera, pie y componentes reutilizables.
- Implementar portada y catálogo profesional.
- Añadir ficha pública de puzle, búsqueda, filtros y paginación.
- Adaptar todas las cadenas públicas a euskera.

**Criterio de salida:** navegación usable en móvil/escritorio, sin regresiones en listado ni inicio de juego.

### Fase 3 — Juego de nivel profesional (entrega: experiencia de juego)

- Rediseñar tablero y controles para responsividad, teclado y táctil.
- Incorporar estados de guardado, ayuda, confirmaciones y resumen de finalización.
- Añadir pruebas de no exposición de solución y de restauración de partida.

**Criterio de salida:** jugar un puzle completo funciona en móvil y escritorio, incluyendo guardado, corrección, pistas, deshacer/rehacer y recarga.

### Fase 4 — Perfil y descubrimiento (entrega: retención de jugadores)

- Crear perfil, estadísticas, partidas en curso y completadas.
- Implementar favoritos, dificultad, etiquetas y recomendaciones básicas por categoría.
- Mostrar progreso y estado de puzles en catálogo y ficha.

**Criterio de salida:** un usuario puede encontrar, guardar, retomar y revisar su actividad con claridad.

### Fase 5 — Administración editorial (entrega: gestión operativa)

- Mejorar carga, edición de metadatos, publicación, archivado y filtros administrativos.
- Añadir métricas de uso por puzle y controles de archivos.
- Mantener la API externa documentada y protegida.

**Criterio de salida:** un master puede gestionar todo el ciclo de vida de un puzle sin acceder directamente a MongoDB.

### Fase 6 — Cierre de producción (entrega: release candidate)

- Auditoría de seguridad, rendimiento, responsive y accesibilidad.
- Pruebas de backup/restauración y migración.
- Documentación de operación, despliegue y respuesta a incidentes.
- Revisión final de euskera en todas las pantallas y respuestas de usuario.

**Criterio de salida:** despliegue reproducible, monitorizable y probado, con aprobación de producto y seguridad.

## 11. Orden de la primera implementación

La primera iteración práctica seguirá este orden para entregar valor visible sin desestabilizar el juego:

1. Auditoría de cadenas y layout base en euskera.
2. Sistema de estilos y navegación responsive.
3. Portada y catálogo con tarjetas de puzle.
4. Revisión del tablero en móvil y accesibilidad.
5. Seguridad de sesión, carga y roles.
6. Tests automatizados para los flujos que se han tocado.

No se implementarán favoritos, rankings ni logros antes de garantizar que el juego, el guardado y la administración son sólidos.

## 12. Criterios globales de aceptación

- Toda interfaz, mensaje y página de error de cara a usuarios está en euskera.
- Todos los comentarios de código nuevos o modificados están en euskera o inglés.
- Ninguna respuesta al navegador expone `filled_grid` ni respuestas completas salvo mediante una acción explícita de pista/resolución.
- El conjunto actual de funcionalidades sigue operativo y queda cubierto por pruebas relevantes.
- El catálogo y el juego funcionan desde 320 px de ancho hasta escritorio.
- Los flujos críticos se pueden realizar con teclado.
- Las rutas administrativas y la API externa no exponen secretos.
- Docker Compose continúa levantando aplicación y MongoDB de forma reproducible.

## 13. Avance de implementación

### Base de seguridad aplicada — 2026-09-19

- El registro de usuarios ya no concede el rol `master` a partir de un nombre configurado en el entorno.
- `scripts/sync-masters.js` concede el rol únicamente a identificadores de usuario explícitos en `MASTER_USER_IDS`; no revoca roles automáticamente.
- `scripts/grant-master.js` permite conceder el rol a una cuenta existente mediante una operación manual de servidor: `npm run user:grant-master -- <erabiltzailea>`.
- Las sesiones pasan a usar cookie `httpOnly`, `sameSite=lax`, `resave=false` y no crean sesiones vacías. En producción, `MY_SECRET` es obligatorio y las cookies requieren HTTPS.
- La sesión se regenera tras iniciar sesión y se destruye al cerrar sesión.
- La subida de `.puz` usa un nombre aleatorio interno, límite de tamaño, limpieza de archivos temporales y huella SHA-256 para bloquear duplicados.
- La API key externa deja de mostrarse en el panel master.
- Se han incorporado `/health` y `/ready` para la supervisión del servicio.

Pendiente para completar la Fase 1: protección CSRF compatible con `sendBeacon`, validación de todos los parámetros de API, pruebas automatizadas y revisión de dependencias.
