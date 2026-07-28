/* 開發用：每次請求都重新 build 一次，改完存檔重整就看得到 */
const http = require('http');
const build = require('./build');
const fs = require('fs');
const path = require('path');

const PORT = 4173;

http.createServer((req, res) => {
  try {
    build();
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('build failed:\n' + e.stack);
    return;
  }
  const html = fs.readFileSync(path.join(__dirname, 'index.html'));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
}).listen(PORT, () => console.log('http://localhost:' + PORT));
