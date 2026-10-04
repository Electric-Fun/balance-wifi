// Local preview server for `npm start`. Serves the wifi/ folder the way GitHub Pages does:
// "/" and "/connected/" serve their index.html, and "/terms" serves terms.html.
// No dependencies. Stop it with Ctrl-C.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = path.join(__dirname, 'wifi');
const PORT = 8788;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

// Turn a request path into a file inside wifi/, or null if there is none.
function resolve(urlPath) {
  const file = path.join(ROOT, path.normalize(decodeURIComponent(urlPath)));
  if (!file.startsWith(ROOT)) return null;                      // never serve outside wifi/
  const candidates = [file, file + '.html', path.join(file, 'index.html')];
  return candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) || null;
}

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const asDir = path.join(ROOT, path.normalize(decodeURIComponent(urlPath)));

  // "/connected" -> "/connected/", so relative links inside the page keep working
  if (!urlPath.endsWith('/') && asDir.startsWith(ROOT) && fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
    res.writeHead(301, { Location: urlPath + '/' });
    return res.end();
  }

  const file = resolve(urlPath);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',                                 // always show the latest edit
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('Preview running at ' + url + '  (Ctrl-C to stop)');
  if (!process.env.NO_OPEN) exec('open ' + url);
});
