/* ===========================================================
   數獨
   出題器保證唯一解；六階難度，從 6x6 入門到 9x9 地獄
   =========================================================== */
(function () {

  var DIFFS = [
    { key: 'e6', name: '入門', sub: '6 格',   n: 6, br: 2, bc: 3, givens: 20, base: 8  },
    { key: 'e9', name: '簡單', sub: '9 格',   n: 9, br: 3, bc: 3, givens: 42, base: 12 },
    { key: 'n9', name: '普通', sub: '9 格',   n: 9, br: 3, bc: 3, givens: 36, base: 18 },
    { key: 'h9', name: '進階', sub: '9 格',   n: 9, br: 3, bc: 3, givens: 32, base: 26 },
    { key: 'x9', name: '困難', sub: '9 格',   n: 9, br: 3, bc: 3, givens: 28, base: 36 },
    { key: 'z9', name: '地獄', sub: '9 格',   n: 9, br: 3, bc: 3, givens: 24, base: 50 }
  ];

  var S = null, host = null, bar = null, ticker = null;

  /* ================= 出題 ================= */

  function shuffled(n) {
    var a = [];
    for (var i = 1; i <= n; i++) a.push(i);
    for (var j = a.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = a[j]; a[j] = a[k]; a[k] = t;
    }
    return a;
  }

  function boxOf(i, d) {
    var r = Math.floor(i / d.n), c = i % d.n;
    return Math.floor(r / d.br) * (d.n / d.bc) + Math.floor(c / d.bc);
  }

  /* 某格能填哪些數字（用 bitmask，快很多） */
  function usedMask(g, i, d) {
    var n = d.n, r = Math.floor(i / n), c = i % n, m = 0, k;
    for (k = 0; k < n; k++) {
      m |= (1 << g[r * n + k]);
      m |= (1 << g[k * n + c]);
    }
    var r0 = Math.floor(r / d.br) * d.br, c0 = Math.floor(c / d.bc) * d.bc;
    for (var rr = 0; rr < d.br; rr++)
      for (var cc = 0; cc < d.bc; cc++)
        m |= (1 << g[(r0 + rr) * n + (c0 + cc)]);
    return m;
  }

  /* 隨機填出一個完整解 */
  function makeFull(d) {
    var n = d.n, g = new Array(n * n).fill(0);
    function go(i) {
      if (i === n * n) return true;
      if (g[i]) return go(i + 1);
      var m = usedMask(g, i, d), order = shuffled(n);
      for (var q = 0; q < n; q++) {
        var v = order[q];
        if (m & (1 << v)) continue;
        g[i] = v;
        if (go(i + 1)) return true;
        g[i] = 0;
      }
      return false;
    }
    go(0);
    return g;
  }

  /* 數解的個數，最多數到 limit 就停 —— 用來確認題目只有一個答案 */
  function countSolutions(g, d, limit) {
    var n = d.n, work = g.slice(), found = 0;

    function go() {
      /* 選候選最少的格子，剪枝效果最好 */
      var best = -1, bestMask = 0, bestCount = 99;
      for (var i = 0; i < n * n; i++) {
        if (work[i]) continue;
        var m = usedMask(work, i, d), c = 0;
        for (var v = 1; v <= n; v++) if (!(m & (1 << v))) c++;
        if (c === 0) return false;
        if (c < bestCount) { bestCount = c; best = i; bestMask = m; if (c === 1) break; }
      }
      if (best === -1) { found++; return found >= limit; }
      for (var w = 1; w <= n; w++) {
        if (bestMask & (1 << w)) continue;
        work[best] = w;
        if (go()) { work[best] = 0; return true; }
        work[best] = 0;
      }
      return false;
    }

    go();
    return found;
  }

  /* 從完整解挖洞，每挖一格都確認答案還是唯一 */
  function dig(full, d) {
    var n = d.n, g = full.slice(), total = n * n;
    var order = [];
    for (var i = 0; i < total; i++) order.push(i);
    for (var j = order.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = order[j]; order[j] = order[k]; order[k] = t;
    }
    var left = total;
    for (var q = 0; q < order.length && left > d.givens; q++) {
      var p = order[q], keep = g[p];
      g[p] = 0;
      if (countSolutions(g, d, 2) !== 1) g[p] = keep;
      else left--;
    }
    return g;
  }

  function makePuzzle(d) {
    var full = makeFull(d);
    return { solution: full, puzzle: dig(full, d) };
  }

  /* ================= 畫面 ================= */

  function el(id) { return host.querySelector('#' + id); }
  function tip(t) { var e = el('sTip'); if (e) e.textContent = t || ''; }

  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function drawBar() {
    bar.innerHTML =
      '<button class="g-mode" id="sMode" aria-label="更改難度"><b>' + S.diff.name + '</b><span>' + S.diff.sub + '</span></button>' +
      '<span class="s-time" id="sTime">0:00</span>' +
      '<button class="iconbtn" id="sNew" style="margin-left:auto" aria-label="換一題">&#8635;</button>';
    bar.querySelector('#sMode').addEventListener('click', function () { diffSheet(); });
    bar.querySelector('#sNew').addEventListener('click', askNew);
  }

  function peers(a, b, d) {
    if (a === b) return false;
    var n = d.n;
    var ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
    return ra === rb || ca === cb || boxOf(a, d) === boxOf(b, d);
  }

  function drawGrid() {
    var d = S.diff, n = d.n, g = el('sGrid');
    g.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    g.style.fontSize = (n === 9 ? 'clamp(17px, 5.2vw, 26px)' : 'clamp(20px, 7vw, 34px)');

    var h = '';
    for (var i = 0; i < n * n; i++) {
      var r = Math.floor(i / n), c = i % n;
      var cls = 's-cell';
      if (S.puzzle[i]) cls += ' given';
      if (i === S.sel) cls += ' sel';
      else if (S.sel > -1 && peers(i, S.sel, d)) cls += ' peer';
      var v = S.puzzle[i] || S.user[i];
      if (S.sel > -1 && v && v === (S.puzzle[S.sel] || S.user[S.sel]) && i !== S.sel) cls += ' same';
      /* 「填錯馬上變紅」關掉時，只有按了「檢查」才會標出來 */
      if ((S.flagOn || S.reveal) && !S.puzzle[i] && S.user[i] && S.user[i] !== S.solution[i]) cls += ' bad';
      if ((c + 1) % d.bc === 0 && c !== n - 1) cls += ' br';
      if ((r + 1) % d.br === 0 && r !== n - 1) cls += ' bb';

      var inner = '';
      if (v) inner = v;
      else if (S.notes[i] && S.notes[i].length) {
        inner = '<span class="s-notes" style="grid-template-columns:repeat(' + (n === 9 ? 3 : 3) + ',1fr)">';
        for (var q = 1; q <= n; q++) inner += '<span>' + (S.notes[i].indexOf(q) > -1 ? q : '') + '</span>';
        inner += '</span>';
      }
      h += '<button class="' + cls + '" data-i="' + i + '">' + inner + '</button>';
    }
    g.innerHTML = h;
  }

  function drawKeys() {
    var n = S.diff.n;
    var k = el('sKeys');
    k.style.gridTemplateColumns = 'repeat(' + (n === 9 ? 5 : 3) + ', 1fr)';
    var h = '';
    for (var v = 1; v <= n; v++) {
      var cnt = 0;
      for (var i = 0; i < n * n; i++) if ((S.puzzle[i] || S.user[i]) === v) cnt++;
      h += '<button class="s-key' + (cnt >= n ? ' done' : '') + '" data-v="' + v + '">' + v + '</button>';
    }
    k.innerHTML = h;

    var note = el('sNote');
    note.className = 's-act' + (S.noteMode ? ' on' : '');
    note.innerHTML = '筆記<span class="st">' + (S.noteMode ? '開' : '關') + '</span>';

    /* 沒有即時提醒時，多給一顆「檢查」，不然填錯了完全沒辦法知道 */
    var acts = el('sActions');
    acts.style.gridTemplateColumns = S.flagOn ? '1fr 1fr' : '1fr 1fr 1fr';
    el('sCheck').style.display = S.flagOn ? 'none' : '';
  }

  function draw() { drawBar(); drawGrid(); drawKeys(); }

  /* ================= 操作 ================= */

  function put(v) {
    var i = S.sel;
    if (i < 0) { tip('先點一個空格'); return; }
    if (S.puzzle[i]) { tip('這格是題目給的，不能改'); return; }

    S.reveal = false;

    if (S.noteMode && v) {
      var arr = S.notes[i] || (S.notes[i] = []);
      var at = arr.indexOf(v);
      if (at > -1) arr.splice(at, 1); else arr.push(v);
      S.user[i] = 0;
      draw();
      return;
    }

    if (!v) { S.user[i] = 0; S.notes[i] = []; draw(); tip(''); return; }

    S.user[i] = v;
    S.notes[i] = [];
    if (v !== S.solution[i]) {
      S.mistakes++;
      tip(S.flagOn ? '這格不對，再想想' : '');
    } else tip('');
    draw();
    checkWin();
  }

  /* 目前填錯的格數 */
  function wrongCount() {
    var n = S.diff.n, w = 0;
    for (var i = 0; i < n * n; i++) if (!S.puzzle[i] && S.user[i] && S.user[i] !== S.solution[i]) w++;
    return w;
  }

  function checkWin() {
    var n = S.diff.n, empty = 0;
    for (var i = 0; i < n * n; i++) if (!(S.puzzle[i] || S.user[i])) empty++;
    if (empty) return;

    var wrong = wrongCount();
    if (wrong) {
      /* 填滿了但有錯 —— 沒開即時提醒的話要講一聲，不然會一直卡著 */
      if (!S.flagOn) tip('填滿了，但有 ' + wrong + ' 格不對，按「檢查」看是哪幾格');
      return;
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
      var e = el('sTime');
      if (e) e.textContent = fmt(S.elapsed);
    }, 500);
  }
  function stopClock() { if (ticker) { clearInterval(ticker); ticker = null; } }

  /* ================= 一局結束 ================= */

  function win() {
    var d = S.diff;
    var secs = Math.floor(S.elapsed / 1000);
    var bk = 'sbest.' + d.key;
    var old = parseInt(App.store(bk) || '0', 10);
    var isBest = !old || secs < old;
    if (isBest) App.store(bk, secs);

    var clean = S.mistakes === 0 ? Math.round(d.base * 0.4) : 0;
    var brave = S.flagOn ? 0 : Math.round(d.base * 0.4);   /* 關掉即時提醒比較難，多給 */
    var earned = d.base + clean + brave;
    App.addCoins(earned);

    var ev = { game: 'sudoku', mistakes: S.mistakes, secs: secs, level: d.key };
    var r1 = App.report(Object.assign({ type: 'finish' }, ev));
    var r2 = App.report(Object.assign({ type: 'win' }, ev));
    S.counted = true;

    var bonus = r1.earned + r2.earned;
    var doneTxt = r1.done.concat(r2.done);

    var idx = DIFFS.indexOf(d), next = DIFFS[idx + 1];

    App.openSheet(
      '<div class="s-win">' +
        '<div class="cap">完成！花了</div>' +
        '<div class="big">' + fmt(S.elapsed) + '</div>' +
        '<div class="steps">' +
          (S.mistakes === 0 ? '全程沒填錯' : '填錯 ' + S.mistakes + ' 次') +
          (S.checks ? ' · 檢查 ' + S.checks + ' 次' : '') +
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
          if (DIFFS[k + 1]) { S.diff = DIFFS[k + 1]; App.store('sdiff', S.diff.key); }
        }
        App.closeSheet();
      },
      function () { fresh(); }
    );
  }

  /* ================= 換題 / 難度 ================= */

  function fresh() {
    S.done = true;            /* 出題時先鎖住輸入 */
    stopClock();
    el('sWrap').innerHTML = '<div class="s-loading">出題中…</div>';
    bar.innerHTML = '';
    /* 讓「出題中」先畫出來，再做比較花時間的運算 */
    setTimeout(function () {
      if (!S) return;
      var made = makePuzzle(S.diff);
      var n = S.diff.n;
      S.solution = made.solution;
      S.puzzle = made.puzzle;
      S.user = new Array(n * n).fill(0);
      S.notes = new Array(n * n);
      S.sel = -1;
      S.mistakes = 0;
      S.checks = 0;
      S.reveal = false;
      S.elapsed = 0;
      S.counted = false;
      S.done = false;
      el('sWrap').innerHTML = '<div class="s-grid" id="sGrid"></div>';
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
      '<h2>換一題新的？<small>這題已經填了 ' + filled + ' 格，換掉就沒了</small></h2>' +
      '<button class="btn-main" data-act="yes">好，換新的</button>' +
      '<button class="btn-ghost" data-act="no">繼續解</button>',
      function (b) { App.closeSheet(); if (b.dataset.act === 'yes') fresh(); }
    );
  }

  function diffSheet() {
    var h = '<h2>難度<small>從入門開始，順了再往上；每一題都保證只有一個答案</small></h2><div class="opts">';
    for (var i = 0; i < DIFFS.length; i++) {
      var d = DIFFS[i];
      var best = App.store('sbest.' + d.key);
      h += '<button class="opt ' + (d.key === S.diff.key ? 'on' : '') + '" data-sdiff="' + d.key + '">' +
             '<span class="nm">' + d.name + '</span>' +
             '<span class="tag">' + (d.n === 6 ? '6×6' : '9×9') + ' · 給 ' + d.givens + ' 格</span>' +
             '<span class="best">' + (best ? '最快 ' + fmt(best * 1000) : '') + '</span>' +
           '</button>';
    }
    h += '</div>' +
      '<button class="toggle ' + (S.flagOn ? 'on' : '') + '" data-act="flag">' +
        '<span class="lb">填錯馬上變紅' +
          '<small>' + (S.flagOn ? '填錯的格子會立刻標紅色' : '自己找錯，多給四成腦力點；可以按「檢查」') + '</small>' +
        '</span><span class="sw"></span>' +
      '</button>' +
      '<button class="btn-main" data-act="ok">好</button>';

    App.openSheet(h, function (b) {
      if (b.dataset.sdiff) {
        for (var k = 0; k < DIFFS.length; k++) if (DIFFS[k].key === b.dataset.sdiff) S.diff = DIFFS[k];
        App.store('sdiff', S.diff.key);
        App.closeSheet();
        fresh();
        return;
      }
      if (b.dataset.act === 'flag') {
        S.flagOn = !S.flagOn;
        App.store('sflag', S.flagOn ? '1' : '0');
        S.reveal = false;
        draw();
        tip('');
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
      '<div class="s-wrap" id="sWrap"><div class="s-grid" id="sGrid"></div></div>' +
      '<div class="s-pad">' +
        '<div class="s-keys" id="sKeys"></div>' +
        '<div class="s-actions" id="sActions">' +
          '<button class="s-act" id="sNote">筆記<span class="st">關</span></button>' +
          '<button class="s-act" id="sClear">清除這格</button>' +
          '<button class="s-act" id="sCheck" style="display:none">檢查</button>' +
        '</div>' +
        '<div class="s-tip" id="sTip"></div>' +
      '</div>';

    var dk = App.store('sdiff'), d = DIFFS[0];
    for (var i = 0; i < DIFFS.length; i++) if (DIFFS[i].key === dk) d = DIFFS[i];

    S = { diff: d, solution: [], puzzle: [], user: [], notes: [], sel: -1,
          noteMode: false, mistakes: 0, checks: 0, reveal: false,
          flagOn: App.store('sflag') !== '0',
          elapsed: 0, t0: 0, counted: false, done: true };

    el('sWrap').addEventListener('click', function (e) {
      var c = e.target.closest('.s-cell');
      if (!c || S.done) return;
      S.sel = parseInt(c.dataset.i, 10);
      drawGrid();
    });

    el('sKeys').addEventListener('click', function (e) {
      var b = e.target.closest('.s-key');
      if (!b || S.done) return;
      put(parseInt(b.dataset.v, 10));
    });

    el('sNote').addEventListener('click', function () {
      if (S.done) return;
      S.noteMode = !S.noteMode;
      drawKeys();
      tip(S.noteMode ? '筆記模式：填的是小字，不會算錯' : '');
    });

    el('sClear').addEventListener('click', function () {
      if (S.done) return;
      put(0);
    });

    el('sCheck').addEventListener('click', function () {
      if (S.done) return;
      var w = wrongCount();
      S.checks++;
      S.reveal = true;
      drawGrid();
      tip(w ? '有 ' + w + ' 格不對，標紅色的那幾格' : '目前填的都是對的');
    });

    fresh();
  }

  function unmount() {
    stopClock();
    if (S && !S.counted && !S.done) {
      var filled = 0;
      for (var i = 0; i < S.user.length; i++) if (S.user[i]) filled++;
      if (filled) {
        App.report({ type: 'finish', game: 'sudoku', mistakes: S.mistakes, secs: Math.floor(S.elapsed / 1000), level: S.diff.key });
        S.counted = true;
      }
    }
    S = null; host = null; bar = null;
  }

  App.register({
    id: 'sudoku',
    name: '數獨',
    tagline: '把九宮格填滿，不能重複',
    ready: true,
    mark:
      '<svg viewBox="0 0 52 52" fill="none" aria-hidden="true">' +
      '<rect x="2.5" y="2.5" width="47" height="47" rx="7" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M18.3 3v46M33.7 3v46M3 18.3h46M3 33.7h46" stroke="currentColor" stroke-width="1.6" opacity=".45"/>' +
      '<text x="10.4" y="15.6" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="currentColor">5</text>' +
      '<text x="41.6" y="15.6" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="currentColor">3</text>' +
      '<text x="26" y="31" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="currentColor">7</text>' +
      '<text x="10.4" y="46.4" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="currentColor">1</text>' +
      '</svg>',
    score: function () {
      for (var i = DIFFS.length - 1; i >= 0; i--) {
        var b = App.store('sbest.' + DIFFS[i].key);
        if (b) return DIFFS[i].name + '最快 ' + fmt(b * 1000);
      }
      return '';
    },
    mount: mount,
    unmount: unmount
  });
})();
