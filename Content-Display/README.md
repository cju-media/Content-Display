# Content Display

A Max/MSP video playback and signage system for the Mayflower community —
plays back scheduled video reels (events, weddings, sizzle, ads), overlays a
live "Coffee Hour" text announcement, and streams the output over the
network via NDI and RTMP.

## Features

- **Multi-reel playback** — separate content folders for Events, Wedding,
  Sizzle, and Ad reels, each loaded by drag-and-drop or an "Open Folder"
  shortcut.
- **Scheduled ad playback** — the Ad reel turns on automatically on a
  schedule (e.g. Sunday 12–2).
- **Coffee Hour text overlay** — an on/off toggle plus live styling
  controls (font, text color, font size, line length, X/Y position) for an
  announcement banner over the video.
- **Background/erase color control** — adjustable `erase_color` (RGBA) on
  the `jit.world` render contexts, used for keying/compositing.
- **Network outputs** — live video out over NDI
  ([`jit.ndi.send~`](https://github.com/pixsper/jit.ndi)) and RTMP
  ([`jit.rtmp.send~` + a built-in `jit.rtmp.server`](https://github.com/cju-media/jit.rtmp))
  for downstream streaming or recording.
- **Persistent state** — current folder paths, erase color, and Coffee Hour
  text are stored in `data/` and restored on launch.
- **Standalone app** — the patch is packaged and distributed as a
  standalone macOS app ("Content Display.app").
- **Remote control server** *(new)* — a small web page, reachable from any
  device on the network, for editing the erase color and Coffee Hour text
  remotely. The patch polls the values over HTTP via `[maxurl]`. See
  [server/README.md](server/README.md) for full details.

## Project structure

```
Content-Display/
├── Content-Display.maxproj       # Max project file
├── patchers/
│   ├── Content-Display-main.maxpat   # top-level patch
│   ├── changeMessage.maxpat
│   └── sendToAppDirectory.maxpat
├── code/                          # JS objects used inside the patch
├── data/                          # persisted state (paths, erase color, CH text)
├── externals/                     # bundled third-party Max externals
│   ├── jit.gl.syphonserver.mxo
│   ├── jit.ndi.send~.mxo
│   ├── jit.rtmp.send~.mxo
│   ├── jit.rtmp.server.mxo
│   └── shell.mxo
└── server/                        # Node remote-control server
    ├── server.js
    ├── public/index.html
    └── README.md
```

## Requirements

- Max 9 (patch was authored/saved with Max 9.1.2).
- The bundled externals in `externals/` (already included — no separate
  install needed).
- Node.js 18+ if you want to run the remote control server.

## Opening the project

Open `Content-Display.maxproj` in Max; it will load
`patchers/Content-Display-main.maxpat` as the top-level patch along with the
supporting patchers, code, and externals listed above.

## Remote control server

The `server/` folder holds a small, dependency-free Node server (built-in
`http` module only — no `npm install` needed) that lets you edit the erase
color and Coffee Hour text from any browser on the local network, for the
Max patch to pick up via `[maxurl]`.

```bash
cd server
node server.js
```

By default it listens on port `1031` (override with `PORT=<n> node
server.js`). On startup it prints the network URL to open on another
device, e.g. `http://192.168.1.42:1031`.

See [server/README.md](server/README.md) for the full endpoint reference
(including the plain-text `/max/...` endpoints for `[maxurl]` GETs, the
form-urlencoded `POST` format `[maxurl]` expects, and how to avoid a
feedback loop between polling and posting from the patch).
