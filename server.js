/* 開發用：index.html 每次請求都重新 build，改完存檔重整就看得到；
   圖示、manifest 這些靜態檔直接從專案根目錄送出（跟 GitHub Pages 一樣） */
const http = require('http');
const build = require('./build');
const fs = require('fs');
const path = require('path');

const PORT = 4173;
const ROOT = __dirname;

const TYPES = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);

  if (rel !== '/' && rel !== '/index.html') {
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(fs.readFileSync(file));
    return;
  }

  try {
    build();
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('build failed:\n' + e.stack);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(path.join(ROOT, 'index.html')));
}).listen(PORT, () => console.log('http://localhost:' + PORT));
