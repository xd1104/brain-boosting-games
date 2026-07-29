/* ===========================================================
   動動腦 — 外殼
   遊戲登記 / 路由 / 大廳 / 腦力點經濟 / 每日挑戰 / 商店
   遊戲各自是一個模組，用 App.register() 掛進來
   =========================================================== */
var App = (function () {

  var games = [];
  var current = null;
  var appEl, veil, sheetEl;

  /* ---------- 儲存 ---------- */
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem('bg.' + k);
      localStorage.setItem('bg.' + k, v);
    } catch (e) { return null; }
  }
  function num(k) { return parseInt(store(k) || '0', 10); }

  function dayNo() { return Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000); }

  /* ---------- 腦力點 ---------- */
  function coins() { return num('coins'); }
  function addCoins(n) { store('coins', coins() + n); }
  function spend(n) { if (coins() < n) return false; store('coins', coins() - n); return true; }

  /* ---------- 商店 ---------- */
  var SHOP = [
    { id: 'hint', name: '提示券', price: 30, kind: 'item',
      desc: '猜數字用：一次幫你劃掉兩個不在答案裡的數字' },
    { id: 'n5', name: '解鎖　5 位數', price: 150, kind: 'unlock',
      desc: '猜數字的進階難度，多一位就難很多' },
    { id: 'r4', name: '解鎖　數字可重複', price: 400, kind: 'unlock',
      desc: '猜數字最硬的玩法，答案可能出現兩個一樣的數字' }
  ];

  function owns(id) { return store('own.' + id) === '1'; }
  function items(id) { return num('item.' + id); }
  function useItem(id) { var n = items(id); if (n <= 0) return false; store('item.' + id, n - 1); return true; }

  /* ---------- 每日挑戰 ----------
     事件由遊戲回報：finish(結束一局) / win(猜中)
     完成就自動入袋，不用再按一次領取 */
  var CHALLENGES = [
    { id: 'play3',  text: '玩滿 3 局',            goal: 3, coin: 10, hit: function (e) { return e.type === 'finish'; } },
    { id: 'win2',   text: '完成 2 局',            goal: 2, coin: 12, hit: function (e) { return e.type === 'win'; } },
    { id: 'win5',   text: '一天完成 5 局',        goal: 5, coin: 20, hit: function (e) { return e.type === 'win'; } },
    { id: 'sud1',   text: '解完一題數獨',          goal: 1, coin: 14, hit: function (e) { return e.type === 'win' && e.game === 'sudoku'; } },
    { id: 'sudNo',  text: '數獨全程不填錯',        goal: 1, coin: 18, hit: function (e) { return e.type === 'win' && e.game === 'sudoku' && e.mistakes === 0; } },
    { id: 'gue1',   text: '猜中一局猜數字',        goal: 1, coin: 14, hit: function (e) { return e.type === 'win' && e.game === 'guess'; } },
    { id: 'gom1',   text: '五子棋贏電腦一局',      goal: 1, coin: 16, hit: function (e) { return e.type === 'win' && e.game === 'gomoku'; } },
    { id: 'gomTry', text: '下一局五子棋',          goal: 1, coin: 10, hit: function (e) { return e.type === 'finish' && e.game === 'gomoku'; } },
    { id: 'quick',  text: '8 次以內猜中一局',      goal: 1, coin: 15, hit: function (e) { return e.type === 'win' && e.game === 'guess' && e.guesses <= 8; } },
    { id: 'try4',   text: '挑戰一局 4 位數以上',   goal: 1, coin: 12, hit: function (e) { return e.type === 'finish' && e.game === 'guess' && e.len >= 4; } }
  ];

  /* 每天固定挑三個，同一天永遠一樣，不會因為重開而換掉 */
  function todayChallenges() {
    var d = dayNo(), out = [];
    for (var i = 0; i < 3; i++) out.push(CHALLENGES[(d * 3 + i) % CHALLENGES.length]);
    return out;
  }

  function progressKey() { return 'ch.' + dayNo(); }
  function progress() {
    try { return JSON.parse(store(progressKey()) || '{}'); } catch (e) { return {}; }
  }
  function saveProgress(p) { store(progressKey(), JSON.stringify(p)); }

  /* 遊戲呼叫這個回報一局的結果 */
  function report(e) {
    var list = todayChallenges(), p = progress(), earned = 0, done = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i], cur = p[c.id] || 0;
      if (cur >= c.goal) continue;
      if (c.hit(e)) {
        cur++;
        p[c.id] = cur;
        if (cur >= c.goal) { earned += c.coin; done.push(c.text); }
      }
    }
    saveProgress(p);
    if (earned) addCoins(earned);
    return { earned: earned, done: done };
  }

  /* ---------- 底部面板 ---------- */
  var sheetClick = null, sheetDismiss = null;

  function openSheet(html, onClick, onDismiss) {
    sheetEl.innerHTML = html;
    sheetClick = onClick || null;
    sheetDismiss = onDismiss || null;
    veil.classList.add('on');
  }

  function closeSheet() {
    var wasOpen = veil.classList.contains('on');
    veil.classList.remove('on');
    sheetClick = null;
    var d = sheetDismiss;
    sheetDismiss = null;
    /* 等淡出結束再清掉內容，不然關掉的面板還留在畫面結構裡（螢幕閱讀器會讀到） */
    if (wasOpen) setTimeout(function () {
      if (!veil.classList.contains('on')) sheetEl.innerHTML = '';
    }, 220);
    if (wasOpen && d) d();
  }

  /* ---------- 字體大小 ---------- */
  function applyFontSize() {
    document.documentElement.setAttribute('data-fs', store('fs') === '2' ? '2' : '1');
  }

  /* ---------- 文案小工具 ---------- */
  function greet() {
    var h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 11) return '早安';
    if (h < 18) return '午安';
    return '晚安';
  }
  function dateLine() {
    var d = new Date();
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 · 星期' + ['日','一','二','三','四','五','六'][d.getDay()];
  }

  /* ---------- 大廳 ---------- */
  function lobby() {
    var h = '<div class="lobby">' +
      '<div class="lobtop">' +
        '<div>' +
          '<div class="date">' + dateLine() + '</div>' +
          '<div class="hi">' + greet() + '</div>' +
        '</div>' +
        '<button class="purse" data-shop="1" aria-label="打開商店">' +
          '<span class="coin"></span><b>' + coins() + '</b><span class="shoplb">商店</span>' +
        '</button>' +
      '</div>' +
      '<div class="eyebrow">選一個來玩</div>' +
      '<div class="cards">';

    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      var sc = g.ready && g.score ? g.score() : '';
      h += '<button class="card' + (g.ready ? '' : ' soon') + '" data-go="' + g.id + '"' + (g.ready ? '' : ' disabled') + '>' +
             '<span class="mark">' + g.mark + '</span>' +
             '<span class="txt">' +
               '<span class="nm">' + g.name + '</span>' +
               '<span class="tg">' + g.tagline + '</span>' +
               (sc ? '<span class="sc">' + sc + '</span>' : '') +
             '</span>' +
             (g.ready ? '<span class="go"></span>' : '<span class="badge">準備中</span>') +
           '</button>';
    }
    h += '</div>';

    /* 今天的挑戰 */
    var list = todayChallenges(), p = progress(), doneN = 0;
    for (var j = 0; j < list.length; j++) if ((p[list[j].id] || 0) >= list[j].goal) doneN++;

    h += '<div class="eyebrow spaced">今天的挑戰　<span class="cnt">' + doneN + ' / ' + list.length + '</span></div>' +
         '<div class="quests">';
    for (var k = 0; k < list.length; k++) {
      var c = list[k], cur = Math.min(p[c.id] || 0, c.goal), ok = cur >= c.goal;
      h += '<div class="quest' + (ok ? ' ok' : '') + '">' +
             '<span class="tick"></span>' +
             '<span class="qt">' + c.text + (c.goal > 1 ? ' <i>' + cur + '/' + c.goal + '</i>' : '') + '</span>' +
             '<span class="qc"><span class="coin"></span>' + c.coin + '</span>' +
           '</div>';
    }
    h += '</div>';

    h += '<div class="prefs"><span class="lb">字體大小</span>' +
           '<span class="seg">' +
             '<button data-setfs="1" class="' + (store('fs') === '2' ? '' : 'on') + '">標準</button>' +
             '<button data-setfs="2" class="' + (store('fs') === '2' ? 'on' : '') + '">大</button>' +
           '</span>' +
         '</div>' +
         '<div class="ver">版本 ==VERSION==</div>' +
       '</div>';

    appEl.innerHTML = h;
  }

  /* ---------- 商店 ---------- */
  function shop(msg) {
    var h = '<h2>商店<small>玩遊戲賺腦力點，這裡花掉</small></h2>' +
            '<div class="purse-big"><span class="coin"></span><b>' + coins() + '</b> 腦力點</div>' +
            (msg ? '<div class="shopmsg">' + msg + '</div>' : '') +
            '<div class="opts">';
    for (var i = 0; i < SHOP.length; i++) {
      var s = SHOP[i];
      var got = s.kind === 'unlock' ? owns(s.id) : false;
      var have = s.kind === 'item' ? items(s.id) : 0;
      var afford = coins() >= s.price;
      h += '<div class="shopitem' + (got ? ' got' : '') + '">' +
             '<div class="si-txt">' +
               '<div class="nm">' + s.name + (have ? ' <i>已有 ' + have + ' 張</i>' : '') + '</div>' +
               '<div class="tg">' + s.desc + '</div>' +
             '</div>' +
             (got
               ? '<span class="si-got">已解鎖</span>'
               : '<button class="si-buy' + (afford ? '' : ' poor') + '" data-buy="' + s.id + '">' +
                   '<span class="coin"></span>' + s.price + '</button>') +
           '</div>';
    }
    h += '</div><button class="btn-main" data-act="close">回大廳</button>';

    openSheet(h, function (b) {
      if (b.dataset.buy) { buy(b.dataset.buy); return; }
      closeSheet();
    }, lobby);
  }

  function buy(id) {
    var s = null;
    for (var i = 0; i < SHOP.length; i++) if (SHOP[i].id === id) s = SHOP[i];
    if (!s) return;
    if (s.kind === 'unlock' && owns(s.id)) return;
    if (coins() < s.price) { shop('腦力點還不夠，再玩幾局就有了'); return; }
    spend(s.price);
    if (s.kind === 'unlock') { store('own.' + s.id, '1'); shop('買好了，' + s.name.replace(/解鎖　/, '') + ' 可以玩了'); }
    else { store('item.' + s.id, items(s.id) + 1); shop('買好了，遊戲裡按「提示」就能用'); }
  }

  /* ---------- 怎麼玩 ----------
     數獨大家都會，但數織、五子棋的規則不能假設長輩知道。
     第一次進遊戲自動跳出來，之後右上角問號隨時可以再看。 */
  function helpSheet(g) {
    if (!g || !g.help) return;
    openSheet(
      '<h2>怎麼玩 · ' + g.name + '</h2><div class="help">' + g.help + '</div>' +
      '<button class="btn-main" data-act="ok">知道了，開始玩</button>',
      function () { closeSheet(); }
    );
  }

  /* ---------- 路由 ---------- */
  function route() {
    if (current && current.unmount) current.unmount();
    current = null;
    closeSheet();

    var id = (location.hash || '').replace(/^#\/?/, '');
    var g = null;
    for (var i = 0; i < games.length; i++) if (games[i].id === id && games[i].ready) g = games[i];

    if (!g) { lobby(); return; }

    appEl.innerHTML =
      '<div class="game">' +
        '<div class="gamebar">' +
          '<button class="iconbtn" id="backBtn" aria-label="回到大廳">&#8592;</button>' +
          '<div class="barslot" id="barslot"></div>' +
          (g.help ? '<button class="iconbtn" id="helpBtn" aria-label="怎麼玩">?</button>' : '') +
        '</div>' +
        '<div class="gamebody" id="gamebody"></div>' +
      '</div>';

    document.getElementById('backBtn').addEventListener('click', function () { location.hash = ''; });
    if (g.help) {
      document.getElementById('helpBtn').addEventListener('click', function () { helpSheet(g); });
    }
    current = g;
    g.mount(document.getElementById('gamebody'), document.getElementById('barslot'));

    /* 第一次玩這款就自動說明一次，看過就不再擋路 */
    if (g.help && store('seen.' + g.id) !== '1') {
      store('seen.' + g.id, '1');
      helpSheet(g);
    }
  }

  /* ---------- 啟動 ---------- */
  function boot() {
    appEl = document.getElementById('app');
    veil = document.getElementById('veil');
    sheetEl = document.getElementById('sheet');

    veil.addEventListener('click', function (e) { if (e.target === veil) closeSheet(); });
    sheetEl.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b && sheetClick) sheetClick(b);
    });

    appEl.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (go) { location.hash = '/' + go.dataset.go; return; }
      if (e.target.closest('[data-shop]')) { shop(); return; }
      /* 注意：屬性名不能跟 <html data-fs> 撞名，否則 closest() 會一路找到 html，
         變成遊戲裡按任何東西都被當成在調字體、然後被踢回大廳 */
      var fs = e.target.closest('[data-setfs]');
      if (fs) { store('fs', fs.dataset.setfs); applyFontSize(); lobby(); }
    });

    window.addEventListener('hashchange', route);
    applyFontSize();
    route();
  }

  return {
    register: function (g) { games.push(g); },
    store: store,
    coins: coins,
    addCoins: addCoins,
    owns: owns,
    items: items,
    useItem: useItem,
    report: report,
    openSheet: openSheet,
    closeSheet: closeSheet,
    openShop: shop,
    boot: boot
  };
})();
