const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.webmanifest':'application/manifest+json', '.png':'image/png', '.jpg':'image/jpeg', '.ttf':'font/ttf', '.woff2':'font/woff2'};
function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/Ewam\//, '/');
    const file = path.resolve(root, '.' + (relative.endsWith('/') ? relative + 'index.html' : relative));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.setHeader('Content-Type', (types[path.extname(file)] || 'text/plain') + (['.html','.js','.css'].includes(path.extname(file)) ? '; charset=utf-8' : ''));
    res.end(fs.readFileSync(file));
  });
}
module.exports = {createServer};
if (require.main === module) createServer().listen(4173, '127.0.0.1', () => console.log('Ewam preview: http://127.0.0.1:4173/Ewam/'));
