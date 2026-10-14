# Collaborative Whiteboard

**An infinite canvas for ideas, drawn together in real time.**

Sketch, diagram and brainstorm with anyone, on any device, with nothing to sign up for.

[Quick Start](#quick-start) · [Features](#features) · [Architecture](#architecture) · [Collaboration](#real-time-collaboration) · [Roadmap](#roadmap)

---

## Overview

Collaborative Whiteboard is a fast, elegant, infinite whiteboard built for working together. Draw shapes, arrows and freehand strokes, drop in text and sticky notes, and watch collaborators' cursors move across the same board live.

It is offline-first: boards are stored in your browser, sync instantly between tabs with no server at all, and scale up to multi-device collaboration with a single command.

| | |
| :--- | :--- |
| **Expressive** | Nine tools, rich styling, infinite pan and zoom |
| **Collaborative** | Live cursors, presence, remote selections |
| **Resilient** | Conflict-free merging with Yjs; works offline |
| **Fluent** | Full keyboard shortcuts, touch and trackpad gestures |
| **Refined** | Light, dark and system themes; responsive down to phones |

---

## Quick Start

Requires Node.js 18.18 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
```

Open the app, choose **New board**, then open the same board URL in a second tab. Edits and cursors sync immediately, with no server required.

> **Status:** this code was written without network access, so `npm install`, `npm run build` and the tests have not yet been run. Run `npm install && npm run build && npm test` first; any TypeScript errors will be small and local to the file they name.

---

## Features

### Canvas
- Infinite pan and zoom: mouse wheel, trackpad pinch, touch pinch, Space-drag, hand tool
- Minimap, fit-to-screen, and dot / line / no-grid backgrounds

### Tools
Select, Hand, Rectangle, Ellipse, Line, Arrow, Pen, Text, Sticky note

### Editing
- Click or Shift-click to select, marquee select for groups
- Move, resize and rotate with handles; endpoint handles for lines and arrows
- Arrow-key nudging, duplicate, delete, and layer ordering (forward, backward, front, back)

### Style
- Fill, stroke, stroke width, line style, corner radius, opacity
- Typography: font, size, bold, italic, alignment
- With a drawing tool active, the panel edits the defaults for new objects

### Clipboard and History
- Ctrl/Cmd+C, X and V, including between boards and browser tabs; pasted plain text becomes a text object
- Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. Undo affects only your own edits, never a collaborator's

### Collaboration
- Live named cursors, presence avatars, remote selection outlines
- Connection status and shareable board links

Press `?` in the app for the complete shortcut reference.

---

## Tech Stack

| Concern | Choice |
| :--- | :--- |
| Build and dev server | Vite 7 |
| Interface | React 19, TypeScript (strict) |
| Canvas | Konva via react-konva |
| Editor state | Zustand |
| Shared state | Yjs, y-websocket, y-indexeddb, y-protocols |
| Styling | Tailwind CSS 4 |
| Accessible primitives | Radix UI |
| Icons | Lucide React |
| Tests | Vitest |

---

## Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Dev server; boards sync between tabs of the same browser |
| `npm run dev:collab` | Sync server and Vite together, for multi-device collaboration |
| `npm run server` | Sync server only (`ws://localhost:1234`) |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm test` | Unit tests: controller, undo, ordering, Yjs merging |

---

## Architecture

```
src/
├── pages/            Home (create / join / recent) and Board (session lifecycle)
├── components/       Toolbar, properties panel, top bar, zoom, minimap, dialogs, ui/
├── canvas/           Konva rendering and pointer interaction
├── collaboration/    Yjs document, controller, providers, presence
├── store/            Zustand stores (editor UI state, remote presence)
├── hooks/            Shortcuts, clipboard, board actions, routing, theme
├── types/            Strict domain types (BoardObject union, presence, ...)
└── utils/            Geometry, colors, text measurement, factories, validation
server/               Minimal y-websocket sync server for development
```

### One rule: two kinds of state

| Shared (Yjs) | Local (Zustand) |
| :--- | :--- |
| Objects, positions, styles, deletions, text content, board title | Active tool, selection, viewport, in-progress drawing, theme, grid, clipboard |
| Merged across every collaborator | Never synced (selection and cursor are published through awareness) |

- **BoardController** is the only code that mutates the document. It knows nothing about React, Konva or the network, and publishes an immutable snapshot that React reads via `useSyncExternalStore`.
- **ObjectNode** is a pure function from a `BoardObject` to Konva nodes.
- **useBoardActions** is the single command layer, so every action behaves identically from the toolbar, the keyboard or the panel.

---

## Real-Time Collaboration

### Document layout

```
doc.getMap('objects')   Y.Map<id, Y.Map<field, value>>   one entry per object
doc.getMap('meta')      Y.Map                            board title
```

- Every object is its own `Y.Map`, so one person recoloring while another drags merges instead of overwriting.
- Text is a `Y.Text`, so concurrent typing merges per character.
- Stacking uses a numeric `z`; ties break by id so every client renders the same order.
- Remote data is validated before it reaches the renderer.
- A `Y.UndoManager` tracks only local-origin transactions; sliders, nudging and typing coalesce into single undo steps.

### Transports

Providers are pluggable: `({ doc, awareness, roomId }) => handle`.

| Layer | Role |
| :--- | :--- |
| IndexedDB | Local persistence and offline use |
| BroadcastChannel | Server-free sync across tabs of one browser |
| WebSocket | Cross-device sync, enabled when a server URL is configured |

Want y-webrtc, Hocuspocus or Liveblocks? Add a factory in `collaboration/providers.ts` and register it in `getDefaultProviders()`.

### Running it

**Same browser:** nothing to configure. Run `npm run dev` and duplicate the tab.

**Across devices:**

```bash
npm run dev:collab
npx vite --mode collab --host   # expose Vite on your LAN
```

Then share the link from the Share dialog; you should see **Live** when connected. Because `localhost` is resolved by each visitor's own browser, point other devices at the server's reachable address:

```bash
# At build time
VITE_COLLAB_WS_URL=ws://192.168.1.20:1234 npm run build

# Or per link, with no rebuild: append this to the app URL
?ws=ws://192.168.1.20:1234
```

**Production:** run `node server/index.mjs` behind a TLS-terminating proxy and use `wss://`.

| Variable | Default | Meaning |
| :--- | :--- | :--- |
| `PORT` | `1234` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `YPERSISTENCE` | unset | Directory for durable storage (requires `y-leveldb`) |

---

## Roadmap

- [ ] PNG / SVG / PDF export and image import
- [ ] Connectors that stay attached to shapes
- [ ] Snapping, alignment guides and grouping
- [ ] Viewport culling for very large boards
- [ ] Auto-width text boxes
- [ ] Authentication and access control
- [ ] Durable server-side persistence by default

## Known Limitations

- Never installed, built or run in a browser yet; there is no `package-lock.json` until your first `npm install`.
- No authentication: anyone with a board id and server access can edit that board. Ids are obscure, not secret.
- Text boxes are fixed-width; resizing scales the font.
- Every object is rendered, so boards with many thousands of objects or very long strokes will slow down.
- The minimap is hidden on narrow screens.
- Concurrent z-order changes can stack surprisingly, though consistently across clients.
