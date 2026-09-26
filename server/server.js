#!/usr/bin/env node
'use strict';

/**
 * Content-Display remote control server.
 *
 * Serves a small mobile-friendly web page for editing:
 *   - erase_color (RGBA, 0-1 floats, used by jit.world @erase_color)
 *   - coffee hour text
 *
 * ...and exposes plain-text endpoints meant to be polled by the Max patch
 * via [maxurl] (or any other HTTP-capable Max object).
 *
 * Zero npm dependencies — only Node's built-in `http` module — so there's
 * nothing to `npm install` before running it on a new machine.
 *
 * Usage:
 *   node server.js            # listens on 0.0.0.0:3000 (or $PORT)
 *   PORT=8080 node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT, 10) || 1031;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const DEFAULT_STATE = {
  eraseColor: { r: 0, g: 0, b: 0, a: 0 },
  coffeeHourText: 'Join Us for Coffee Hour in Mayflower Courtyard',
};

// ---------------------------------------------------------------------------
// State persistence (flat JSON file, rewritten atomically on every change)
// ---------------------------------------------------------------------------

function loadState() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      eraseColor: {
        r: clamp01(parsed?.eraseColor?.r),
        g: clamp01(parsed?.eraseColor?.g),
        b: clamp01(parsed?.eraseColor?.b),
        a: clamp01(parsed?.eraseColor?.a),
      },
      coffeeHourText:
        typeof parsed?.coffeeHourText === 'string'
          ? parsed.coffeeHourText
          : DEFAULT_STATE.coffeeHourText,
    };
  } catch (err) {
    return { ...DEFAULT_STATE, eraseColor: { ...DEFAULT_STATE.eraseColor } };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function clamp01(n) {
  n = Number(n);
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

let state = loadState();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Connection': 'close',
  });
  res.end(payload);
}

// `Connection: close` matters here more than it would for a browser client:
// simple/embedded HTTP clients (e.g. Max's [maxurl]) can mishandle a reused
// keep-alive socket when polled faster than the round trip, occasionally
// reading a stale or partial buffer from the previous request. Forcing the
// server to close after every response means each poll gets a fresh
// connection, so there's nothing to misread.
function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Connection': 'close',
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Accepts both JSON bodies (used by the web UI) and
// application/x-www-form-urlencoded bodies (what Max's [maxurl] object sends
// for its `post url key1 val1 key2 val2 ...` message). Content-Type from
// maxurl isn't guaranteed, so this tries JSON first and falls back to
// form-urlencoded parsing rather than trusting the header alone.
function parseBody(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const params = new URLSearchParams(trimmed);
    const obj = {};
    for (const [key, value] of params) obj[key] = value;
    return obj;
  }
}

// Space-separated floats, formatted the way Max message boxes usually show
// them (e.g. "0.500000 0.000000 0.000000 1.000000"), suitable for a
// [maxurl] -> [route] -> [prepend erase_color] chain.
function eraseColorToMaxText(c) {
  return [c.r, c.g, c.b, c.a].map((n) => n.toFixed(6)).join(' ');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
    });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // ---- JSON API (used by the web UI) ------------------------------
    if (pathname === '/api/state' && req.method === 'GET') {
      sendJSON(res, 200, state);
      return;
    }

    if (pathname === '/api/erase-color' && req.method === 'POST') {
      const body = parseBody(await readBody(req));
      state.eraseColor = {
        r: clamp01(body.r ?? state.eraseColor.r),
        g: clamp01(body.g ?? state.eraseColor.g),
        b: clamp01(body.b ?? state.eraseColor.b),
        a: clamp01(body.a ?? state.eraseColor.a),
      };
      saveState(state);
      sendJSON(res, 200, state);
      return;
    }

    if (pathname === '/api/coffee-hour' && req.method === 'POST') {
      const body = parseBody(await readBody(req));
      if (typeof body.text === 'string') {
        state.coffeeHourText = body.text;
        saveState(state);
      }
      sendJSON(res, 200, state);
      return;
    }

    // ---- Plain-text endpoints for Max ([maxurl] etc.) ----------------
    if (pathname === '/max/erase-color' && req.method === 'GET') {
      sendText(res, 200, eraseColorToMaxText(state.eraseColor));
      return;
    }

    if (pathname === '/max/coffee-hour' && req.method === 'GET') {
      sendText(res, 200, state.coffeeHourText);
      return;
    }

    if (pathname === '/health') {
      sendText(res, 200, 'ok');
      return;
    }

    // ---- Static UI -----------------------------------------------------
    if (req.method === 'GET') {
      serveStatic(req, res, pathname);
      return;
    }

    sendText(res, 405, 'Method not allowed');
  } catch (err) {
    sendJSON(res, 400, { error: err.message });
  }
});

function localAddresses() {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  return addrs;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Content-Display control server running on port ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const addr of localAddresses()) {
    console.log(`  Network: http://${addr}:${PORT}`);
  }
  console.log('\nEndpoints for Max ([maxurl] etc.):');
  console.log(`  GET http://<host>:${PORT}/max/erase-color   -> "r g b a" (0-1 floats)`);
  console.log(`  GET http://<host>:${PORT}/max/coffee-hour    -> raw text`);
});
