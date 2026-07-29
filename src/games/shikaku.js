/* ===========================================================
   切方塊（Shikaku）
   把整張格子切成一塊塊長方形，每塊剛好包住一個數字，
   數字＝那塊有幾格。出題保證只有一種切法。
   =========================================================== */
(function () {

  var DIFFS = [
    { key: 'a', name: '入門', W: 5,  maxA: 6,  base: 8  },
    { key: 'b', name: '簡單', W: 7,  maxA: 8,  base: 14 },
    { key: 'c', name: '普通', W: 8,  maxA: 9,  base: 22 },
    { key: 'd', name: '進階', W: 10, maxA: 10, base: 32 },
    { key: 'e', name: '困難', W: 12, maxA: 12, base: 46 }
  ];

  var S = null, host = null, bar = null, ticker = null;

  /* ================= 出題 ================= */

  /* 把一塊長方形亂切成小塊，切出來的本身就是一組合法答案 */
  function carve(x, y, w, h, maxA, out) {
    var area = w * h;
    /* 停下來的機率調高，塊才會大一點。太容易停＝滿盤細碎小塊，
       數字多、看起來嚇人，推理反而變無聊 */
    if (area <= maxA && (area <= 2 || Math.random() < 0.68)) { out.push([x, y, w, h]); return; }
    if (w < 2 && h < 2) { out.push([x, y, w, h]); return; }

    var vertical;
    if (w < 2) vertical = false;
    else if (h < 2) vertical = true;
    else vertical = (w > h) ? true : (h > w ? false : Math.random() < 0.5);

    if (vertical) {
      var cx = 1 + Math.floor(Math.random() * (w - 1));
      carve(x, y, cx, h, maxA, out);
      carve(x + cx, y, w - cx, h, maxA, out);
    } else {
      var cy = 1 + Math.floor(Math.random() * (h - 1));
      carve(x, y, w, cy, maxA, out);
      carve(x, y + cy, w, h - cy, maxA, out);
    }
  }

  /* 某個數字可以圈出哪些長方形：面積要對、要蓋住自己、不能蓋到別的數字 */
  function optionsFor(W, clues, ci) {
    var c = clues[ci], v = c.v, out = [];
    for (var w = 1; w <= v; w++) {
      if (v % w) continue;
      var h = v / w;
      if (w > W || h > W) continue;
      for (var x = Math.max(0, c.x - w + 1); x <= Math.min(c.x, W - w); x++) {
        for (var y = Math.max(0, c.y - h + 1); y <= Math.min(c.y, W - h); y++) {
          var ok = true;
          for (var k = 0; k < clues.length && ok; k++) {
            if (k === ci) continue;
            if (clues[k].x >= x && clues[k].x < x + w && clues[k].y >= y && clues[k].y < y + h) ok = false;
          }
          if (ok) out.push([x, y, w, h]);
        }
      }
    }
    return out;
  }

  /* 數這題有幾種切法，最多數到 limit */
  function countSolutions(W, clues, limit) {
    var opts = [];
    for (var i = 0; i < clues.length; i++) {
      opts.push(optionsFor(W, clues, i));
      if (!opts[i].length) return 0;
    }
    var used = new Array(W * W).fill(false);
    var taken = new Array(clues.length).fill(false);
    var found = 0, nodes = 0, aborted = false;

    function fits(r) {
      for (var yy = r[1]; yy < r[1] + r[3]; yy++)
        for (var xx = r[0]; xx < r[0] + r[2]; xx++)
          if (used[yy * W + xx]) return false;
      return true;
    }
    function mark(r, v) {
      for (var yy = r[1]; yy < r[1] + r[3]; yy++)
        for (var xx = r[0]; xx < r[0] + r[2]; xx++) used[yy * W + xx] = v;
    }

    function go(done) {
      if (nodes++ > 300000) { aborted = true; return true; }
      if (done === clues.length) { found++; return found >= limit; }

      /* 選「可放位置最少」的那個數字先處理，剪枝最有效 */
      var best = -1, bestList = null, bestN = 1e9;
      for (var i = 0; i < clues.length; i++) {
        if (taken[i]) continue;
        var list = [];
        for (var q = 0; q < opts[i].length; q++) if (fits(opts[i][q])) list.push(opts[i][q]);
        if (list.length < bestN) { bestN = list.length; best = i; bestList = list; }
        if (bestN === 0) break;
      }
      if (bestN === 0) return false;

      taken[best] = true;
      for (var t = 0; t < bestList.length; t++) {
        mark(bestList[t], true);
        if (go(done + 1)) { mark(bestList[t], false); taken[best] = false; return true; }
        mark(bestList[t], false);
      }
      taken[best] = false;
      return false;
    }

    go(0);
    return aborted ? 99 : found;
  }

  function makePuzzle(d) {
    var W = d.W;
    for (var attempt = 0; attempt < 150; attempt++) {
      var rects = [];
      carve(0, 0, W, W, d.maxA, rects);
      if (rects.length < 3) continue;

      var clues = [];
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        clues.push({
          x: r[0] + Math.floor(Math.random() * r[2]),
          y: r[1] + Math.floor(Math.random() * r[3]),
          v: r[2] * r[3]
        });
      }
      if (countSolutions(W, clues, 2) === 1) return { W: W, clues: clues };
    }
    return null;
  }

  /* ================= 畫面 ================= */

  function el(id) { return host.querySelector('#' + id); }
  function tip(t, good) {
    var e = el('qTip');
    if (!e) return;
    e.className = 'q-tip' + (good ? ' good' : '');
    e.textContent = t || '';
  }
  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function drawBar() {
    bar.innerHTML =
      '<button class="g-mode" id="qMode" aria-label="更改難度"><b>' + S.diff.name + '</b><span>' + S.W + '×' + S.W + '</span></button>' +
      '<span class="s-time" id="qTime">0:00</span>' +
      '<button class="iconbtn" id="qNew" style="margin-left:auto" aria-label="換一題">&#8635;</button>';
    bar.querySelector('#qMode').addEventListener('click', diffSheet);
    bar.querySelector('#qNew').addEventListener('click', askNew);
  }

  /* 這塊圈得對不對：剛好一個數字，而且數字＝格數 */
  function rectOk(r) {
    var n = 0, v = 0;
    for (var i = 0; i < S.clues.length; i++) {
      var c = S.clues[i];
      if (c.x >= r[0] && c.x < r[0] + r[2] && c.y >= r[1] && c.y < r[1] + r[3]) { n++; v = c.v; }
    }
    return n === 1 && v === r[2] * r[3];
  }

  function cellOwner() {
    var W = S.W, own = new Array(W * W).fill(-1);
    for (var i = 0; i < S.rects.length; i++) {
      var r = S.rects[i];
      for (var y = r[1]; y < r[1] + r[3]; y++)
        for (var x = r[0]; x < r[0] + r[2]; x++) own[y * W + x] = i;
    }
    return own;
  }

  function drawGrid() {
    var W = S.W, g = el('qGrid');
    g.style.gridTemplateColumns = 'repeat(' + W + ', 1fr)';

    var own = cellOwner();
    var clueAt = {};
    for (var i = 0; i < S.clues.length; i++) clueAt[S.clues[i].y * W + S.clues[i].x] = S.clues[i].v;

    var okCache = S.rects.map(rectOk);

    /* 拖曳中就先標出擋路的舊塊，放手前就知道圈不成，不會白圈 */
    var clash = {}, clashing = false;
    if (S.drag) {
      var list = hits(S.drag);
      for (var q = 0; q < list.length; q++) clash[list[q]] = 1;
      clashing = list.length > 0;
    }

    var h = '';
    for (var p = 0; p < W * W; p++) {
      var x = p % W, y = Math.floor(p / W);
      var o = own[p];
      var cls = 'q-cell';
      if (o >= 0 && clash[o]) cls += ' clash';
      if (o >= 0) {
        cls += okCache[o] ? ' t' + (o % 4) : ' bad';
        if (y === 0 || own[(y - 1) * W + x] !== o) cls += ' eT';
        if (y === W - 1 || own[(y + 1) * W + x] !== o) cls += ' eB';
        if (x === 0 || own[y * W + (x - 1)] !== o) cls += ' eL';
        if (x === W - 1 || own[y * W + (x + 1)] !== o) cls += ' eR';
      }
      if (S.drag && x >= S.drag[0] && x < S.drag[0] + S.drag[2] && y >= S.drag[1] && y < S.drag[1] + S.drag[3]) {
        cls += clashing ? ' drag no' : ' drag';
      }
      var inner = clueAt[p] !== undefined ? '<span class="num">' + clueAt[p] + '</span>' : '';
      h += '<button class="' + cls + '" data-p="' + p + '">' + inner + '</button>';
    }
    g.innerHTML = h;

    /* 數字大小跟著實際格子走 —— 寫死公式在 12×12 會縮到 11px 看不清 */
    var cell = g.querySelector('.q-cell');
    if (cell) {
      var w = cell.getBoundingClientRect().width;
      if (w) g.style.fontSize = Math.max(12, Math.round(w * 0.5)) + 'px';
    }
  }

  /* 拖曳中只改 class，不重建 DOM。
     重建會把手指正按著的那個元素砍掉，真實觸控會因此收到 pointercancel、
     整個拖曳被中斷 —— 用滑鼠或程式模擬都測不出來，只有真手指會中。 */
  function paintDrag() {
    var g = el('qGrid');
    if (!g) return;
    var W = S.W, own = cellOwner();
    var clash = {}, clashing = false;
    if (S.drag) {
      var list = hits(S.drag);
      for (var q = 0; q < list.length; q++) clash[list[q]] = 1;
      clashing = list.length > 0;
    }
    var kids = g.children;
    for (var p = 0; p < kids.length; p++) {
      var x = p % W, y = Math.floor(p / W);
      var inDrag = !!(S.drag && x >= S.drag[0] && x < S.drag[0] + S.drag[2] &&
                      y >= S.drag[1] && y < S.drag[1] + S.drag[3]);
      var c = kids[p];
      c.classList.toggle('drag', inDrag);
      c.classList.toggle('no', inDrag && clashing);
      c.classList.toggle('clash', own[p] >= 0 && !!clash[own[p]]);
    }
  }

  function draw() { drawBar(); drawGrid(); }

  /* ================= 操作 ================= */

  function hits(r) {
    var out = [];
    for (var i = 0; i < S.rects.length; i++) {
      var o = S.rects[i];
      var overlap = !(o[0] >= r[0] + r[2] || r[0] >= o[0] + o[2] || o[1] >= r[1] + r[3] || r[1] >= o[1] + o[3]);
      if (overlap) out.push(i);
    }
    return out;
  }

  /* 重疊就不給圈，而不是把舊的吃掉。
     手指滑過別塊就讓人家辛苦圈好的消失，對長輩太兇了 —— 寧可多點一下拆掉 */
  function addRect(r) {
    if (hits(r).length) return false;
    S.rects.push(r);
    S.moves++;
    return true;
  }

  function removeAt(p) {
    var own = cellOwner();
    var o = own[p];
    if (o < 0) return false;
    S.rects.splice(o, 1);
    S.moves++;
    return true;
  }

  function checkWin() {
    var own = cellOwner();
    for (var i = 0; i < own.length; i++) if (own[i] < 0) return;
    for (var k = 0; k < S.rects.length; k++) if (!rectOk(S.rects[k])) return;
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
      var e = el('qTime');
      if (e) e.textContent = fmt(S.elapsed);
    }, 500);
  }
  function stopClock() { if (ticker) { clearInterval(ticker); ticker = null; } }

  /* ================= 一局結束 ================= */

  function win() {
    var d = S.diff;
    var secs = Math.floor(S.elapsed / 1000);
    var bk = 'qbest.' + d.key;
    var old = parseInt(App.store(bk) || '0', 10);
    var isBest = !old || secs < old;
    if (isBest) App.store(bk, secs);

    var earned = d.base;
    App.addCoins(earned);

    var ev = { game: 'shikaku', secs: secs, level: d.key, mistakes: 0 };
    var r1 = App.report(Object.assign({ type: 'finish' }, ev));
    var r2 = App.report(Object.assign({ type: 'win' }, ev));
    S.counted = true;

    var bonus = r1.earned + r2.earned;
    var doneTxt = r1.done.concat(r2.done);
    var idx = DIFFS.indexOf(d), next = DIFFS[idx + 1];

    App.openSheet(
      '<div class="q-win">' +
        '<div class="cap">切完了！花了</div>' +
        '<div class="big">' + fmt(S.elapsed) + '</div>' +
        '<div class="steps">' + S.clues.length + ' 塊' +
          (isBest ? ' · 這個難度最快紀錄！' : (old ? ' · 最快 ' + fmt(old * 1000) : '')) + '</div>' +
        '<div class="earn"><span class="coin"></span>+' + earned + ' 腦力點</div>' +
        (bonus ? '<div class="earn bonus">挑戰完成：' + doneTxt.join('、') + '　<span class="coin"></span>+' + bonus + '</div>' : '') +
        '<button class="btn-main" data-act="again">再來一題</button>' +
        (next ? '<button class="btn-ghost" data-act="up">試試看「' + next.name + '」</button>' : '') +
      '</div>',
      function (b) {
        if (b.dataset.act === 'up') {
          var k = DIFFS.indexOf(S.diff);
          if (DIFFS[k + 1]) { S.diff = DIFFS[k + 1]; App.store('qdiff', S.diff.key); }
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
    el('qWrap').innerHTML = '<div class="q-loading">出題中…</div>';
    bar.innerHTML = '';
    setTimeout(function () {
      if (!S) return;
      var made = makePuzzle(S.diff) || makePuzzle(S.diff);
      if (!made) {
        el('qWrap').innerHTML = '<div class="q-loading">出題失敗，按右上角再試一次</div>';
        drawBar();
        return;
      }
      S.W = made.W;
      S.clues = made.clues;
      S.rects = [];
      S.drag = null;
      S.dragFrom = -1;
      S.touch = [];
      S.dragEndAt = 0;
      S.moves = 0;
      S.elapsed = 0;
      S.counted = false;
      S.done = false;
      el('qWrap').innerHTML = '<div class="q-grid" id="qGrid"></div>';
      draw();
      tip('');
      startClock();
    }, 30);
  }

  function askNew() {
    if (!S.rects.length || S.done) { fresh(); return; }
    App.openSheet(
      '<h2>換一題新的？<small>這題已經切了 ' + S.rects.length + ' 塊，換掉就沒了</small></h2>' +
      '<button class="btn-main" data-act="yes">好，換新的</button>' +
      '<button class="btn-ghost" data-act="no">繼續切</button>',
      function (b) { App.closeSheet(); if (b.dataset.act === 'yes') fresh(); }
    );
  }

  function diffSheet() {
    var h = '<h2>難度<small>每一題都保證只有一種切法</small></h2><div class="opts">';
    for (var i = 0; i < DIFFS.length; i++) {
      var d = DIFFS[i];
      var best = App.store('qbest.' + d.key);
      h += '<button class="opt ' + (d.key === S.diff.key ? 'on' : '') + '" data-qdiff="' + d.key + '">' +
             '<span class="nm">' + d.name + '</span>' +
             '<span class="tag">' + d.W + '×' + d.W + '</span>' +
             '<span class="best">' + (best ? '最快 ' + fmt(best * 1000) : '') + '</span>' +
           '</button>';
    }
    h += '</div><button class="btn-main" data-act="ok">好</button>';
    App.openSheet(h, function (b) {
      if (b.dataset.qdiff) {
        for (var k = 0; k < DIFFS.length; k++) if (DIFFS[k].key === b.dataset.qdiff) S.diff = DIFFS[k];
        App.store('qdiff', S.diff.key);
        App.closeSheet();
        fresh();
        return;
      }
      App.closeSheet();
    });
  }

  /* ================= 掛載 ================= */

  function mount(bodyEl, barEl) {
    host = bodyEl; bar = barEl;

    host.innerHTML =
      '<div class="q-wrap" id="qWrap"><div class="q-grid" id="qGrid"></div></div>' +
      '<div class="q-pad">' +
        '<div class="q-actions">' +
          '<button class="q-act" id="qClear">全部清掉</button>' +
          '<button class="q-act" id="qHint">卡住了？</button>' +
        '</div>' +
        '<div class="q-tip" id="qTip"></div>' +
      '</div>';

    var dk = App.store('qdiff'), d = DIFFS[0];
    for (var i = 0; i < DIFFS.length; i++) if (DIFFS[i].key === dk) d = DIFFS[i];

    S = { diff: d, W: d.W, clues: [], rects: [], drag: null, dragFrom: -1, touch: [], dragEndAt: 0,
          moves: 0, elapsed: 0, t0: 0, counted: false, done: true };

    var wrap = el('qWrap');

    /* 直接問瀏覽器「這個座標上是哪一格」。
       不要用「棋盤寬 ÷ 格數」去除 —— 棋盤有邊框和格線間隙，
       那樣算越往右下角偏得越多，手指明明在這格卻選到隔壁。 */
    function cellFrom(x, y) {
      var e = document.elementFromPoint(x, y);
      if (!e) return -1;
      var c = e.closest ? e.closest('.q-cell') : null;
      if (!c || !el('qGrid').contains(c)) return -1;
      return parseInt(c.dataset.p, 10);
    }

    /* 手指劃過的那些格子，外框有多大 */
    function boxOf(list) {
      var x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
      for (var i = 0; i < list.length; i++) {
        var x = list[i] % S.W, y = Math.floor(list[i] / S.W);
        if (x < x1) x1 = x; if (x > x2) x2 = x;
        if (y < y1) y1 = y; if (y > y2) y2 = y;
      }
      return [x1, y1, x2 - x1 + 1, y2 - y1 + 1];
    }

    /* 手指要進到格子中間一點才算劃過，只是擦到邊邊不算 —— 手抖不會多圈一排 */
    function wellInside(p, x, y) {
      var c = el('qGrid').children[p];
      if (!c) return false;
      var r = c.getBoundingClientRect();
      var mx = r.width * 0.16, my = r.height * 0.16;
      return x > r.left + mx && x < r.right - mx && y > r.top + my && y < r.bottom - my;
    }

    wrap.addEventListener('pointerdown', function (e) {
      if (S.done) return;
      var p = cellFrom(e.clientX, e.clientY);
      if (p < 0) return;
      S.dragFrom = p;
      S.touch = [p];
      S.drag = boxOf(S.touch);
      S.moved = false;
      S.sx = e.clientX; S.sy = e.clientY;
      S.lx = e.clientX; S.ly = e.clientY;
      paintDrag();
    });

    function sample(x, y, own) {
      var p = cellFrom(x, y);
      if (p < 0) return false;
      if (S.touch.indexOf(p) > -1) return false;
      if (!wellInside(p, x, y)) return false;
      if (own[p] >= 0) return false;      /* 已經有主的格子跳過 */
      S.touch.push(p);
      return true;
    }

    function onMove(e) {
      if (!S || S.done || S.dragFrom < 0) return;
      /* 要移動夠遠才算「拖曳」。只看有沒有換格子的話，
         手指抖個幾 px 跨過格線就被當成拖，會圈出沒想要的一塊 */
      if (Math.abs(e.clientX - S.sx) > 10 || Math.abs(e.clientY - S.sy) > 10) S.moved = true;

      var own = cellOwner();
      var lx = S.lx === undefined ? e.clientX : S.lx;
      var ly = S.ly === undefined ? e.clientY : S.ly;

      /* 手指劃快一點時，瀏覽器兩次 pointermove 之間可能已經跨過好幾格。
         所以要沿著這一小段路補點取樣，不能只看事件當下那一點，
         否則中間的格子會被漏掉、圈出來的比想要的短。 */
      var dx = e.clientX - lx, dy = e.clientY - ly;
      var steps = Math.min(24, Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6)));
      var added = false;
      for (var i = 1; i <= steps; i++) {
        if (sample(lx + dx * i / steps, ly + dy * i / steps, own)) added = true;
      }
      S.lx = e.clientX; S.ly = e.clientY;

      if (!added) return;
      S.drag = boxOf(S.touch);
      paintDrag();
    }

    function onUp() {
      if (!S || S.dragFrom < 0) return;
      var r = S.drag, moved = S.moved, from = S.dragFrom;
      S.drag = null; S.dragFrom = -1; S.touch = [];
      if (!r) { drawGrid(); return; }

      if (!moved) {
        /* 沒拖動＝點一下：點已圈好的就拆掉，點空的就圈一格。
           一定要能圈一格 —— 數字是 1 的格子只能自己成一塊。
           用按下去的那一格，不是拖曳範圍的角落 */
        S.dragEndAt = Date.now();
        var p = from;
        if (removeAt(p)) { tip(''); drawGrid(); return; }
        addRect([p % S.W, Math.floor(p / S.W), 1, 1]);
        tip('');
        drawGrid();
        checkWin();
        return;
      }

      S.dragEndAt = Date.now();
      if (!addRect(r)) {
        tip('這裡跟已經圈好的塊重疊了 —— 先點一下那塊把它拆掉');
        drawGrid();
        return;
      }
      tip('');
      drawGrid();
      checkWin();
    }

    /* 手勢被系統中斷時，已經劃好的就直接算數，不要默默丟掉讓人白劃一場 */
    function onCancel() {
      if (!S || S.dragFrom < 0) return;
      if (S.moved) { onUp(); return; }
      S.drag = null; S.dragFrom = -1; S.touch = [];
      drawGrid();
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    S.detach = function () {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
    };

    el('qClear').addEventListener('click', function () {
      if (S.done || !S.rects.length) return;
      App.openSheet(
        '<h2>把切好的全部清掉？<small>題目不換，只是重新開始切</small></h2>' +
        '<button class="btn-main" data-act="yes">好，清掉</button>' +
        '<button class="btn-ghost" data-act="no">不要</button>',
        function (b) {
          App.closeSheet();
          if (b.dataset.act === 'yes') { S.rects = []; drawGrid(); tip(''); }
        }
      );
    });

    /* 找一個「只有一種圈法」的數字指給他看 */
    el('qHint').addEventListener('click', function () {
      if (S.done) return;
      var own = cellOwner();
      for (var i = 0; i < S.clues.length; i++) {
        var c = S.clues[i];
        if (own[c.y * S.W + c.x] >= 0) continue;
        var opts = optionsFor(S.W, S.clues, i).filter(function (r) {
          for (var yy = r[1]; yy < r[1] + r[3]; yy++)
            for (var xx = r[0]; xx < r[0] + r[2]; xx++)
              if (own[yy * S.W + xx] >= 0) return false;
          return true;
        });
        if (opts.length === 1) {
          S.drag = opts[0];
          drawGrid();
          tip('這個 ' + c.v +' 只有一種圈法，就是亮起來這塊', true);
          setTimeout(function () { if (S && !S.done) { S.drag = null; drawGrid(); } }, 2500);
          return;
        }
      }
      tip('這題沒有一眼看得出來的了，從數字大的、或角落的開始想');
    });

    fresh();
  }

  function unmount() {
    stopClock();
    if (S && S.detach) S.detach();
    if (S && !S.counted && !S.done && S.rects.length) {
      App.report({ type: 'finish', game: 'shikaku', secs: Math.floor(S.elapsed / 1000), level: S.diff.key, mistakes: 0 });
      S.counted = true;
    }
    S = null; host = null; bar = null;
  }

  App.register({
    id: 'shikaku',
    name: '切方塊',
    tagline: '切成長方形，數字＝格數',
    ready: true,
    mark:
      '<svg viewBox="0 0 52 52" fill="none" aria-hidden="true">' +
      '<rect x="2.5" y="2.5" width="47" height="47" rx="6" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M2.5 20.5h30M32.5 2.5v47M2.5 35h30" stroke="currentColor" stroke-width="2.5"/>' +
      '<text x="17" y="15.5" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="currentColor">6</text>' +
      '<text x="17" y="30" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="currentColor">4</text>' +
      '<text x="41" y="30" text-anchor="middle" font-size="11" font-weight="700" font-family="monospace" fill="currentColor">8</text>' +
      '</svg>',
    help:
      '<div class="hstep"><span class="hnum">1</span><div class="hbody">' +
        '<b>把整張格子切成一塊塊長方形</b>' +
        '<div class="hnote">每一塊裡面<u>剛好包住一個數字</u>，而且<em>數字就是那塊有幾格</em>。' +
        '<br>全部格子都要被切到，不能有剩。</div>' +
      '</div></div>' +

      '<div class="hstep"><span class="hnum">2</span><div class="hbody">' +
        '<b>看這個 6</b>' +
        '<div class="qdemo" style="grid-template-columns:repeat(4,1fr);width:132px">' +
          '<div class="a"></div><div class="a">6</div><div class="a"></div><div></div>' +
          '<div class="a"></div><div class="a"></div><div class="a"></div><div class="b">3</div>' +
        '</div>' +
        '<div class="hnote">6 格的長方形只能是 1×6、2×3、3×2、6×1。' +
        '這裡切成 3×2 剛好包住 6、又不會碰到旁邊的 3。</div>' +
      '</div></div>' +

      '<div class="hstep"><span class="hnum">3</span><div class="hbody">' +
        '<b>手指劃過想要的那幾格，就圈成一塊</b>' +
        '<div class="hnote">只算<u>手指真的劃過</u>的格子 —— 劃一橫排就是一橫排，' +
        '不會連旁邊一起框進去。已經圈好的格子會自動跳過。' +
        '<br>圈錯了（格數不對、或圈到兩個數字）那塊會變紅。<br>' +
        '<u>點一下已經圈好的塊就拆掉；點空白格就圈那一格</u>（數字是 1 的就是這樣圈）。</div>' +
      '</div></div>' +

      '<div class="hstep"><span class="hnum">4</span><div class="hbody">' +
        '<b>從只有一種切法的數字下手</b>' +
        '<div class="hnote">角落的、還有大的數字，通常選擇最少，先切它們最容易開頭。' +
        '<br>真的卡住就按<em>「卡住了？」</em>，它會指一個只有一種圈法的給你看。</div>' +
      '</div></div>',
    score: function () {
      for (var i = DIFFS.length - 1; i >= 0; i--) {
        var b = App.store('qbest.' + DIFFS[i].key);
        if (b) return DIFFS[i].name + '最快 ' + fmt(b * 1000);
      }
      return '';
    },
    mount: mount,
    unmount: unmount
  });
})();
