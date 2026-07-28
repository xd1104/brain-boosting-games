/* 把 src/ 底下的東西合成一個 index.html（放在根目錄，GitHub Pages 直接吃）
   目的：爸媽只要一個連結、一個主畫面圖示 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'index.html');

const CSS = [
  'styles.css',
  'games/guess.css',
  'games/sudoku.css',
  'games/nonogram.css',
  'games/gomoku.css'
];

/* 登記的順序 = 大廳卡片的順序 */
const JS = [
  'app.js',
  'games/sudoku.js',
  'games/nonogram.js',
  'games/gomoku.js',
  'games/guess.js'
];

function read(p) { return fs.readFileSync(path.join(SRC, p), 'utf8'); }

function build() {
  const css = CSS.map(f => '/* === ' + f + ' === */\n' + read(f)).join('\n\n');
  const js = JS.map(f => '/* === ' + f + ' === */\n' + read(f)).join('\n\n')
    + '\n\nApp.boot();\n';

  const out = read('template.html')
    .replace('/*==STYLES==*/', () => '\n' + css + '\n')
    .replace('/*==SCRIPTS==*/', () => '\n' + js + '\n');

  fs.writeFileSync(OUT, out, 'utf8');
  return out.length;
}

module.exports = build;

if (require.main === module) {
  console.log('built index.html (' + build() + ' bytes)');
}
