/* ===========================================================
   數織（Nonogram）
   出題保證「只靠推理就解得出來」—— 不用猜，猜錯不是玩家的錯
   =========================================================== */
(function () {

  /* 難度不是一味放大盤面 —— 格子小到點不準就違反這個 App 的原則了。
     10×10 之後改用「圖案越稀疏、越要推理」來加難度，格子維持看得到、點得到。 */
  var DIFFS = [
    { key: 'a5',  name: '入門', n: 5,  density: 0.58, base: 8,  hint: '格子最大' },
    { key: 'b8',  name: '簡單', n: 8,  density: 0.55, base: 14, hint: '' },
    { key: 'c10', name: '普通', n: 10, density: 0.52, base: 22, hint: '' },
    { key: 'd10', name: '進階', n: 10, density: 0.42, base: 32, hint: '圖案較散' },
    { key: 'e10', name: '困難', n: 10, density: 0.34, base: 45, hint: '很散，要慢慢推' }
  ];

  var S = null, host = null, bar = null, ticker = null;

  /* ================= 出題 ================= */

  /* 一條線的提示：連續塗格的長度 */
  function cluesOf(line) {
    var out = [], run = 0;
    for (var i = 0; i < line.length; i++) {
      if (line[i]) run++;
      else if (run) { out.push(run); run = 0; }
    }
    if (run) out.push(run);
    return out.length ? out : [0];
  }

  /* 給提示和目前已知狀態，列出所有排法的交集。
     cells: 0=未知 1=塗 2=空。回傳新的 cells，或 null 表示無解 */
  function solveLine(clues, cells) {
    var n = cells.length;
    var fillCount = new Array(n).fill(0);
    var emptyCount = new Array(n).fill(0);
    var total = 0;

    if (clues.length === 1 && clues[0] === 0) {
      for (var z = 0; z < n; z++) { if (cells[z] === 1) return null; }
      return cells.map(function () { return 2; });
    }

    var arrange = new Array(n);

    function place(ci, pos) {
      if (total > 40000) return;                 /* 保險絲 */
      if (ci === clues.length) {
        for (var k = pos; k < n; k++) {
          if (cells[k] === 1) return;
          arrange[k] = 2;
        }
        total++;
        for (var q = 0; q < n; q++) {
          if (arrange[q] === 1) fillCount[q]++; else emptyCount[q]++;
        }
        return;
      }
      var len = clues[ci];
      for (var start = pos; start + len <= n; start++) {
        var ok = true, j;
        for (j = pos; j < start; j++) { if (cells[j] === 1) { ok = false; break; } }
        if (!ok) break;                          /* 跳過了必須塗的格子，再往後也不行 */
        for (j = start; j < start + len; j++) { if (cells[j] === 2) { ok = false; break; } }
        if (!ok) continue;
        var after = start + len;
        if (after < n && cells[after] === 1) continue;   /* 後面要留一格空 */

        for (j = pos; j < start; j++) arrange[j] = 2;
        for (j = start; j < after; j++) arrange[j] = 1;
        if (after < n) arrange[after] = 2;
        place(ci + 1, after < n ? after + 1 : n);
      }
    }

    place(0, 0);
    if (!total) return null;

    var out = cells.slice();
    for (var i = 0; i < n; i++) {
      if (fillCount[i] === total) out[i] = 1;
      else if (emptyCount[i] === total) out[i] = 2;
    }
    return out;
  }

  /* 只用逐行逐列推理去解。解得完 = 這題不用猜 */
  function logicSolve(rowClues, colClues, n) {
    var g = new Array(n * n).fill(0);
    var changed = true, guard = 0;

    while (changed && guard++ < 60) {
      changed = false;

      for (var r = 0; r < n; r++) {
        var row = [];
        for (var c = 0; c < n; c++) row.push(g[r * n + c]);
        var nr = solveLine(rowClues[r], row);
        if (!nr) return null;
        for (c = 0; c < n; c++) {
          if (nr[c] !== g[r * n + c]) { g[r * n + c] = nr[c]; changed = true; }
        }
      }

      for (var cc = 0; cc < n; cc++) {
        var col = [];
        for (var rr = 0; rr < n; rr++) col.push(g[rr * n + cc]);
        var nc = solveLine(colClues[cc], col);
        if (!nc) return null;
        for (rr = 0; rr < n; rr++) {
          if (nc[rr] !== g[rr * n + cc]) { g[rr * n + cc] = nc[rr]; changed = true; }
        }
      }
    }

    for (var i = 0; i < n * n; i++) if (g[i] === 0) return null;   /* 有格子推不出來 */
    return g;
  }

  function makePuzzle(d) {
    var n = d.n;
    /* 越稀疏的圖越難生出「不用猜」的題目，所以要多試幾次。
       一次約 1ms，200 次也還在瞬間的範圍。 */
    for (var attempt = 0; attempt < 200; attempt++) {
      var sol = [];
      for (var i = 0; i < n * n; i++) sol.push(Math.random() < d.density ? 1 : 0);

      var rowClues = [], colClues = [], r, c, line;
      for (r = 0; r < n; r++) {
        line = [];
        for (c = 0; c < n; c++) line.push(sol[r * n + c]);
        rowClues.push(cluesOf(line));
      }
      for (c = 0; c < n; c++) {
        line = [];
        for (r = 0; r < n; r++) line.push(sol[r * n + c]);
        colClues.push(cluesOf(line));
      }

      var solved = logicSolve(rowClues, colClues, n);
      if (!solved) continue;

      /* 推理解出來的必須跟原圖一樣（不一樣代表原圖不是唯一解） */
      var same = true;
      for (i = 0; i < n * n; i++) {
        if ((solved[i] === 1 ? 1 : 0) !== sol[i]) { same = false; break; }
      }
      if (same) return { sol: sol, rowClues: rowClues, colClues: colClues };
    }
    return null;
  }

  /* ================= 畫面 ================= */

  function el(id) { return host.querySelector('#' + id); }
  function tip(t) { var e = el('nTip'); if (e) e.textContent = t || ''; }

  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function drawBar() {
    bar.innerHTML =
      '<button class="g-mode" id="nMode" aria-label="更改難度"><b>' + S.diff.name + '</b><span>' + S.diff.n + '×' + S.diff.n + '</span></button>' +
      '<span class="s-time" id="nTime">0:00</span>' +
      '<button class="iconbtn" id="nNew" style="margin-left:auto" aria-label="換一題">&#8635;</button>';
    bar.querySelector('#nMode').addEventListener('click', diffSheet);
    bar.querySelector('#nNew').addEventListener('click', askNew);
  }

  /* 這一行/列是不是已經完成了（提示可以變灰） */
  function lineDone(idx, isRow) {
    var n = S.diff.n, line = [], k;
    for (k = 0; k < n; k++) line.push(S.user[isRow ? idx * n + k : k * n + idx] === 1 ? 1 : 0);
    var want = isRow ? S.rowClues[idx] : S.colClues[idx];
    var got = cluesOf(line);
    if (want.length !== got.length) return false;
    for (k = 0; k < want.length; k++) if (want[k] !== got[k]) return false;
    return true;
  }

  function drawGrid() {
    var d = S.diff, n = d.n;
    var maxRow = 1, maxCol = 1, i;
    for (i = 0; i < n; i++) {
      if (S.rowClues[i].length > maxRow) maxRow = S.rowClues[i].length;
      if (S.colClues[i].length > maxCol) maxCol = S.colClues[i].length;
    }

    var g = el('nGrid');
    /* 提示欄比格子窄一點，把空間讓給可以點的格子 */
    g.style.gridTemplateColumns = 'repeat(' + maxRow + ', 0.62fr) repeat(' + n + ', 1fr)';
    g.style.gridTemplateRows = 'repeat(' + maxCol + ', 0.62fr) repeat(' + n + ', 1fr)';

    var h = '', r, c, k;

    /* 左上角空白 + 上方直排提示 */
    for (r = 0; r < maxCol; r++) {
      for (c = 0; c < maxRow; c++) h += '<div class="n-corner"></div>';
      for (c = 0; c < n; c++) {
        var cl = S.colClues[c];
        var off = maxCol - cl.length;
        var v = (r >= off && cl[r - off] !== 0) ? cl[r - off] : '';
        h += '<div class="n-clue' + (lineDone(c, false) ? ' done' : '') + '">' + v + '</div>';
      }
    }

    /* 每一列：左邊橫排提示 + 格子 */
    for (r = 0; r < n; r++) {
      var rl = S.rowClues[r], roff = maxRow - rl.length;
      for (c = 0; c < maxRow; c++) {
        var rv = (c >= roff && rl[c - roff] !== 0) ? rl[c - roff] : '';
        h += '<div class="n-clue' + (lineDone(r, true) ? ' done' : '') + '">' + rv + '</div>';
      }
      for (c = 0; c < n; c++) {
        k = r * n + c;
        var cls = 'n-cell';
        var v2 = S.user[k];
        if (v2 === 1) cls += (S.flagOn || S.reveal) && !S.sol[k] ? ' bad' : ' fill';
        else if (v2 === 2) cls += ' cross';
        if (c % 5 === 0) cls += ' b5l';
        if (r % 5 === 0) cls += ' b5t';
        if (c === n - 1) cls += ' edgeR';
        if (r === n - 1) cls += ' edgeB';
        h += '<button class="' + cls + '" data-k="' + k + '"></button>';
      }
    }
    g.innerHTML = h;

    /* 提示字級跟著實際格子大小走 —— 寫死 vw 會在小螢幕上縮到看不見 */
    var cell = g.querySelector('.n-cell');
    if (cell) {
      var w = cell.getBoundingClientRect().width;
      if (w) g.style.fontSize = Math.max(11, Math.round(w * 0.52)) + 'px';
    }
  }

  function drawModes() {
    el('nFill').className = 'n-mode' + (S.mode === 1 ? ' on' : '');
    el('nCross').className = 'n-mode' + (S.mode === 2 ? ' on' : '');
    el('nCheck').style.display = S.flagOn ? 'none' : '';
    el('nActions').style.gridTemplateColumns = S.flagOn ? '1fr' : '1fr 1fr';
  }

  function draw() { drawBar(); drawGrid(); drawModes(); }

  /* ================= 操作 ================= */

  function toggle(k) {
    if (S.done) return;
    S.reveal = false;
    var want = S.mode;
    S.user[k] = (S.user[k] === want) ? 0 : want;
    if (want === 1 && S.user[k] === 1 && !S.sol[k]) {
      S.mistakes++;
      tip(S.flagOn ? '這格不該塗，再看看提示' : '');
    } else tip('');
    drawGrid();
    checkWin();
  }

  function wrongCount() {
    var w = 0;
    for (var i = 0; i < S.user.length; i++) if (S.user[i] === 1 && !S.sol[i]) w++;
    return w;
  }

  function checkWin() {
    for (var i = 0; i < S.sol.length; i++) {
      if (S.sol[i] && S.user[i] !== 1) return;
      if (!S.sol[i] && S.user[i] === 1) return;
    }
    S.done = true;
    stopClock();
    win();
  }

  function startClock() {
    stopClock();
    S.t0 = Date.now() - S.elapsed;
    ticker = setInterval(function () {
      if (!S || S.done) return;
      S.elapsed = Date.now() - S.t0;
      var e = el('nTime');
      if (e) e.textContent = fmt(S.elapsed);
    }, 500);
  }
  function stopClock() { if (ticker) { clearInterval(ticker); ticker = null; } }

  /* ================= 一局結束 ================= */

  function win() {
    var d = S.diff;
    var secs = Math.floor(S.elapsed / 1000);
    var bk = 'nbest.' + d.key;
    var old = parseInt(App.store(bk) || '0', 10);
    var isBest = !old || secs < old;
    if (isBest) App.store(bk, secs);

    var clean = S.mistakes === 0 ? Math.round(d.base * 0.4) : 0;
    var brave = S.flagOn ? 0 : Math.round(d.base * 0.4);
    var earned = d.base + clean + brave;
    App.addCoins(earned);

    var ev = { game: 'nonogram', mistakes: S.mistakes, secs: secs, level: d.key };
    var r1 = App.report(Object.assign({ type: 'finish' }, ev));
    var r2 = App.report(Object.assign({ type: 'win' }, ev));
    S.counted = true;

    var bonus = r1.earned + r2.earned;
    var doneTxt = r1.done.concat(r2.done);

    /* 把解出來的圖單獨秀一次 */
    var n = d.n, pic = '<div class="n-pic" style="grid-template-columns:repeat(' + n + ',1fr)">';
    for (var i = 0; i < n * n; i++) pic += '<i class="' + (S.sol[i] ? 'on' : '') + '"></i>';
    pic += '</div>';

    var idx = DIFFS.indexOf(d), next = DIFFS[idx + 1];

    App.openSheet(
      '<div class="n-win">' +
        pic +
        '<div class="cap">完成！花了</div>' +
        '<div class="big">' + fmt(S.elapsed) + '</div>' +
        '<div class="steps">' +
          (S.mistakes === 0 ? '全程沒塗錯' : '塗錯 ' + S.mistakes + ' 次') +
          (isBest ? ' · 這個難度最快紀錄！' : (old ? ' · 最快 ' + fmt(old * 1000) : '')) +
        '</div>' +
        '<div class="earn"><span class="coin"></span>+' + earned + ' 腦力點' +
          (clean && brave ? '（全對＋自己找錯加成）' : clean ? '（含全對加成）' : brave ? '（含自己找錯加成）' : '') +
        '</div>' +
        (bonus ? '<div class="earn bonus">挑戰完成：' + doneTxt.join('、') + '　<span class="coin"></span>+' + bonus + '</div>' : '') +
        '<button class="btn-main" data-act="again">再來一題</button>' +
        (next ? '<button class="btn-ghost" data-act="up">試試看「' + next.name + '」</button>' : '') +
      '</div>',
      function (b) {
        if (b.dataset.act === 'up') {
          var k = DIFFS.indexOf(S.diff);
          if (DIFFS[k + 1]) { S.diff = DIFFS[k + 1]; App.store('ndiff', S.diff.key); }
        }
        App.closeSheet();
      },
      function () { fresh(); }
    );
  }

  /* ================= 換題 / 難度 ================= */

  function fresh() {
    S.done = true;
    stopClock();
    el('nWrap').innerHTML = '<div class="n-loading">出題中…</div>';
    bar.innerHTML = '';
    setTimeout(function () {
      if (!S) return;
      var made = makePuzzle(S.diff);
      /* 極少數情況出不出來：先原難度再試一輪，真的不行才放寬密度
         （放寬等於偷偷降難度，所以擺在最後） */
      if (!made) made = makePuzzle(S.diff);
      if (!made) made = makePuzzle({ n: S.diff.n, density: S.diff.density + 0.08 });
      if (!made) { el('nWrap').innerHTML = '<div class="n-loading">出題失敗，請按右上角再試一次</div>'; drawBar(); return; }
      var n = S.diff.n;
      S.sol = made.sol;
      S.rowClues = made.rowClues;
      S.colClues = made.colClues;
      S.user = new Array(n * n).fill(0);
      S.mistakes = 0;
      S.reveal = false;
      S.elapsed = 0;
      S.counted = false;
      S.done = false;
      el('nWrap').innerHTML = '<div class="n-grid" id="nGrid"></div>';
      draw();
      tip('');
      startClock();
    }, 30);
  }

  function askNew() {
    var filled = 0;
    for (var i = 0; i < S.user.length; i++) if (S.user[i]) filled++;
    if (!filled || S.done) { fresh(); return; }
    App.openSheet(
      '<h2>換一題新的？<small>這題已經動了 ' + filled + ' 格，換掉就沒了</small></h2>' +
      '<button class="btn-main" data-act="yes">好，換新的</button>' +
      '<button class="btn-ghost" data-act="no">繼續解</button>',
      function (b) { App.closeSheet(); if (b.dataset.act === 'yes') fresh(); }
    );
  }

  function diffSheet() {
    var h = '<h2>難度<small>每一題都保證只靠推理解得出來，不用猜</small></h2><div class="opts">';
    for (var i = 0; i < DIFFS.length; i++) {
      var d = DIFFS[i];
      var best = App.store('nbest.' + d.key);
      h += '<button class="opt ' + (d.key === S.diff.key ? 'on' : '') + '" data-ndiff="' + d.key + '">' +
             '<span class="nm">' + d.name + '</span>' +
             '<span class="tag">' + d.n + '×' + d.n + (d.hint ? ' · ' + d.hint : '') + '</span>' +
             '<span class="best">' + (best ? '最快 ' + fmt(best * 1000) : '') + '</span>' +
           '</button>';
    }
    h += '</div>' +
      '<button class="toggle ' + (S.flagOn ? 'on' : '') + '" data-act="flag">' +
        '<span class="lb">塗錯馬上變紅' +
          '<small>' + (S.flagOn ? '塗到不該塗的格子會立刻變紅' : '自己找錯，多給四成腦力點；可以按「檢查」') + '</small>' +
        '</span><span class="sw"></span>' +
      '</button>' +
      '<button class="btn-main" data-act="ok">好</button>';

    App.openSheet(h, function (b) {
      if (b.dataset.ndiff) {
        for (var k = 0; k < DIFFS.length; k++) if (DIFFS[k].key === b.dataset.ndiff) S.diff = DIFFS[k];
        App.store('ndiff', S.diff.key);
        App.closeSheet();
        fresh();
        return;
      }
      if (b.dataset.act === 'flag') {
        S.flagOn = !S.flagOn;
        App.store('nflag', S.flagOn ? '1' : '0');
        S.reveal = false;
        draw();
        diffSheet();
        return;
      }
      App.closeSheet();
    });
  }

  /* ================= 掛載 ================= */

  function mount(bodyEl, barEl) {
    host = bodyEl; bar = barEl;

    host.innerHTML =
      '<div class="n-wrap" id="nWrap"><div class="n-grid" id="nGrid"></div></div>' +
      '<div class="n-pad">' +
        '<div class="n-modes">' +
          '<button class="n-mode on" id="nFill"><span class="n-swatch f"></span>塗滿</button>' +
          '<button class="n-mode" id="nCross"><span class="n-swatch x"></span>打叉</button>' +
        '</div>' +
        '<div class="n-actions" id="nActions">' +
          '<button class="n-act" id="nClear">全部清掉</button>' +
          '<button class="n-act" id="nCheck" style="display:none">檢查</button>' +
        '</div>' +
        '<div class="n-tip" id="nTip"></div>' +
      '</div>';

    var dk = App.store('ndiff'), d = DIFFS[0];
    for (var i = 0; i < DIFFS.length; i++) if (DIFFS[i].key === dk) d = DIFFS[i];

    S = { diff: d, sol: [], rowClues: [], colClues: [], user: [],
          mode: 1, mistakes: 0, reveal: false,
          flagOn: App.store('nflag') !== '0',
          elapsed: 0, t0: 0, counted: false, done: true };

    el('nWrap').addEventListener('click', function (e) {
      var c = e.target.closest('.n-cell');
      if (c) toggle(parseInt(c.dataset.k, 10));
    });

    el('nFill').addEventListener('click', function () { S.mode = 1; drawModes(); tip(''); });
    el('nCross').addEventListener('click', function () { S.mode = 2; drawModes(); tip('打叉是給自己做記號用的，不算答案'); });

    el('nClear').addEventListener('click', function () {
      if (S.done) return;
      var any = false;
      for (var i = 0; i < S.user.length; i++) if (S.user[i]) any = true;
      if (!any) return;
      App.openSheet(
        '<h2>把這題塗的全部清掉？<small>題目不換，只是重新開始塗</small></h2>' +
        '<button class="btn-main" data-act="yes">好，清掉</button>' +
        '<button class="btn-ghost" data-act="no">不要</button>',
        function (b) {
          App.closeSheet();
          if (b.dataset.act === 'yes') {
            S.user = new Array(S.diff.n * S.diff.n).fill(0);
            S.reveal = false;
            drawGrid(); tip('');
          }
        }
      );
    });

    el('nCheck').addEventListener('click', function () {
      if (S.done) return;
      var w = wrongCount();
      S.checks = (S.checks || 0) + 1;
      S.reveal = true;
      drawGrid();
      tip(w ? '有 ' + w + ' 格塗錯了，紅色那幾格' : '目前塗的都是對的');
    });

    fresh();
  }

  function unmount() {
    stopClock();
    if (S && !S.counted && !S.done) {
      var filled = 0;
      for (var i = 0; i < S.user.length; i++) if (S.user[i]) filled++;
      if (filled) {
        App.report({ type: 'finish', game: 'nonogram', mistakes: S.mistakes, secs: Math.floor(S.elapsed / 1000), level: S.diff.key });
        S.counted = true;
      }
    }
    S = null; host = null; bar = null;
  }

  App.register({
    id: 'nonogram',
    name: '數織',
    tagline: '照數字塗格子，塗完出現一張圖',
    ready: true,
    mark:
      '<svg viewBox="0 0 52 52" fill="none" aria-hidden="true">' +
      '<rect x="15.5" y="15.5" width="35" height="35" rx="4" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M27 16v35M38.5 16v35M16 27h35M16 38.5h35" stroke="currentColor" stroke-width="1.4" opacity=".4"/>' +
      '<rect x="16" y="16" width="11" height="11" fill="currentColor"/>' +
      '<rect x="38.5" y="27.5" width="11" height="11" fill="currentColor"/>' +
      '<rect x="27.5" y="39" width="11" height="11" fill="currentColor"/>' +
      '<text x="7" y="24" font-size="10" font-weight="700" font-family="monospace" fill="currentColor">3</text>' +
      '<text x="7" y="36" font-size="10" font-weight="700" font-family="monospace" fill="currentColor">1</text>' +
      '<text x="20" y="11" font-size="10" font-weight="700" font-family="monospace" fill="currentColor">2</text>' +
      '</svg>',
    score: function () {
      for (var i = DIFFS.length - 1; i >= 0; i--) {
        var b = App.store('nbest.' + DIFFS[i].key);
        if (b) return DIFFS[i].name + '最快 ' + fmt(b * 1000);
      }
      return '';
    },
    mount: mount,
    unmount: unmount
  });
})();
