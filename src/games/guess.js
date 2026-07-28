/* ===========================================================
   猜數字（幾A幾B）
   =========================================================== */
(function () {

  var DIFFS = [
    { key: 'n3', len: 3, rep: false, name: '3 位數', sub: '新手',        par: 6,  base: 6,  lock: null },
    { key: 'n4', len: 4, rep: false, name: '4 位數', sub: '經典',        par: 8,  base: 10, lock: null },
    { key: 'n5', len: 5, rep: false, name: '5 位數', sub: '進階',        par: 10, base: 16, lock: 'n5' },
    { key: 'r4', len: 4, rep: true,  name: '4 位數', sub: '可重複 · 高手', par: 12, base: 22, lock: 'r4' }
  ];

  var S = null, host = null, bar = null;

  function locked(d) { return d.lock && !App.owns(d.lock); }

  /* ---------- 出題與判定 ---------- */
  function newSecret(d) {
    var pool = [0,1,2,3,4,5,6,7,8,9], out = [];
    for (var i = 0; i < d.len; i++) {
      var j = Math.floor(Math.random() * pool.length);
      out.push(pool[j]);
      if (!d.rep) pool.splice(j, 1);
    }
    return out;
  }

  function judge(g, s) {
    var a = 0, i, gr = [], sr = [];
    for (i = 0; i < s.length; i++) {
      if (g[i] === s[i]) a++;
      else { gr.push(g[i]); sr.push(s[i]); }
    }
    var b = 0;
    for (i = 0; i < gr.length; i++) {
      var k = sr.indexOf(gr[i]);
      if (k > -1) { b++; sr.splice(k, 1); }
    }
    return { a: a, b: b };
  }

  function reset() {
    S.secret = newSecret(S.diff);
    S.input = [];
    S.history = [];
    S.dead = {};
    S.hintUsed = false;
    S.counted = false;
    S.done = false;
    draw();
    tip('');
  }

  /* ---------- 畫面 ---------- */
  function el(id) { return host.querySelector('#' + id); }
  function tip(t) { var e = el('gTip'); if (e) e.textContent = t || ''; }

  function drawBar() {
    var n = App.items('hint');
    bar.innerHTML =
      '<button class="g-mode" id="gMode" aria-label="更改難度"><b>' + S.diff.name + '</b><span>' + S.diff.sub + '</span></button>' +
      '<button class="iconbtn g-hintbtn" id="gHint" aria-label="使用提示券">' +
        '<span class="coin"></span><span class="n">' + n + '</span>' +
      '</button>' +
      '<button class="iconbtn" id="gNew" aria-label="換一組新的">&#8635;</button>';

    bar.querySelector('#gMode').addEventListener('click', diffSheet);
    bar.querySelector('#gHint').addEventListener('click', useHint);
    bar.querySelector('#gNew').addEventListener('click', askNew);
  }

  function drawBoard() {
    var b = el('gBoard');
    if (!S.history.length) {
      b.innerHTML =
        '<div class="g-empty"><b>我想了一組 ' + S.diff.len + ' 位數字</b>' +
        '猜猜看是哪幾個數字、排在什麼順序。<br>每猜一次我會告訴你：<br>' +
        '<i>A</i> = 數字對、位置也對<br>' +
        '<u>B</u> = 數字對、但位置不對' +
        (S.diff.rep ? '<br><br>這個難度，數字可能重複' : '') +
        '</div>';
      return;
    }
    var h = '<div class="g-rows">';
    for (var i = S.history.length - 1; i >= 0; i--) {
      var r = S.history[i];
      var m = (r.a === 0 && r.b === 0)
        ? '<span class="g-mark z">都不對</span>'
        : (r.a ? '<span class="g-mark a">' + r.a + 'A</span>' : '') +
          (r.b ? '<span class="g-mark b">' + r.b + 'B</span>' : '');
      h += '<div class="g-row"><span class="no">' + (i + 1) + '</span>' +
           '<span class="digits">' + r.g.join('') + '</span>' +
           '<span class="marks">' + m + '</span></div>';
    }
    b.innerHTML = h + '</div>';
  }

  function drawSlots() {
    var h = '';
    for (var i = 0; i < S.diff.len; i++) {
      var v = S.input[i];
      var cls = v === undefined ? (i === S.input.length ? 'g-slot next' : 'g-slot') : 'g-slot filled';
      h += '<div class="' + cls + '">' + (v === undefined ? '' : v) + '</div>';
    }
    el('gSlots').innerHTML = h;
  }

  function drawKeys() {
    var order = [1,2,3,4,5,6,7,8,9,0], h = '';
    for (var i = 0; i < 10; i++) {
      var d = order[i], cls = 'g-key';
      if (S.dead[d]) cls += ' off';
      else if (!S.diff.rep && S.input.indexOf(d) > -1) cls += ' used';
      h += '<button class="' + cls + '" data-d="' + d + '">' + d + '</button>';
    }
    el('gKeys').innerHTML = h;
    el('gGo').disabled = S.input.length !== S.diff.len;
    el('gDel').disabled = S.input.length === 0;
  }

  function draw() { drawBar(); drawBoard(); drawSlots(); drawKeys(); }

  /* ---------- 提示券 ---------- */
  function useHint() {
    if (S.done) return;
    if (App.items('hint') <= 0) {
      App.openSheet(
        '<h2>提示券用完了<small>提示券可以一次幫你劃掉兩個不在答案裡的數字</small></h2>' +
        '<button class="btn-main" data-act="shop">去商店買一張</button>' +
        '<button class="btn-ghost" data-act="no">先自己想</button>',
        function (b) {
          if (b.dataset.act === 'shop') { App.closeSheet(); App.openShop(); }
          else App.closeSheet();
        }
      );
      return;
    }
    var pool = [];
    for (var d = 0; d <= 9; d++) if (!S.dead[d] && S.secret.indexOf(d) === -1) pool.push(d);
    if (!pool.length) { tip('已經沒有可以排除的數字了'); return; }

    App.useItem('hint');
    S.hintUsed = true;
    var revealed = [];
    for (var i = 0; i < 2 && pool.length; i++) {
      var j = Math.floor(Math.random() * pool.length);
      S.dead[pool[j]] = 1;
      revealed.push(pool[j]);
      pool.splice(j, 1);
    }
    draw();
    tip('答案裡沒有 ' + revealed.join(' 和 '));
  }

  /* ---------- 難度 ---------- */
  function diffSheet(msg) {
    var h = '<h2>難度<small>玩得順了再往上調，不用急</small></h2><div class="opts">';
    for (var i = 0; i < DIFFS.length; i++) {
      var d = DIFFS[i];
      var best = App.store('best.' + d.key);
      var lk = locked(d);
      h += '<button class="opt ' + (d.key === S.diff.key ? 'on' : '') + (lk ? ' lockrow' : '') + '" data-diff="' + d.key + '">' +
             '<span class="nm">' + d.name + '</span>' +
             '<span class="tag">' + d.sub + '</span>' +
             '<span class="best">' + (lk ? '商店解鎖' : (best ? '最好 ' + best + ' 次' : '')) + '</span>' +
           '</button>';
    }
    h += '</div>' + (msg ? '<div class="shopmsg">' + msg + '</div>' : '') +
         '<button class="btn-main" data-act="ok">好</button>';

    App.openSheet(h, function (b) {
      if (b.dataset.diff) {
        var nd = null;
        for (var k = 0; k < DIFFS.length; k++) if (DIFFS[k].key === b.dataset.diff) nd = DIFFS[k];
        if (locked(nd)) { diffSheet('這個難度要先在商店解鎖'); return; }
        S.diff = nd;
        App.store('diff', nd.key);
        reset();
        diffSheet();
        return;
      }
      App.closeSheet();
    });
  }

  function askNew() {
    if (!S.history.length || S.done) { reset(); return; }
    App.openSheet(
      '<h2>換一組新的數字？<small>這局猜了 ' + S.history.length + ' 次，換掉就重來</small></h2>' +
      '<button class="btn-main" data-act="yes">好，換新的</button>' +
      '<button class="btn-ghost" data-act="no">繼續猜</button>',
      function (b) { App.closeSheet(); if (b.dataset.act === 'yes') reset(); }
    );
  }

  /* ---------- 一局結束 ---------- */
  function win() {
    var n = S.history.length;
    var bk = 'best.' + S.diff.key;
    var old = parseInt(App.store(bk) || '0', 10);
    var isBest = !old || n < old;
    if (isBest) App.store(bk, n);

    var earned = S.diff.base + Math.max(0, S.diff.par - n) * 3;
    App.addCoins(earned);

    var r1 = App.report({ type: 'finish', game: 'guess', len: S.diff.len, guesses: n, hintUsed: S.hintUsed });
    var r2 = App.report({ type: 'win', game: 'guess', len: S.diff.len, guesses: n, hintUsed: S.hintUsed });
    S.counted = true;

    var bonus = r1.earned + r2.earned;
    var doneTxt = r1.done.concat(r2.done);

    var idx = DIFFS.indexOf(S.diff);
    var next = DIFFS[idx + 1];
    var nextOk = next && !locked(next);

    App.openSheet(
      '<div class="g-win">' +
        '<div class="cap">答案是</div>' +
        '<div class="big">' + S.secret.join('') + '</div>' +
        '<div class="steps">猜了 <em>' + n + '</em> 次' +
          (isBest ? ' · 最好成績！' : (old ? ' · 最好 ' + old + ' 次' : '')) +
        '</div>' +
        '<div class="earn"><span class="coin"></span>+' + earned + ' 腦力點</div>' +
        (bonus ? '<div class="earn bonus">挑戰完成：' + doneTxt.join('、') + '　<span class="coin"></span>+' + bonus + '</div>' : '') +
        '<button class="btn-main" data-act="again">再玩一局</button>' +
        (nextOk ? '<button class="btn-ghost" data-act="up">試試看 ' + next.name + '（' + next.sub + '）</button>' : '') +
      '</div>',
      function (b) {
        if (b.dataset.act === 'up') {
          var k = DIFFS.indexOf(S.diff);
          if (DIFFS[k + 1] && !locked(DIFFS[k + 1])) { S.diff = DIFFS[k + 1]; App.store('diff', S.diff.key); }
        }
        App.closeSheet();
      },
      /* 不管用什麼方式關掉，都直接開新局，不要留一個按不動的鍵盤 */
      function () { reset(); }
    );
  }

  /* ---------- 掛載 ---------- */
  function mount(bodyEl, barEl) {
    host = bodyEl; bar = barEl;

    host.innerHTML =
      '<div class="g-board" id="gBoard"></div>' +
      '<div class="g-pad">' +
        '<div class="g-slots" id="gSlots"></div>' +
        '<div class="g-keys" id="gKeys"></div>' +
        '<div class="g-actions">' +
          '<button class="g-act" id="gDel">刪除</button>' +
          '<button class="g-act go" id="gGo">猜這個</button>' +
        '</div>' +
        '<div class="g-tip" id="gTip"></div>' +
      '</div>';

    var dk = App.store('diff'), d = DIFFS[0];
    for (var i = 0; i < DIFFS.length; i++) if (DIFFS[i].key === dk && !locked(DIFFS[i])) d = DIFFS[i];

    S = { diff: d, secret: [], input: [], history: [], dead: {}, hintUsed: false, counted: false, done: false };

    el('gKeys').addEventListener('click', function (e) {
      var b = e.target.closest('.g-key');
      if (!b || S.done) return;
      var v = parseInt(b.dataset.d, 10);
      if (S.input.length >= S.diff.len) { tip('已經滿了，按「猜這個」或先刪除'); return; }
      if (!S.diff.rep && S.input.indexOf(v) > -1) { tip('這個難度數字不能重複'); return; }
      S.input.push(v);
      tip('');
      drawSlots(); drawKeys();
    });

    el('gDel').addEventListener('click', function () {
      if (S.done || !S.input.length) return;
      S.input.pop(); tip(''); drawSlots(); drawKeys();
    });

    el('gGo').addEventListener('click', function () {
      if (S.done || S.input.length !== S.diff.len) return;
      var g = S.input.slice();
      var r = judge(g, S.secret);
      S.history.push({ g: g, a: r.a, b: r.b });
      if (r.a === 0 && r.b === 0) for (var i = 0; i < g.length; i++) S.dead[g[i]] = 1;
      S.input = [];
      tip('');
      if (r.a === S.diff.len) { S.done = true; win(); }
      draw();
    });

    reset();
  }

  function unmount() {
    /* 中途離開也算玩過一局，讓「玩滿 N 局」的挑戰跑得動 */
    if (S && S.history.length && !S.counted) {
      App.report({ type: 'finish', game: 'guess', len: S.diff.len, guesses: S.history.length, hintUsed: S.hintUsed });
      S.counted = true;
    }
    S = null; host = null; bar = null;
  }

  App.register({
    id: 'guess',
    name: '猜數字',
    tagline: '幾個數字、什麼順序',
    ready: true,
    mark:
      '<svg viewBox="0 0 52 52" fill="none" aria-hidden="true">' +
      '<rect x="1.5" y="12.5" width="14" height="18" rx="4" stroke="currentColor" stroke-width="2.5"/>' +
      '<rect x="19.5" y="12.5" width="14" height="18" rx="4" fill="currentColor"/>' +
      '<rect x="37.5" y="12.5" width="13" height="18" rx="4" stroke="currentColor" stroke-width="2.5"/>' +
      '<text x="26.5" y="27" text-anchor="middle" font-size="15" font-weight="700" font-family="monospace" fill="var(--surface)">?</text>' +
      '<path d="M4 42h9M22 42h9M40 42h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>' +
      '</svg>',
    score: function () {
      var best = App.store('best.n3') || App.store('best.n4');
      return best ? '最少猜中次數 ' + best + ' 次' : '';
    },
    mount: mount,
    unmount: unmount
  });
})();
