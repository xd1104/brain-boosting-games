/* ===========================================================
   五子棋（11x11，跟電腦下）
   AI 是純計算，不連網、不花錢
   =========================================================== */
(function () {

  var N = 11;
  var ME = 1, AI = 2;

  var LEVELS = [
    { key: 'l1', name: '隨便下', sub: '入門', coin: 12 },
    { key: 'l2', name: '會擋你', sub: '普通', coin: 25 },
    { key: 'l3', name: '會設陷阱', sub: '高手', coin: 45 }
  ];

  var DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

  var S = null, host = null, bar = null;

  /* ================= 盤面判斷 ================= */

  function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

  /* 從 i 往 dr/dc 兩邊算同色連幾顆、兩端通不通 */
  function line(b, i, dr, dc, color) {
    var r = (i / N) | 0, c = i % N, cnt = 1, open = 0, rr, cc, k;

    rr = r + dr; cc = c + dc; k = 0;
    while (inb(rr, cc) && b[rr * N + cc] === color) { k++; rr += dr; cc += dc; }
    cnt += k;
    if (inb(rr, cc) && b[rr * N + cc] === 0) open++;

    rr = r - dr; cc = c - dc; k = 0;
    while (inb(rr, cc) && b[rr * N + cc] === color) { k++; rr -= dr; cc -= dc; }
    cnt += k;
    if (inb(rr, cc) && b[rr * N + cc] === 0) open++;

    return { cnt: cnt, open: open };
  }

  var TABLE = {
    '5_0': 100000, '5_1': 100000, '5_2': 100000,
    '4_2': 10000, '4_1': 1200, '4_0': 0,
    '3_2': 1000, '3_1': 120, '3_0': 0,
    '2_2': 100, '2_1': 12, '2_0': 0,
    '1_2': 10, '1_1': 2, '1_0': 0
  };

  /* 假設在 i 放一顆 color，這一手值多少 */
  function evalPoint(b, i, color) {
    var s = 0;
    for (var d = 0; d < 4; d++) {
      var L = line(b, i, DIRS[d][0], DIRS[d][1], color);
      var cnt = Math.min(L.cnt, 5);
      s += TABLE[cnt + '_' + L.open] || 0;
    }
    return s;
  }

  function wins(b, i, color) {
    for (var d = 0; d < 4; d++) {
      if (line(b, i, DIRS[d][0], DIRS[d][1], color).cnt >= 5) return true;
    }
    return false;
  }

  function winLine(b, i, color) {
    for (var d = 0; d < 4; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1];
      if (line(b, i, dr, dc, color).cnt < 5) continue;
      var out = [i], r = (i / N) | 0, c = i % N, rr, cc;
      rr = r + dr; cc = c + dc;
      while (inb(rr, cc) && b[rr * N + cc] === color) { out.push(rr * N + cc); rr += dr; cc += dc; }
      rr = r - dr; cc = c - dc;
      while (inb(rr, cc) && b[rr * N + cc] === color) { out.push(rr * N + cc); rr -= dr; cc -= dc; }
      return out;
    }
    return [];
  }

  /* 只考慮已有棋子附近兩格，不然 121 點全算太慢也沒意義 */
  function candidates(b) {
    var out = [], seen = {};
    var any = false;
    for (var i = 0; i < N * N; i++) {
      if (!b[i]) continue;
      any = true;
      var r = (i / N) | 0, c = i % N;
      for (var dr = -2; dr <= 2; dr++) {
        for (var dc = -2; dc <= 2; dc++) {
          var rr = r + dr, cc = c + dc;
          if (!inb(rr, cc)) continue;
          var j = rr * N + cc;
          if (b[j] || seen[j]) continue;
          seen[j] = 1; out.push(j);
        }
      }
    }
    if (!any) out.push(((N / 2) | 0) * N + ((N / 2) | 0));
    return out;
  }

  function ranked(b, me, opp, defense) {
    var cs = candidates(b), out = [];
    for (var q = 0; q < cs.length; q++) {
      var i = cs[q];
      out.push({ i: i, s: evalPoint(b, i, me) + evalPoint(b, i, opp) * defense });
    }
    out.sort(function (a, c) { return c.s - a.s; });
    return out;
  }

  /* ================= AI ================= */

  function aiMove(b, level) {
    /* 自己能贏就直接贏 */
    var cs = candidates(b), i, q;
    for (q = 0; q < cs.length; q++) if (wins2(b, cs[q], AI)) return cs[q];
    /* 對手下一手會贏就一定要擋 */
    for (q = 0; q < cs.length; q++) if (wins2(b, cs[q], ME)) return cs[q];

    if (level === 'l1') {
      /* 隨便下：大多亂下，但對方連成四還是會擋 */
      var r1 = ranked(b, AI, ME, 0.9);
      if (r1[0].s >= 10000) return r1[0].i;
      if (Math.random() < 0.35) return r1[0].i;
      var pool = r1.slice(0, Math.min(10, r1.length));
      return pool[Math.floor(Math.random() * pool.length)].i;
    }

    if (level === 'l2') {
      var r2 = ranked(b, AI, ME, 1.0);
      /* 分數接近的隨機選一個，免得每局都下一樣 */
      var top = r2.filter(function (x) { return x.s >= r2[0].s * 0.92; }).slice(0, 4);
      return top[Math.floor(Math.random() * top.length)].i;
    }

    /* l3：想一步 —— 我下這裡之後，對手最好的回擊有多強？
       這樣才會避開「送對方做活四」，也會主動找雙三 */
    var r3 = ranked(b, AI, ME, 1.0).slice(0, 10);
    var best = null, bestScore = -Infinity;
    for (q = 0; q < r3.length; q++) {
      i = r3[q].i;
      b[i] = AI;
      var mine = evalPoint(b, i, AI);
      var reply = 0, rs = ranked(b, ME, AI, 1.0);
      if (rs.length) reply = rs[0].s;
      b[i] = 0;
      var sc = r3[q].s + mine * 0.3 - reply * 0.9;
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    return best === null ? r3[0].i : best;
  }

  /* 放上去會不會直接連五 */
  function wins2(b, i, color) {
    b[i] = color;
    var w = wins(b, i, color);
    b[i] = 0;
    return w;
  }

  /* ================= 畫面 ================= */

  function el(id) { return host.querySelector('#' + id); }

  function drawBar() {
    bar.innerHTML =
      '<button class="g-mode" id="kMode" aria-label="更改電腦強度"><b>' + S.level.name + '</b><span>' + S.level.sub + '</span></button>' +
      '<button class="iconbtn" id="kNew" style="margin-left:auto" aria-label="新的一局">&#8635;</button>';
    bar.querySelector('#kMode').addEventListener('click', levelSheet);
    bar.querySelector('#kNew').addEventListener('click', askNew);
  }

  function drawLines() {
    var svg = '<svg class="k-lines" viewBox="0 0 ' + N + ' ' + N + '" preserveAspectRatio="none" aria-hidden="true">';
    for (var i = 0; i < N; i++) {
      var p = i + 0.5;
      svg += '<line x1="0.5" y1="' + p + '" x2="' + (N - 0.5) + '" y2="' + p + '" vector-effect="non-scaling-stroke"/>';
      svg += '<line x1="' + p + '" y1="0.5" x2="' + p + '" y2="' + (N - 0.5) + '" vector-effect="non-scaling-stroke"/>';
    }
    var mid = ((N / 2) | 0) + 0.5;
    svg += '<circle cx="' + mid + '" cy="' + mid + '" r="0.14"/>';
    svg += '</svg>';
    return svg;
  }

  function drawCells() {
    var cells = el('kCells');
    cells.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';
    var h = '';
    for (var i = 0; i < N * N; i++) {
      var cls = 'k-cell' + (S.winCells.indexOf(i) > -1 ? ' win' : '');
      var inner = '';
      if (S.b[i]) {
        inner = '<span class="k-stone ' + (S.b[i] === ME ? 'me' : 'ai') +
                (i === S.last ? ' last' : '') + '"></span>';
      } else if (i === S.ghost) {
        inner = '<span class="k-ghost"></span>';
      }
      h += '<button class="' + cls + '" data-i="' + i +
           '" aria-label="第 ' + (((i / N) | 0) + 1) + ' 列 第 ' + ((i % N) + 1) + ' 行">' +
           inner + '</button>';
    }
    cells.innerHTML = h;
  }

  function status(txt, think) {
    var e = el('kStatus');
    if (!e) return;
    e.className = 'k-status' + (think ? ' think' : '');
    e.innerHTML = txt;
  }

  function hint(t) { var e = el('kHint'); if (e) e.textContent = t || ''; }

  function draw() {
    drawBar();
    drawCells();
    el('kUndo').disabled = S.hist.length < 2 || S.over || S.busy;
  }

  /* ---- 放大鏡 ---- */
  function showZoom(i) {
    var z = el('kZoom');
    var r = (i / N) | 0, c = i % N;
    var h = '<div class="zg">';
    for (var dr = -2; dr <= 2; dr++) {
      for (var dc = -2; dc <= 2; dc++) {
        var rr = r + dr, cc = c + dc;
        var s = '';
        if (!inb(rr, cc)) s = '<span class="zs out"></span>';
        else {
          var v = S.b[rr * N + cc];
          if (dr === 0 && dc === 0 && !v) s = '<span class="zs pick"></span>';
          else if (v) s = '<span class="zs ' + (v === ME ? 'me' : 'ai') + '"></span>';
        }
        h += '<div class="zc">' + s + '</div>';
      }
    }
    h += '</div><div class="lb">第 ' + (r + 1) + ' 列 · 第 ' + (c + 1) + ' 行</div>';
    z.innerHTML = h;
    z.className = 'k-zoom ' + (c < N / 2 ? 'right' : 'left');
    z.style.display = '';
  }
  function hideZoom() { var z = el('kZoom'); if (z) z.style.display = 'none'; }

  function cellFromPoint(x, y) {
    var b = el('kBoard').getBoundingClientRect();
    var w = b.width / N;
    var c = Math.floor((x - b.left) / w), r = Math.floor((y - b.top) / w);
    if (!inb(r, c)) return -1;
    return r * N + c;
  }

  /* ================= 下棋 ================= */

  function place(i, color) {
    S.b[i] = color;
    S.hist.push(i);
    S.last = i;
    if (wins(S.b, i, color)) {
      S.over = true;
      S.winner = color;
      S.winCells = winLine(S.b, i, color);
    } else if (S.hist.length >= N * N) {
      S.over = true;
      S.winner = 0;
    }
  }

  function humanMove(i) {
    if (S.over || S.busy || S.b[i]) return;
    place(i, ME);
    S.ghost = -1;
    draw();
    if (S.over) { finish(); return; }

    S.busy = true;
    status('電腦想一下…', true);
    draw();
    setTimeout(function () {
      if (!S) return;
      var m = aiMove(S.b, S.level.key);
      place(m, AI);
      S.busy = false;
      draw();
      if (S.over) { finish(); return; }
      status('換你下');
    }, 260);
  }

  function undo() {
    if (S.busy || S.over || S.hist.length < 2) return;
    for (var k = 0; k < 2; k++) {
      var i = S.hist.pop();
      S.b[i] = 0;
    }
    S.last = S.hist.length ? S.hist[S.hist.length - 1] : -1;
    S.ghost = -1;
    draw();
    status('換你下');
    hint('退回上一步了');
  }

  /* ================= 一局結束 ================= */

  function finish() {
    var lv = S.level;
    var won = S.winner === ME;
    var key = 'kwin.' + lv.key;

    var earned = won ? lv.coin : 4;
    if (won) App.store(key, parseInt(App.store(key) || '0', 10) + 1);
    App.addCoins(earned);

    var ev = { game: 'gomoku', level: lv.key, won: won };
    var r1 = App.report(Object.assign({ type: 'finish' }, ev));
    var r2 = won ? App.report(Object.assign({ type: 'win' }, ev)) : { earned: 0, done: [] };
    S.counted = true;

    var bonus = r1.earned + r2.earned;
    var doneTxt = r1.done.concat(r2.done);

    var idx = LEVELS.indexOf(lv), next = LEVELS[idx + 1];

    status(won ? '你贏了' : (S.winner ? '這局電腦贏了' : '平手'));

    App.openSheet(
      '<div class="k-win">' +
        '<div class="cap">' + lv.name + '（' + lv.sub + '）</div>' +
        '<div class="big' + (won ? ' good' : '') + '">' +
          (won ? '你贏了！' : (S.winner ? '這局電腦贏了' : '平手')) + '</div>' +
        '<div class="earn"><span class="coin"></span>+' + earned + ' 腦力點' + (won ? '' : '（下完就有）') + '</div>' +
        (bonus ? '<div class="earn bonus">挑戰完成：' + doneTxt.join('、') + '　<span class="coin"></span>+' + bonus + '</div>' : '') +
        '<button class="btn-main" data-act="again">再來一局</button>' +
        (won && next ? '<button class="btn-ghost" data-act="up">挑戰「' + next.name + '」</button>' : '') +
        (!won ? '<button class="btn-ghost" data-act="look">看一下這盤棋</button>' : '') +
      '</div>',
      function (b) {
        var a = b.dataset.act;
        if (a === 'look') { App.closeSheet(); hint('這盤留著給你看，按「新的一局」再開始'); S.reviewing = true; return; }
        if (a === 'up' && next) { S.level = next; App.store('klevel', next.key); }
        App.closeSheet();
      },
      function () { if (!S.reviewing) reset(); }
    );
  }

  /* ================= 換局 / 難度 ================= */

  function reset() {
    S.b = new Array(N * N).fill(0);
    S.hist = [];
    S.last = -1;
    S.ghost = -1;
    S.winCells = [];
    S.over = false;
    S.winner = 0;
    S.busy = false;
    S.counted = false;
    S.reviewing = false;
    draw();
    status('換你下 · 你是<b>黑子</b>，先下');
    hint('按住棋盤可以先看清楚，放開才會下');
  }

  function askNew() {
    if (S.hist.length < 2 || S.over) { reset(); return; }
    App.openSheet(
      '<h2>重開一局？<small>這盤已經下了 ' + S.hist.length + ' 手</small></h2>' +
      '<button class="btn-main" data-act="yes">好，重開</button>' +
      '<button class="btn-ghost" data-act="no">繼續下</button>',
      function (b) { App.closeSheet(); if (b.dataset.act === 'yes') reset(); }
    );
  }

  function levelSheet() {
    var h = '<h2>電腦強度<small>贏得了再往上調；換強度會重開一局</small></h2><div class="opts">';
    for (var i = 0; i < LEVELS.length; i++) {
      var l = LEVELS[i];
      var w = App.store('kwin.' + l.key);
      h += '<button class="opt ' + (l.key === S.level.key ? 'on' : '') + '" data-klv="' + l.key + '">' +
             '<span class="nm">' + l.name + '</span>' +
             '<span class="tag">' + l.sub + '</span>' +
             '<span class="best">' + (w ? '贏過 ' + w + ' 次' : '') + '</span>' +
           '</button>';
    }
    h += '</div><button class="btn-main" data-act="ok">好</button>';

    App.openSheet(h, function (b) {
      if (b.dataset.klv) {
        for (var k = 0; k < LEVELS.length; k++) if (LEVELS[k].key === b.dataset.klv) S.level = LEVELS[k];
        App.store('klevel', S.level.key);
        App.closeSheet();
        reset();
        return;
      }
      App.closeSheet();
    });
  }

  /* ================= 掛載 ================= */

  function mount(bodyEl, barEl) {
    host = bodyEl; bar = barEl;

    host.innerHTML =
      '<div class="k-status" id="kStatus"></div>' +
      '<div class="k-wrap">' +
        '<div class="k-board" id="kBoard">' +
          drawLines() +
          '<div class="k-cells" id="kCells"></div>' +
          '<div class="k-zoom" id="kZoom" style="display:none"></div>' +
        '</div>' +
      '</div>' +
      '<div class="k-pad">' +
        '<div class="k-actions">' +
          '<button class="k-act" id="kUndo">悔一步</button>' +
          '<button class="k-act main" id="kRestart">新的一局</button>' +
        '</div>' +
        '<div class="k-hint" id="kHint"></div>' +
      '</div>';

    var lk = App.store('klevel'), lv = LEVELS[0];
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].key === lk) lv = LEVELS[i];

    S = { level: lv, b: [], hist: [], last: -1, ghost: -1, winCells: [],
          over: false, winner: 0, busy: false, counted: false, reviewing: false, pressing: false };

    var board = el('kBoard');

    board.addEventListener('pointerdown', function (e) {
      if (S.over || S.busy) return;
      var i = cellFromPoint(e.clientX, e.clientY);
      if (i < 0) return;
      e.preventDefault();
      S.pressing = true;
      S.ghost = S.b[i] ? -1 : i;
      board.setPointerCapture(e.pointerId);
      drawCells();
      if (!S.b[i]) showZoom(i);
    });

    board.addEventListener('pointermove', function (e) {
      if (!S.pressing) return;
      var i = cellFromPoint(e.clientX, e.clientY);
      if (i < 0 || i === S.ghost) return;
      S.ghost = S.b[i] ? -1 : i;
      drawCells();
      if (!S.b[i]) showZoom(i); else hideZoom();
    });

    function release(e) {
      if (!S.pressing) return;
      S.pressing = false;
      hideZoom();
      var i = S.ghost;
      S.ghost = -1;
      if (i >= 0 && !S.b[i]) humanMove(i);
      else drawCells();
    }
    board.addEventListener('pointerup', release);
    board.addEventListener('pointercancel', function () {
      S.pressing = false; S.ghost = -1; hideZoom(); drawCells();
    });

    /* 鍵盤操作（Enter/空白鍵）走這條，滑鼠/觸控已經由 pointer 事件處理 */
    el('kCells').addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      var b = e.target.closest('.k-cell');
      if (b) humanMove(parseInt(b.dataset.i, 10));
    });

    el('kUndo').addEventListener('click', undo);
    el('kRestart').addEventListener('click', askNew);

    reset();
  }

  function unmount() {
    if (S && S.hist.length >= 4 && !S.counted && !S.over) {
      App.report({ type: 'finish', game: 'gomoku', level: S.level.key, won: false });
      S.counted = true;
    }
    S = null; host = null; bar = null;
  }

  App.register({
    id: 'gomoku',
    name: '五子棋',
    tagline: '連成五顆就贏',
    ready: true,
    mark:
      '<svg viewBox="0 0 52 52" fill="none" aria-hidden="true">' +
      '<path d="M9 9h34M9 20h34M9 31h34M9 42h34M9 9v33M20 9v33M31 9v33M42 9v33" stroke="currentColor" stroke-width="1.6" opacity=".45"/>' +
      '<circle cx="20" cy="20" r="6" fill="currentColor"/>' +
      '<circle cx="31" cy="31" r="6" fill="var(--surface)" stroke="currentColor" stroke-width="2.5"/>' +
      '<circle cx="31" cy="20" r="6" fill="currentColor"/>' +
      '</svg>',
    score: function () {
      for (var i = LEVELS.length - 1; i >= 0; i--) {
        var w = App.store('kwin.' + LEVELS[i].key);
        if (w) return '贏過「' + LEVELS[i].name + '」' + w + ' 次';
      }
      return '';
    },
    mount: mount,
    unmount: unmount
  });
})();
