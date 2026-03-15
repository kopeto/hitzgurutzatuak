# OpenAPI y Swagger — Guía y uso en este proyecto

Última actualización: 2026-03-14

## ¿Qué es OpenAPI?
OpenAPI es una especificación estándar (formato YAML/JSON) para describir APIs REST de forma estructurada. Una especificación OpenAPI define:

- Rutas y métodos (GET/POST/...)
- Parámetros de entrada (path, query, headers)
- Cuerpos de petición (`requestBody`) y esquema JSON
- Respuestas y códigos HTTP
- Esquemas de seguridad (JWT, API keys, OAuth)
- Metadatos (título, versión, contact)

OpenAPI facilita documentación, validación, generación de clientes/servidores y pruebas.

## ¿Qué es Swagger?
Swagger es un ecosistema de herramientas que consume especificaciones OpenAPI. Herramientas útiles:

- **Swagger UI** — interfaz web interactiva para visualizar y probar endpoints a partir de un YAML/JSON OpenAPI.
- **Swagger Editor** — editor online/offline para crear specs con autocompletado.
- **OpenAPI Generator / Swagger Codegen** — genera clientes y esqueletos de servidor en múltiples lenguajes.

En la práctica se usa hoy en día indistintamente "Swagger" para referirse al UI y "OpenAPI" para la spec.

## Beneficios de usar OpenAPI/Swagger

- Documentación legible e interactiva para desarrolladores
- Posibilidad de generar SDKs cliente automáticamente
- Validación automatizada de requests/responses
- Facilita revisiones y contratos entre equipos frontend/backend

## Ejemplo mínimo (YAML) para `check-cell`

```yaml
openapi: 3.0.3
info:
  title: Hitzgurutzatuak API
  version: '1.0'
paths:
  /api/game/check-cell:
    post:
      summary: Comprueba una celda del grid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [row, col, value]
              properties:
                row: { type: integer, example: 3 }
                col: { type: integer, example: 5 }
                value: { type: string, example: "A" }
      responses:
        '200':
          description: Resultado de la comprobación
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  correct: { type: boolean }
                  correctLetter: { type: string }
```

## Recomendación para este repo

1. Crear un fichero `openapi.yaml` en la raíz o en `docs/` con todos los endpoints principales (`check-cell`, `check-word`, `check-grid`, `solve-*`, `timer/pause|resume`, `history/:puzzleId`, etc.).
2. Añadir `swagger-ui-express` para servir la UI en `GET /docs` (o `GET /api-docs`).
3. (Opcional) Usar `OpenAPI Generator` para generar un SDK JS que el frontend pueda consumir (reduce la fragilidad del código fetch manual).

### Ejemplo rápido: servir Swagger UI en Express

1. Instalar:

```bash
npm install swagger-ui-express yamljs
```

2. Código (en `app.js` o una ruta nueva):

```js
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./docs/openapi.yaml');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

Abrir `http://localhost:3000/docs` mostrará la UI interactiva.

### Generar cliente con OpenAPI Generator

Instalar `openapi-generator-cli` y luego:

```bash
openapi-generator-cli generate -i docs/openapi.yaml -g javascript -o ./generated/sdk-js
```

Esto genera un cliente JS en `./generated/sdk-js` que puede importarse o adaptarse.

## Notas específicas para este proyecto

- Algunas respuestas devuelven `correctLetter` para dar hint; documentarlo claramente y marcar si solo se devuelve a usuarios autenticados.
- Documentar los body y formatos de `cellResults` (shape exacta) para que el frontend y cualquier SDK lo interpreten correctamente.
- Si se implementan cambios en la API (p.ej. versionado), mantener `openapi.yaml` actualizado y publicar versiones (`/v1`, `/v2`) en la UI.

---

¿Quieres que genere ahora `docs/openapi.yaml` con los endpoints principales del proyecto (borrador), y que además incluya la configuración en `app.js` para servir Swagger UI en `/docs`? Puedo crear los ficheros y un commit si me autorizas.