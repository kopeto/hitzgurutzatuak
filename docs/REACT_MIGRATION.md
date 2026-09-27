# React migration

## Architecture

The Express application remains responsible for authentication, server-side validation, database access, uploads, and all game verification. Each browser route now renders a minimal React bootstrap document with a sanitized initial state. React owns every visible page and client interaction.

## Delivery plan

1. Preserve the existing HTTP contracts and prevent puzzle answers from reaching the browser.
2. Replace each Pug page with a React page component while retaining the existing CSS class names.
3. Isolate translations, game API calls, formatting, layout, and page components.
4. Port crossword keyboard controls, undo/redo, persistence, timer, checking, hints, and restart behavior.
5. Port spiral play and the spiral file builder, including draft, import, preview, and export workflows.
6. Build the client with Vite and serve the generated bundle from Express.

## Commands

Use `npm run build:client` to create the browser bundle and `npm run dev:client` during client development. Run `npm test` for the existing foundation suite.
