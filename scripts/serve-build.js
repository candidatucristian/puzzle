import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BUILD_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const MOUNT_PATH = '/puzzle/';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf', '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

function isInside(root, candidate) {
  const path = relative(root, candidate);
  return !isAbsolute(path) && path !== '..' && !path.startsWith('../') && !path.startsWith('..\\');
}

function reject(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

/** A deliberately strict static host: missing assets never fall back to HTML. */
async function createBuildServer(directory = BUILD_DIRECTORY) {
  const root = await realpath(directory);
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      reject(response, 405, 'Method not allowed');
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(request.url.split(/[?#]/, 1)[0]); }
    catch { reject(response, 400, 'Invalid path'); return; }
    if (pathname === '/' || pathname === '/puzzle') {
      response.writeHead(302, { Location: MOUNT_PATH }); response.end(); return;
    }
    if (!pathname.startsWith(MOUNT_PATH)) { reject(response, 404, 'Not found'); return; }
    const parts = pathname.slice(MOUNT_PATH.length).split('/');
    if (parts.some(part => part === '..' || /[\0\\:]/.test(part))) {
      reject(response, 403, 'Forbidden path'); return;
    }
    let candidate = resolve(root, parts.join('/') || 'index.html');
    if (!isInside(root, candidate)) { reject(response, 403, 'Forbidden path'); return; }
    try {
      candidate = await realpath(candidate);
      if (!isInside(root, candidate)) { reject(response, 403, 'Forbidden path'); return; }
      const info = await stat(candidate);
      if (!info.isFile()) { reject(response, 404, 'Not found'); return; }
      const headers = {
        'Content-Type': MIME[extname(candidate).toLowerCase()] || 'application/octet-stream',
        'Content-Length': info.size, 'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      };
      let start = 0, end = info.size - 1, status = 200;
      if (request.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (range && (range[1] || range[2])) {
          start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
          end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
        }
        if (!range || !(range[1] || range[2]) || !Number.isSafeInteger(start) ||
            !Number.isSafeInteger(end) || start < 0 || end < start || start >= info.size) {
          response.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
          response.end(); return;
        }
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
        headers['Content-Length'] = end - start + 1;
      }
      response.writeHead(status, headers);
      if (request.method === 'HEAD' || info.size === 0) { response.end(); return; }
      const stream = createReadStream(candidate, { start, end });
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') reject(response, 404, 'Not found');
      else { console.error('Build host could not serve a file:', error); reject(response, 500, 'Server error'); }
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const server = await createBuildServer();
  server.listen(4173, '127.0.0.1', () => console.log('Production build: http://127.0.0.1:4173/puzzle/'));
}
