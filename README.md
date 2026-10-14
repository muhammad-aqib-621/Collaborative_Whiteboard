# Collaborative Whiteboard

A real-time collaborative, infinite whiteboard. Draw shapes, arrows and freehand, add text and sticky notes, and edit the same board with other people at the same time.

> **Status:** the source was written without network access, so `npm install`, `npm run build` and the tests have **not been run yet**. Run the commands below first; if the TypeScript compiler reports anything, it will be small and local to the file it names. See [Known limitations](#known-limitations).

## Tech stack

| Concern | Library |
| --- | --- |
| Build / dev server | Vite 7 |
| UI | React 19 + TypeScript (strict) |
| Canvas | Konva via react-konva |
| Editor (UI) state | Zustand |
| Shared board state | Yjs (+ y-websocket, y-indexeddb, y-protocols) |
| Styling | Tailwind CSS 4 |
| Accessible primitives | Radix UI (tooltip, dialog, dropdown menu, slider, toggle group, separator) |
| Icons | Lucide React |
| Tests | Vitest |

## Setup

Requires Node.js 18.18 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
```

Open the app, click **New board**, then open the same board URL in a second tab: edits and cursors sync between the tabs immediately, with no server.

## Development commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. Boards sync between tabs of the same browser. |
| `npm run dev:collab` | Starts the bundled sync server **and** Vite pointed at it (syncs across devices on your network). |
| `npm run server` | Only the sync server (`ws://localhost:1234`). |
| `npm run build` | Type-check (`tsc --noEmit`) and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | Type-check only. |
| `npm test` | Run the unit tests (board controller, undo, ordering, Yjs merging). |

## Features

- **Canvas:** infinite pan and zoom (wheel, trackpad pinch, touch pinch, Space-drag, hand tool, minimap), dot / line / no grid, fit to screen.
- **Tools:** select, hand, rectangle, ellipse, line, arrow, pen, text, sticky note.
- **Editing:** click or Shift-click to select, marquee select, move, resize and rotate with handles, endpoint handles for lines and arrows, arrow-key nudging, duplicate, delete.
- **Clipboard:** Ctrl/Cmd+C / X / V, including between boards and browser tabs (objects travel as JSON); pasting plain text creates a text object.
- **History:** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z. Undo only affects *your own* edits, never a collaborator's.
- **Layers:** bring forward / backward / to front / to back.
- **Properties panel:** fill, stroke, stroke width, line style, corner radius, opacity, font, size, bold, italic, alignment. With a drawing tool active it edits the defaults for new objects.
- **Text:** edit sticky notes and text directly on the canvas (double-click, Enter, or just create one).
- **Collaboration:** live cursors with names, presence avatars, remote selection outlines, connection status, shareable board links.
- **Polish:** light / dark / system theme, responsive layout (bottom dock on phones), keyboard-shortcut reference (`?`), empty-state guidance, recent boards.

Press `?` in the app for the full shortcut list.

## Architecture

```
src/
  pages/           HomePage (create / join / recent), BoardPage (session lifecycle)
  components/      Toolbar, PropertiesPanel, TopBar, ZoomControls, Minimap, dialogs, ui/ primitives
  canvas/          Konva rendering and pointer interaction (no application state of its own)
  collaboration/   Yjs document, controller, providers, presence
  store/           Zustand stores (editor UI state, remote presence)
  hooks/           Keyboard shortcuts, clipboard, board actions, routing, theme
  types/           Strict domain types (BoardObject union, presence, ...)
  utils/           Geometry, colors, text measurement, factories, validation
server/            Minimal y-websocket sync server for local development
```

The key rule is a hard split between two kinds of state:

- **Shared state lives in Yjs.** Objects, their positions and styles, deletions, text content and the board title. Nothing else. `BoardController` (`collaboration/boardController.ts`) is the only code that mutates the document; it knows nothing about React, Konva or the network. It publishes an immutable snapshot that React reads through `useSyncExternalStore` (`useBoardObjects`).
- **Local state lives in Zustand.** Active tool, selection, viewport, in-progress drawing, theme, grid, clipboard, and what the UI shows. None of this is synced, except that selection and the cursor are *published* through Yjs awareness so others can see them.

Rendering is separate from both: `canvas/ObjectNode.tsx` is a pure function from a `BoardObject` to Konva nodes; `useCanvasInteractions` turns pointer input into controller calls via `useBoardActions`. UI components call the same `useBoardActions` commands as the keyboard shortcuts, so every action works identically from the toolbar, the keyboard or the panel.

## Collaboration architecture

### Document layout

```
doc.getMap('objects')  Y.Map<id, Y.Map<field, value>>   one entry per object
doc.getMap('meta')     Y.Map                             board title
```

Every object is its **own `Y.Map`**, so concurrent edits to different fields (one person recolors while another drags) merge instead of overwriting. Text content is a **`Y.Text`**, so concurrent typing merges per character. Remote data is validated (`utils/validate.ts`) before it reaches the renderer.

Stacking order is a numeric `z` per object. If two users add objects simultaneously and get equal `z`, ties are broken by id so every client renders the same order.

### Undo / redo

A `Y.UndoManager` tracks only transactions with the local origin, so Ctrl+Z reverts your own last change and never someone else's. Continuous controls (sliders, nudging, typing) are coalesced into single undo steps.

### Providers (transports)

`createCollaboration(roomId, user, providerFactories)` attaches any number of transports to one document. A provider is just a function `({ doc, awareness, roomId }) => handle`. The default stack (`collaboration/config.ts`) is:

1. **IndexedDB** (`y-indexeddb`): boards persist locally and work offline.
2. **BroadcastChannel** (custom, `BroadcastChannelProvider.ts`): syncs tabs of one browser with no server. Same wire framing as y-websocket.
3. **WebSocket** (`y-websocket`): added only when a server URL is configured.

To use another backend (y-webrtc, Hocuspocus, Liveblocks, ...) write a factory in `collaboration/providers.ts` and add it in `getDefaultProviders()`.

### Presence

Yjs **awareness** carries each client's user (name, color), cursor position in world coordinates, and selection. `useCollabBindings` mirrors it into the presence store; the UI renders cursors, avatars and selection outlines from there.

## Running real-time collaboration

**Same browser, multiple tabs:** nothing to configure. `npm run dev`, open a board, duplicate the tab.

**Across devices / people:**

```bash
npm run dev:collab
```

This starts the sync server on `ws://localhost:1234` and Vite configured to use it (`.env.collab` sets `VITE_COLLAB_WS_URL`). Open the app from another device using your machine's LAN address (Vite prints it with `--host`; run `npx vite --mode collab --host` for that), then share the board link from the **Share** dialog. In that dialog and in the top bar you should see **Live** when connected.

Because `localhost` in `VITE_COLLAB_WS_URL` is resolved by each visitor's own browser, for other devices point the app at the server's reachable address instead:

- **Build time:** `VITE_COLLAB_WS_URL=ws://192.168.1.20:1234 npm run build`
- **Per link, no rebuild:** append `?ws=ws://192.168.1.20:1234` to the app URL. The Share dialog preserves this query in the link it generates.

**Production:** run `node server/index.mjs` behind a TLS-terminating proxy and use `wss://`. Environment variables: `PORT` (default 1234), `HOST` (default 0.0.0.0). For durable server-side storage install `y-leveldb` and start with `YPERSISTENCE=./server/data` (this is the standard y-websocket option); otherwise documents live in server memory until it restarts, and clients still keep their own copy in IndexedDB.

## Known limitations

- **Not yet built or run.** This code was produced in an environment that could not reach the npm registry, so it has never been installed, type-checked, built or exercised in a browser. Expect to run `npm install && npm run build && npm test` first. There is no `package-lock.json` for the same reason; `npm install` will generate one.
- **No authentication or access control.** Anyone with a board id and server access can read and edit that board. Board ids are random words plus digits, which is obscurity, not security.
- **No server-side persistence by default** (see above).
- **Link-only routing.** Boards are addressed by hash (`#/board/<id>`); there are no accounts or board listings beyond the "recent" list stored in your browser.
- **Text objects are fixed-width.** Resizing a text box scales its font; there is no auto-width mode.
- **No image import or export** (PNG / SVG / PDF), no connectors that stay attached to shapes, no snapping or alignment guides, no grouping.
- **Large boards:** every object is rendered; there is no viewport culling yet. Boards with many thousands of objects, or very long pen strokes, will slow down.
- **Minimap** is hidden on narrow screens.
- **Concurrent z-order:** reordering while a collaborator also reorders can produce a surprising (but consistent across clients) stacking.
