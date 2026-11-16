import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_DIR = path.join(__dirname, 'game');
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

function resolveSafePath(urlPath: string): string | null {
  const cleanUrl = urlPath.split('?')[0].split('#')[0];
  const relPath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
  const fullPath = path.resolve(GAME_DIR, relPath);
  if (!fullPath.startsWith(GAME_DIR + path.sep) && fullPath !== path.join(GAME_DIR, 'index.html')) {
    return null;
  }
  return fullPath;
}

const server = http.createServer((req, res) => {
  const reqUrl = req.url || '/';
  const filePath = resolveSafePath(reqUrl);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let targetPath = filePath;
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(targetPath, 'index.html');
  }

  if (!fs.existsSync(targetPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(targetPath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BLACKSITE: PROTOCOL static server listening at http://localhost:${PORT}`);
});
