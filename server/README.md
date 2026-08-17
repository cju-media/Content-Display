# Content Display Control Server

A tiny, dependency-free Node server that lets you edit the `erase_color`
and coffee hour text from any device on the network (phone, laptop, etc.),
so the Max patch can pick the values up over HTTP (e.g. via `[maxurl]`).

No `npm install` needed — it only uses Node's built-in `http` module.

## Run it

```bash
cd server
node server.js
```

Optionally set a custom port:

```bash
PORT=8080 node server.js
```

On startup it prints the URLs to use, e.g.:

```
Content-Display control server running on port 1031
  Local:   http://localhost:1031
  Network: http://192.168.1.42:1031
```

Open the `Network:` URL on your phone or any other device on the same
Wi-Fi/LAN to get the control page.

## Web UI

`http://<host>:1031/` — a mobile-friendly page with:
- A color picker + alpha slider for `erase_color`, with a live preview swatch.
- A text box for the coffee hour message.

Both save independently and persist to `server/data/state.json` on disk,
so values survive a server restart.

## Endpoints for Max (`[maxurl]`)

| Method | Path                  | Returns                                              |
|--------|-----------------------|-------------------------------------------------------|
| GET    | `/max/erase-color`    | Plain text `"r g b a"`, each 0–1, e.g. `0.500000 0.000000 0.000000 1.000000` |
| GET    | `/max/coffee-hour`    | Raw plain text of the coffee hour message              |

Example patch wiring (built by you, since patches aren't edited here):

- `[maxurl http://<host>:1031/max/erase-color @get 1]` → response text →
  `[fromsymbol]` or `[itoa]`/`[atof]` per atom → `[prepend erase_color]` →
  into the `jit.world` erase_color message chain already in the patch.
- `[maxurl http://<host>:1031/max/coffee-hour @get 1]` → response text →
  `[prepend set]` → the coffee hour `textedit`/message object.

Poll these on a `[metro]` (e.g. every 2–5 seconds) or trigger on a `loadbang`
if you only need the value once at startup.

### Posting values from Max back to the server

`[maxurl]`'s `post` message takes **paired** key/value args and sends them as
an `application/x-www-form-urlencoded` body — not JSON:

```
post http://<host>:1031/api/coffee-hour text your text here
post http://<host>:1031/api/erase-color r 0.5 g 0.25 b 0.75 a 1
```

The key names must match the JSON fields below (`text` for coffee hour,
`r`/`g`/`b`/`a` for erase color — any subset is fine). The server accepts
both this form-urlencoded style and raw JSON bodies, so the same endpoints
work for `[maxurl]` and the web UI.

To avoid a feedback loop between the `GET` poll and this `post`: apply
polled values to the local UI with `set`/`settext` (not by driving the
object as if a user changed it), so only real user edits ever trigger a
`post`. Native Max UI objects don't output from a `set` message, so this is
enough on its own.

## JSON API (used internally by the web UI)

| Method | Path                | Body                              | Notes                        |
|--------|---------------------|------------------------------------|-------------------------------|
| GET    | `/api/state`        | —                                   | `{ eraseColor: {r,g,b,a}, coffeeHourText }` |
| POST   | `/api/erase-color`  | `{ "r":0,"g":0,"b":0,"a":1 }` or form-urlencoded `r=0&g=0&b=0&a=1` | Any subset of r/g/b/a |
| POST   | `/api/coffee-hour`  | `{ "text": "..." }` or form-urlencoded `text=...` | |

## Notes

- Values are stored in `server/data/state.json`, which is created
  automatically on first save and is git-ignored.
- The server binds to `0.0.0.0` so it's reachable from any device on the
  same network — there's no authentication, so only run it on a network
  you trust.
