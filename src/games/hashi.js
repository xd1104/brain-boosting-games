/* ===========================================================
   數橋（Hashiwokakero）
   島上的數字 = 要接幾座橋；橋只走直橫、不能交叉、兩島之間最多兩座；
   最後所有島要連成一整塊。
   出題保證答案唯一。
   =========================================================== */
(function () {

  var DIFFS = [
    { key: 'a', name: '入門', W: 6, isles: 7,  base: 10 },
    { key: 'b', name: '簡單', W: 7, isles: 10, base: 16 },
    { key: 'c', name: '普通', W: 8, isles: 14, base: 24 },
    { key: 'd', name: '進階', W: 9, isles: 18, base: 34 },
    { key: 'e', name: '困難', W: 9, isles: 22, base: 46 }
  ];

  var S = null, host = null, bar = null, ticker = null;

  /* ================= 出題 ================= */

  var DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  function rnd(n) { return Math.floor(Math.random() * n); }

  /* 隨機長出一張「島＋橋」的圖，本身就是一組合法答案 */
  function grow(W, target) {
    var cell = new Array(W * W).fill(0);   /* 0=空 1=島 2=被橋佔用 */
    var isles = [], links = {};

    function at(r, c) { return r * W + c; }
    function inb(r, c) { return r >= 0 && r < W && c >= 0 && c < W; }

    var r0 = rnd(W), c0 = rnd(W);
    cell[at(r0, c0)] = 1;
    isles.push({ r: r0, c: c0 });

    var guard = 0;
    while (isles.length < target && guard++ < 900) {
      var a = rnd(isles.length), A = isles[a];
      var d = DIRS[rnd(4)];
      var dist = 2 + rnd(3);                       /* 中間至少留一格給橋 */
      var nr = A.r + d[0] * dist, nc = A.c + d[1] * dist;
      if (!inb(nr, nc) || cell[at(nr, nc)] !== 0) continue;

      /* 路徑上不能有島、也不能有別的橋 */
      var clear = true, k;
      for (k = 1; k < dist; k++) {
        var pr = A.r + d[0] * k, pc = A.c + d[1] * k;
        if (cell[at(pr, pc)] !== 0) { clear = false; break; }
      }
      if (!clear) continue;

      /* 新島旁邊不要緊貼別的島，畫面才不會擠 */
      var tooClose = false;
      for (k = 0; k < 4; k++) {
        var ar = nr + DIRS[k][0], ac = nc + DIRS[k][1];
        if (inb(ar, ac) && cell[at(ar, ac)] === 1) tooClose = true;
      }
      if (tooClose) continue;

      var b = isles.length;
      isles.push({ r: nr, c: nc });
      cell[at(nr, nc)] = 1;
      for (k = 1; k < dist; k++) cell[at(A.r + d[0] * k, A.c + d[1] * k)] = 2;
      links[a + ',' + b] = 1 + (Math.random() < 0.4 ? 1 : 0);
    }

    /* 再補幾條橋，讓圖有環、推理才有味道 */
    for (var t = 0; t < target * 3; t++) {
      var i = rnd(isles.length), I = isles[i];
      var dd = DIRS[rnd(4)];
      for (var dist2 = 2; dist2 <= 5; dist2++) {
        var rr = I.r + dd[0] * dist2, cc = I.c + dd[1] * dist2;
        if (!inb(rr, cc)) break;
        if (cell[at(rr, cc)] === 2) break;          /* 被橋擋住 */
        if (cell[at(rr, cc)] !== 1) continue;

        var j = -1;
        for (k = 0; k < isles.length; k++) if (isles[k].r === rr && isles[k].c === cc) j = k;
        if (j < 0) break;

        var key = Math.min(i, j) + ',' + Math.max(i, j);
        var cur = links[key] || 0;
        if (cur >= 2) break;

        var ok = true;
        for (k = 1; k < dist2; k++) {
          if (cell[at(I.r + dd[0] * k, I.c + dd[1] * k)] === 1) { ok = false; break; }
          if (!cur && cell[at(I.r + dd[0] * k, I.c + dd[1] * k)] === 2) { ok = false; break; }
        }
        if (!ok) break;

        links[key] = cur + 1;
        if (!cur) for (k = 1; k < dist2; k++) cell[at(I.r + dd[0] * k, I.c + dd[1] * k)] = 2;
        break;
      }
    }

    if (isles.length < 4) return null;

    var deg = new Array(isles.length).fill(0);
    for (var kk in links) {
      var p = kk.split(',');
      deg[+p[0]] += links[kk];
      deg[+p[1]] += links[kk];
    }
    for (k = 0; k < deg.length; k++) if (deg[k] === 0 || deg[k] > 8) return null;

    return { W: W, isles: isles, deg: deg };
  }

  /* 每座島往四個方向看，最近的那座島就是可以連的對象 */
  function pairsOf(isles, W) {
    var byPos = {};
    for (var i = 0; i < isles.length; i++) byPos[isles[i].r * W + isles[i].c] = i;
    var out = [], seen = {};
    for (i = 0; i < isles.length; i++) {
      for (var d = 0; d < 4; d++) {
        var dr = DIRS[d][0], dc = DIRS[d][1];
        var r = isles[i].r + dr, c = isles[i].c + dc;
        while (r >= 0 && r < W && c >= 0 && c < W) {
          var j = byPos[r * W + c];
          if (j !== undefined) {
            var key = Math.min(i, j) + ',' + Math.max(i, j);
            if (!seen[key]) {
              seen[key] = 1;
              out.push({ a: Math.min(i, j), b: Math.max(i, j), key: key });
            }
            break;
          }
          r += dr; c += dc;
        }
      }
    }
    return out;
  }

  /* 兩條橋會不會交叉 */
  function crosses(p, q, isles) {
    var A = isles[p.a], B = isles[p.b], C = isles[q.a], D = isles[q.b];
    var pH = A.r === B.r, qH = C.r === D.r;
    if (pH === qH) return false;
    var h = pH ? { r: A.r, c1: Math.min(A.c, B.c), c2: Math.max(A.c, B.c) } : { r: C.r, c1: Math.min(C.c, D.c), c2: Math.max(C.c, D.c) };
    var v = pH ? { c: C.c, r1: Math.min(C.r, D.r), r2: Math.max(C.r, D.r) } : { c: A.c, r1: Math.min(A.r, B.r), r2: Math.max(A.r, B.r) };
    return v.c > h.c1 && v.c < h.c2 && h.r > v.r1 && h.r < v.r2;
  }

  function connected(n, counts, pairs) {
    var adj = [];
    for (var i = 0; i < n; i++) adj.push([]);
    for (i = 0; i < pairs.length; i++) {
      if (counts[i] > 0) { adj[pairs[i].a].push(pairs[i].b); adj[pairs[i].b].push(pairs[i].a); }
    }
    var seen = new Array(n).fill(false), stack = [0], c = 0;
    seen[0] = true;
    while (stack.length) {
      var v = stack.pop(); c++;
      for (i = 0; i < adj[v].length; i++) if (!seen[adj[v][i]]) { seen[adj[v][i]] = true; stack.push(adj[v][i]); }
    }
    return c === n;
  }

  /* 數這題有幾組解，最多數到 limit */
  function countSolutions(puz, limit) {
    var isles = puz.isles, deg = puz.deg, n = isles.length;
    var pairs = pairsOf(isles, puz.W);
    var m = pairs.length;

    /* 每座島連到哪幾條邊 */
    var inc = [];
    for (var i = 0; i < n; i++) inc.push([]);
    for (i = 0; i < m; i++) { inc[pairs[i].a].push(i); inc[pairs[i].b].push(i); }

    /* 先算好哪些邊互相交叉 */
    var cross = [];
    for (i = 0; i < m; i++) cross.push([]);
    for (i = 0; i < m; i++) {
      for (var j = i + 1; j < m; j++) {
        if (crosses(pairs[i], pairs[j], isles)) { cross[i].push(j); cross[j].push(i); }
      }
    }

    /* 邊的處理順序很關鍵：把同一座島的邊排在一起，
       島才會早早被「填滿」而剪掉大量分支。差別是「跑不完」和「1 毫秒」。 */
    var order = [], placed = new Array(m).fill(false), visited = new Array(n).fill(false);
    var queue = [0];
    visited[0] = true;
    while (order.length < m) {
      if (!queue.length) {
        for (var s = 0; s < n; s++) if (!visited[s]) { queue.push(s); visited[s] = true; break; }
        if (!queue.length) break;
      }
      var cur = queue.shift();
      for (var e = 0; e < inc[cur].length; e++) {
        var ei = inc[cur][e];
        if (placed[ei]) continue;
        placed[ei] = true;
        order.push(ei);
        var other = pairs[ei].a === cur ? pairs[ei].b : pairs[ei].a;
        if (!visited[other]) { visited[other] = true; queue.push(other); }
      }
    }
    for (i = 0; i < m; i++) if (!placed[i]) order.push(i);

    var counts = new Array(m).fill(-1);
    var used = new Array(n).fill(0);
    var left = new Array(n).fill(0);      /* 還沒決定的邊數 */
    for (i = 0; i < n; i++) left[i] = inc[i].length;
    var found = 0, nodes = 0, aborted = false;

    /* 只檢查剛剛動到的兩座島就夠了，不用每次掃全部 */
    function okAt(k) {
      if (used[k] > deg[k]) return false;
      if (used[k] + left[k] * 2 < deg[k]) return false;
      return true;
    }

    function go(pos) {
      if (nodes++ > 300000) { aborted = true; return true; }
      if (pos === m) {
        for (var k = 0; k < n; k++) if (used[k] !== deg[k]) return false;
        if (!connected(n, counts, pairs)) return false;
        found++;
        return found >= limit;
      }
      var idx = order[pos], A = pairs[idx].a, B = pairs[idx].b;
      left[A]--; left[B]--;
      for (var v = 0; v <= 2; v++) {
        if (v > 0) {
          var blocked = false;
          for (var q = 0; q < cross[idx].length; q++) {
            if (counts[cross[idx][q]] > 0) { blocked = true; break; }
          }
          if (blocked) continue;
        }
        counts[idx] = v;
        used[A] += v; used[B] += v;
        if (okAt(A) && okAt(B) && go(pos + 1)) {
          used[A] -= v; used[B] -= v; counts[idx] = -1; left[A]++; left[B]++;
          return true;
        }
        used[A] -= v; used[B] -= v;
        counts[idx] = -1;
      }
      left[A]++; left[B]++;
      return false;
    }

    go(0);
    return aborted ? 99 : found;   /* 算不完就當作「不能保證唯一」，換一題 */
  }

  function makePuzzle(d) {
    for (var attempt = 0; attempt < 120; attempt++) {
      var g = grow(d.W, d.isles);
      if (!g) continue;
      if (g.isles.length < Math.max(5, d.isles - 3)) continue;
      if (countSolutions(g, 2) === 1) return g;
    }
    return null;
  }

  /* ================= 畫面 ================= */

  function el(id) { return host.querySelector('#' + id); }
  function tip(t, good) {
    var e = el('hTip');
    if (!e) return;
    e.className = 'h-tip' + (good ? ' good' : '');
    e.textContent = t || '';
  }

  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function drawBar() {
    bar.innerHTML =
      '<button class="g-mode" id="hMode" aria-label="更改難度"><b>' + S.diff.name + '</b><span>' + S.isles.length + ' 島</span></button>' +
      '<span class="s-time" id="hTime">0:00</span>' +
      '<button class="iconbtn" id="hNew" style="margin-left:auto" aria-label="換一題">&#8635;</button>';
    bar.querySelector('#hMode').addEventListener('click', diffSheet);
    bar.querySelector('#hNew').addEventListener('click', askNew);
  }

  function degNow(i) {
    var t = 0;
    for (var k = 0; k < S.pairs.length; k++) {
      if (S.pairs[k].a === i || S.pairs[k].b === i) t += S.counts[k];
    }
    return t;
  }

  function drawBoard() {
    var W = S.W, b = el('hBoard');
    b.style.gridTemplateColumns = 'repeat(' + W + ', 1fr)';
    b.style.fontSize = 'clamp(13px, ' + (46 / W) + 'px, 22px)';

    var isleAt = {};
    for (var i = 0; i < S.isles.length; i++) isleAt[S.isles[i].r * W + S.isles[i].c] = i;

    /* 先把橋畫進格子裡。橋所在的格子記下屬於哪一組，點它就能拆 */
    var brs = {}, brPair = {};
    for (var k = 0; k < S.pairs.length; k++) {
      var n = S.counts[k];
      if (!n) continue;
      var A = S.isles[S.pairs[k].a], B = S.isles[S.pairs[k].b];
      if (A.r === B.r) {
        for (var c = Math.min(A.c, B.c) + 1; c < Math.max(A.c, B.c); c++) {
          brs[A.r * W + c] = n === 1 ? '<i class="h-br h1"></i>' : '<i class="h-br h2a"></i><i class="h-br h2b"></i>';
          brPair[A.r * W + c] = k;
        }
      } else {
        for (var r = Math.min(A.r, B.r) + 1; r < Math.max(A.r, B.r); r++) {
          brs[r * W + A.c] = n === 1 ? '<i class="h-br v1"></i>' : '<i class="h-br v2a"></i><i class="h-br v2b"></i>';
          brPair[r * W + A.c] = k;
        }
      }
    }

    var h = '';
    for (var p = 0; p < W * W; p++) {
      var inner = brs[p] || '';
      var idx = isleAt[p];
      if (idx !== undefined) {
        var want = S.deg[idx], got = degNow(idx);
        var cls = 'h-isle';
        if (idx === S.sel) cls += ' sel';
        else if (idx === S.aim) cls += ' aim';
        else if (got === want) cls += ' done';
        else if (got > want) cls += ' over';
        inner += '<button class="' + cls + '" data-i="' + idx + '" aria-label="島 ' + want + '">' + want + '</button>';
      }
      var cellCls = 'h-cell' + (brPair[p] !== undefined ? ' hasbr' : '');
      var attr = brPair[p] !== undefined ? ' data-br="' + brPair[p] + '"' : '';
      h += '<div class="' + cellCls + '"' + attr + '>' + inner + '</div>';
    }
    b.innerHTML = h;
  }

  function draw() { drawBar(); drawBoard(); }

  /* ================= 操作 ================= */

  function pairIndex(i, j) {
    var key = Math.min(i, j) + ',' + Math.max(i, j);
    for (var k = 0; k < S.pairs.length; k++) if (S.pairs[k].key === key) return k;
    return -1;
  }

  /* 蓋一座上去（最多兩座）。回傳有沒有成功 */
  function addBridge(k) {
    if (S.counts[k] >= 2) { tip('兩座島之間最多兩座橋'); return false; }
    if (S.counts[k] === 0) {
      for (var q = 0; q < S.cross[k].length; q++) {
        if (S.counts[S.cross[k][q]] > 0) { tip('這座橋會跟別的橋交叉，不能蓋'); return false; }
      }
    }
    S.counts[k]++;
    S.moves++;
    tip('');
    return true;
  }

  /* 拆一座 */
  function removeBridge(k) {
    if (S.counts[k] <= 0) return false;
    S.counts[k]--;
    S.moves++;
    tip('');
    return true;
  }

  function tapIsle(i) {
    if (S.done) return;
    if (S.sel < 0) { S.sel = i; tip(''); drawBoard(); return; }
    if (S.sel === i) { S.sel = -1; tip(''); drawBoard(); return; }

    var k = pairIndex(S.sel, i);
    if (k < 0) { S.sel = i; tip('這兩座島之間不能直接連 —— 要同一橫排或同一直排，中間不能隔著別的島'); drawBoard(); return; }

    /* 點到底了就從頭來，維持原本「點三下拆掉」的習慣 */
    if (S.counts[k] >= 2) { S.counts[k] = 0; S.moves++; tip(''); }
    else addBridge(k);

    drawBoard();
    checkWin();
  }

  function checkWin() {
    for (var i = 0; i < S.isles.length; i++) {
      if (degNow(i) !== S.deg[i]) return;
    }
    if (!connected(S.isles.length, S.counts, S.pairs)) {
      /* 這是最容易卡住的地方 —— 數字全對但分成兩塊，要講出來 */
      tip('數字都對了！但還有島沒跟大家連在一起，要全部連成一整塊才算完成');
      return;
    }
    S.done = true;
    S.sel = -1;
    stopClock();
    drawBoard();
    win();
  }

  function startClock() {
    stopClock();
    S.t0 = Date.now() - S.elapsed;
    ticker = setInterval(function () {
      if (!S || S.done) return;
      S.elapsed = Date.now() - S.t0;
      var e = el('hTime');
      if (e) e.textContent = fmt(S.elapsed);
    }, 500);
  }
  function stopClock() { if (ticker) { clearInterval(ticker); ticker = null; } }

  /* ================= 一局結束 ================= */

  function win() {
    var d = S.diff;
    var secs = Math.floor(S.elapsed / 1000);
    var bk = 'hbest.' + d.key;
    var old = parseInt(App.store(bk) || '0', 10);
    var isBest = !old || secs < old;
    if (isBest) App.store(bk, secs);

    var earned = d.base;
    App.addCoins(earned);

    var ev = { game: 'hashi', secs: secs, level: d.key, mistakes: 0 };
    var r1 = App.report(Object.assign({ type: 'finish' }, ev));
    var r2 = App.report(Object.assign({ type: 'win' }, ev));
    S.counted = true;

    var bonus = r1.earned + r2.earned;
    var doneTxt = r1.done.concat(r2.done);
    var idx = DIFFS.indexOf(d), next = DIFFS[idx + 1];

    App.openSheet(
      '<div class="h-win">' +
        '<div class="cap">全部連起來了！花了</div>' +
        '<div class="big">' + fmt(S.elapsed) + '</div>' +
        '<div class="steps">' + S.isles.length + ' 座島' +
          (isBest ? ' · 這個難度最快紀錄！' : (old ? ' · 最快 ' + fmt(old * 1000) : '')) + '</div>' +
        '<div class="earn"><span class="coin"></span>+' + earned + ' 腦力點</div>' +
        (bonus ? '<div class="earn bonus">挑戰完成：' + doneTxt.join('、') + '　<span class="coin"></span>+' + bonus + '</div>' : '') +
        '<button class="btn-main" data-act="again">再來一題</button>' +
        (next ? '<button class="btn-ghost" data-act="up">試試看「' + next.name + '」</button>' : '') +
      '</div>',
      function (b) {
        if (b.dataset.act === 'up') {
          var k = DIFFS.indexOf(S.diff);
          if (DIFFS[k + 1]) { S.diff = DIFFS[k + 1]; App.store('hdiff', S.diff.key); }
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
    el('hWrap').innerHTML = '<div class="h-loading">出題中…</div>';
    bar.innerHTML = '';
    setTimeout(function () {
      if (!S) return;
      var made = makePuzzle(S.diff);
      if (!made) {
        el('hWrap').innerHTML = '<div class="h-loading">出題失敗，按右上角再試一次</div>';
        drawBar();
        return;
      }
      S.W = made.W;
      S.isles = made.isles;
      S.deg = made.deg;
      S.pairs = pairsOf(S.isles, S.W);
      S.counts = new Array(S.pairs.length).fill(0);

      S.cross = [];
      for (var i = 0; i < S.pairs.length; i++) S.cross.push([]);
      for (i = 0; i < S.pairs.length; i++) {
        for (var j = i + 1; j < S.pairs.length; j++) {
          if (crosses(S.pairs[i], S.pairs[j], S.isles)) { S.cross[i].push(j); S.cross[j].push(i); }
        }
      }

      /* 每座島往四個方向各對應哪一組橋，撥的時候要用 */
      S.dirPair = [];
      for (i = 0; i < S.isles.length; i++) S.dirPair.push([-1, -1, -1, -1]);
      for (i = 0; i < S.pairs.length; i++) {
        var PA = S.isles[S.pairs[i].a], PB = S.isles[S.pairs[i].b];
        if (PA.r === PB.r) {
          if (PB.c > PA.c) { S.dirPair[S.pairs[i].a][0] = i; S.dirPair[S.pairs[i].b][2] = i; }
          else { S.dirPair[S.pairs[i].a][2] = i; S.dirPair[S.pairs[i].b][0] = i; }
        } else {
          if (PB.r > PA.r) { S.dirPair[S.pairs[i].a][1] = i; S.dirPair[S.pairs[i].b][3] = i; }
          else { S.dirPair[S.pairs[i].a][3] = i; S.dirPair[S.pairs[i].b][1] = i; }
        }
      }

      S.sel = -1;
      S.aim = -1;
      S.dragFrom = -1;
      S.dragPair = -1;
      S.dragEndAt = 0;
      S.moves = 0;
      S.elapsed = 0;
      S.counted = false;
      S.done = false;
      el('hWrap').innerHTML = '<div class="h-board" id="hBoard"></div>';
      draw();
      tip('');
      startClock();
    }, 30);
  }

  function askNew() {
    var any = false;
    for (var i = 0; i < S.counts.length; i++) if (S.counts[i]) any = true;
    if (!any || S.done) { fresh(); return; }
    App.openSheet(
      '<h2>換一題新的？<small>這題已經蓋了一些橋，換掉就沒了</small></h2>' +
      '<button class="btn-main" data-act="yes">好，換新的</button>' +
      '<button class="btn-ghost" data-act="no">繼續解</button>',
      function (b) { App.closeSheet(); if (b.dataset.act === 'yes') fresh(); }
    );
  }

  function diffSheet() {
    var h = '<h2>難度<small>每一題都保證只有一種連法</small></h2><div class="opts">';
    for (var i = 0; i < DIFFS.length; i++) {
      var d = DIFFS[i];
      var best = App.store('hbest.' + d.key);
      h += '<button class="opt ' + (d.key === S.diff.key ? 'on' : '') + '" data-hdiff="' + d.key + '">' +
             '<span class="nm">' + d.name + '</span>' +
             '<span class="tag">約 ' + d.isles + ' 島</span>' +
             '<span class="best">' + (best ? '最快 ' + fmt(best * 1000) : '') + '</span>' +
           '</button>';
    }
    h += '</div><button class="btn-main" data-act="ok">好</button>';

    App.openSheet(h, function (b) {
      if (b.dataset.hdiff) {
        for (var k = 0; k < DIFFS.length; k++) if (DIFFS[k].key === b.dataset.hdiff) S.diff = DIFFS[k];
        App.store('hdiff', S.diff.key);
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
      '<div class="h-wrap" id="hWrap"><div class="h-board" id="hBoard"></div></div>' +
      '<div class="h-pad">' +
        '<div class="h-actions">' +
          '<button class="h-act" id="hUndoAll">全部拆掉</button>' +
          '<button class="h-act" id="hHint">卡住了？</button>' +
        '</div>' +
        '<div class="h-tip" id="hTip"></div>' +
      '</div>';

    var dk = App.store('hdiff'), d = DIFFS[0];
    for (var i = 0; i < DIFFS.length; i++) if (DIFFS[i].key === dk) d = DIFFS[i];

    S = { diff: d, W: d.W, isles: [], deg: [], pairs: [], counts: [], cross: [], dirPair: [],
          sel: -1, aim: -1, dragFrom: -1, dragPair: -1, dragEndAt: 0,
          moves: 0, elapsed: 0, t0: 0, counted: false, done: true };

    /* ---- 三種操作，習慣哪種用哪種 ----
       1. 從島往一個方向撥：直接蓋一座（不用點準對面那座島）
       2. 點橋：拆掉一座
       3. 點兩座島：跟原本一樣
       第 1 種是主力 —— 一個手勢就好，而且只要方向對，不必點中小圓圈。 */
    var wrap = el('hWrap');

    wrap.addEventListener('pointerdown', function (e) {
      if (S.done) return;
      var b = e.target.closest('.h-isle');
      if (!b) return;
      S.dragFrom = parseInt(b.dataset.i, 10);
      S.dragX = e.clientX; S.dragY = e.clientY;
      S.dragPair = -1;
      S.dragged = false;
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });

    wrap.addEventListener('pointermove', function (e) {
      if (S.done || S.dragFrom === undefined || S.dragFrom < 0) return;
      var dx = e.clientX - S.dragX, dy = e.clientY - S.dragY;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      S.dragged = true;
      var d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
      var k = S.dirPair[S.dragFrom][d];
      if (k === S.dragPair) return;
      S.dragPair = k;
      S.aim = k < 0 ? -1 : (S.pairs[k].a === S.dragFrom ? S.pairs[k].b : S.pairs[k].a);
      S.sel = S.dragFrom;
      drawBoard();
    });

    function endDrag() {
      if (S.dragFrom === undefined || S.dragFrom < 0) return;
      var did = S.dragged, k = S.dragPair;
      S.dragFrom = -1; S.dragPair = -1; S.aim = -1;
      if (!did) return;               /* 沒拖動就交給 click 當一般點擊 */
      /* 撥完之後瀏覽器通常還會補一個 click，要吃掉它。
         用時間判斷而不是旗標 —— 有些瀏覽器拖曳後不發 click，
         旗標會一直留著，害下一次正常的點擊被吃掉。 */
      S.dragEndAt = Date.now();
      if (k < 0) { S.sel = -1; tip('那個方向沒有可以連的島'); drawBoard(); return; }
      addBridge(k);
      S.sel = -1;
      drawBoard();
      checkWin();
    }
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', function () {
      S.dragFrom = -1; S.dragPair = -1; S.aim = -1; drawBoard();
    });

    wrap.addEventListener('click', function (e) {
      if (Date.now() - (S.dragEndAt || 0) < 350) return;
      var b = e.target.closest('.h-isle');
      if (b) { tapIsle(parseInt(b.dataset.i, 10)); return; }
      var cell = e.target.closest('.h-cell[data-br]');
      if (cell) {
        if (S.done) return;
        removeBridge(parseInt(cell.dataset.br, 10));
        S.sel = -1;
        drawBoard();
        return;
      }
      S.sel = -1; drawBoard();
    });

    el('hUndoAll').addEventListener('click', function () {
      if (S.done) return;
      var any = false;
      for (var i = 0; i < S.counts.length; i++) if (S.counts[i]) any = true;
      if (!any) return;
      App.openSheet(
        '<h2>把橋全部拆掉？<small>題目不換，只是重新開始連</small></h2>' +
        '<button class="btn-main" data-act="yes">好，拆掉</button>' +
        '<button class="btn-ghost" data-act="no">不要</button>',
        function (b) {
          App.closeSheet();
          if (b.dataset.act === 'yes') {
            S.counts = new Array(S.pairs.length).fill(0);
            S.sel = -1;
            drawBoard(); tip('');
          }
        }
      );
    });

    /* 給新手的推一把：找出「一定要連滿」的島 */
    el('hHint').addEventListener('click', function () {
      if (S.done) return;
      for (var i = 0; i < S.isles.length; i++) {
        var links = 0;
        for (var k = 0; k < S.pairs.length; k++) if (S.pairs[k].a === i || S.pairs[k].b === i) links++;
        if (degNow(i) === S.deg[i]) continue;
        if (S.deg[i] === links * 2) {
          S.sel = i;
          drawBoard();
          tip('看這座 ' + S.deg[i] + '：它只有 ' + links + ' 個方向可以連，每個方向都得蓋兩座橋才夠', true);
          return;
        }
        if (links === 1) {
          S.sel = i;
          drawBoard();
          tip('看這座 ' + S.deg[i] + '：它只有一個方向可以連，橋一定往那邊蓋', true);
          return;
        }
      }
      tip('這題沒有一眼就看得出來的島了，試試看從數字大的島開始推');
    });

    fresh();
  }

  function unmount() {
    stopClock();
    if (S && !S.counted && !S.done) {
      var any = false;
      for (var i = 0; i < S.counts.length; i++) if (S.counts[i]) any = true;
      if (any) {
        App.report({ type: 'finish', game: 'hashi', secs: Math.floor(S.elapsed / 1000), level: S.diff.key, mistakes: 0 });
        S.counted = true;
      }
    }
    S = null; host = null; bar = null;
  }

  App.register({
    id: 'hashi',
    name: '數橋',
    tagline: '把島用橋連起來',
    ready: true,
    mark:
      '<svg viewBox="0 0 52 52" fill="none" aria-hidden="true">' +
      '<path d="M13 13h26M13 39h26M13 13v26" stroke="currentColor" stroke-width="2.2" opacity=".55"/>' +
      '<path d="M13 10h26M13 16h26" stroke="currentColor" stroke-width="2.2" opacity=".55"/>' +
      '<circle cx="13" cy="13" r="8.5" fill="var(--surface)" stroke="currentColor" stroke-width="2.5"/>' +
      '<circle cx="39" cy="13" r="8.5" fill="var(--surface)" stroke="currentColor" stroke-width="2.5"/>' +
      '<circle cx="13" cy="39" r="8.5" fill="var(--surface)" stroke="currentColor" stroke-width="2.5"/>' +
      '<circle cx="39" cy="39" r="8.5" fill="var(--surface)" stroke="currentColor" stroke-width="2.5"/>' +
      '<text x="13" y="17" text-anchor="middle" font-size="10" font-weight="700" font-family="monospace" fill="currentColor">3</text>' +
      '<text x="39" y="17" text-anchor="middle" font-size="10" font-weight="700" font-family="monospace" fill="currentColor">2</text>' +
      '</svg>',
    help:
      '<div class="hstep"><span class="hnum">1</span><div class="hbody">' +
        '<b>島上的數字＝要接幾座橋</b>' +
        '<div class="hrow">' +
          '<span class="hisle-demo">3</span><span class="hbridge-demo"></span><span class="hisle-demo">1</span>' +
        '</div>' +
        '<div class="hnote">這座 3 還要再接兩座橋才夠</div>' +
      '</div></div>' +

      '<div class="hstep"><span class="hnum">2</span><div class="hbody">' +
        '<b>手指從島上往那個方向撥一下，橋就出來了</b>' +
        '<div class="hnote"><em>不用點準對面那座島</em> —— 只要方向對，它自己會找到。' +
        '想要兩座橋就再撥一次。<br>' +
        '橋只能走直的橫的，兩島之間最多兩座，而且不能跟別的橋交叉。</div>' +
      '</div></div>' +

      '<div class="hstep"><span class="hnum">3</span><div class="hbody">' +
        '<b>要拆掉就點那座橋</b>' +
        '<div class="hnote">直接點橋身，一次拆一座。<br>' +
        '（也可以用點的蓋：點一座島再點另一座，習慣哪種都行）</div>' +
      '</div></div>' +

      '<div class="hstep"><span class="hnum">4</span><div class="hbody">' +
        '<b>數字接夠了，島會變綠</b>' +
        '<div class="hrow">' +
          '<span class="hisle-demo ok">2</span>' +
          '<span class="hnote" style="margin:0 0 0 10px">接夠了</span>' +
        '</div>' +
        '<div class="hnote">接太多會變紅，再點一次就拆掉</div>' +
      '</div></div>' +

      '<div class="hstep"><span class="hnum">5</span><div class="hbody">' +
        '<b>最後所有島要連成一整塊</b>' +
        '<div class="hnote">這是最容易漏掉的一點 —— 數字全部接對了，但如果分成兩群互不相通，還不算完成。' +
        '<br>真的卡住就按下面的<em>「卡住了？」</em>，它會指一座「只有一種連法」的島給你看。</div>' +
      '</div></div>',
    score: function () {
      for (var i = DIFFS.length - 1; i >= 0; i--) {
        var b = App.store('hbest.' + DIFFS[i].key);
        if (b) return DIFFS[i].name + '最快 ' + fmt(b * 1000);
      }
      return '';
    },
    mount: mount,
    unmount: unmount
  });
})();
