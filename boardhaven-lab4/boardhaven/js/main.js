// BoardHaven — сценарії (практична робота № 3, доповнено в лабораторній роботі № 4)
// Серверної частини немає: дані зберігаються в localStorage браузера, відправлення форм імітується.
(function () {
  'use strict';

  /* ---------- Допоміжне: модальні вікна на <dialog> ---------- */
  function openModal(id) {
    var d = document.getElementById(id);
    if (d && d.showModal && !d.open) d.showModal();
    return d;
  }
  function closeModal(el) {
    var d = el.closest ? el.closest('dialog') : el;
    if (d && d.open) d.close();
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  /* ---------- ЛР4: сховище (localStorage) ---------- */
  function getUser() { try { return localStorage.getItem('bh-user'); } catch (e) { return null; } }
  function setUser(v) { try { if (v) localStorage.setItem('bh-user', v); else localStorage.removeItem('bh-user'); } catch (e) {} }
  function loadBookings() { try { return JSON.parse(localStorage.getItem('bh-bookings')) || []; } catch (e) { return []; } }
  function saveBookings(a) { try { localStorage.setItem('bh-bookings', JSON.stringify(a)); } catch (e) {} }

  /* ---------- ЛР4: інтерактивна навігація (на всіх сторінках) ---------- */
  var navInner = document.querySelector('.navbar__inner');
  var navBox = document.querySelector('.navbar__nav');
  var loginLink = document.querySelector('.navbar__login');
  if (navInner && navBox) {
    document.documentElement.classList.add('js');
    var burger = document.createElement('button');
    burger.type = 'button'; burger.className = 'burger';
    burger.setAttribute('aria-label', 'Меню'); burger.setAttribute('aria-expanded', 'false');
    burger.textContent = '☰';
    navInner.appendChild(burger);
    var setMenu = function (open) {
      navBox.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    burger.addEventListener('click', function () { setMenu(!navBox.classList.contains('open')); });
    navBox.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }
  // Кнопка «Увійти» змінюється на «Вийти (ім’я)» після входу
  function paintAuth() {
    if (!loginLink) return;
    var u = getUser();
    loginLink.textContent = u ? 'Вийти (' + u + ')' : 'Увійти';
    loginLink.setAttribute('href', u ? '#' : 'login.html');
    loginLink.dataset.out = u ? '1' : '';
  }
  if (loginLink) {
    loginLink.addEventListener('click', function (e) {
      if (loginLink.dataset.out) { e.preventDefault(); setUser(null); paintAuth(); }
    });
    paintAuth();
  }

  /* ---------- ЛР4: перевірка даних форм ---------- */
  var RULES = {
    'email': function (v) { return !v ? 'Вкажіть електронну пошту' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Некоректна пошта, наприклад name@example.com' : ''; },
    'password': function (v) { return !v ? 'Вкажіть пароль' : v.length < 6 ? 'Пароль має містити щонайменше 6 символів' : ''; },
    'b-name': function (v) { return !v ? 'Вкажіть ім’я' : !/^[\p{L}' -]{2,40}$/u.test(v) ? 'Ім’я: 2–40 літер, без цифр' : ''; },
    'b-phone': function (v) {
      var d = v.replace(/[\s()-]/g, '');
      return !v ? 'Вкажіть телефон' : !/^\+380\d{9}$/.test(d) ? 'Формат телефону: +380 XX XXX XX XX' : '';
    }
  };
  function checkField(input) {
    var msg = RULES[input.id](input.value.trim());
    var err = document.getElementById('err-' + input.id);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    err.textContent = msg; err.hidden = !msg;
    return !msg;
  }
  function checkAll(ids) {
    var first = null;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!checkField(el) && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }
  function liveValidate(ids) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('blur', function () { checkField(el); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') checkField(el); });
    });
  }

  /* ---------- ЛР4: збережені бронювання на сторінці «Мої бронювання» ---------- */
  var savedList = document.getElementById('bookings');
  if (savedList) {
    loadBookings().forEach(function (x) {
      var row = document.createElement('article'); row.className = 'row'; row.dataset.id = x.id;
      var info = document.createElement('div');
      var h = document.createElement('h2'); h.className = 'row__title'; h.textContent = x.game;
      var m = document.createElement('p'); m.className = 'row__meta';
      m.textContent = x.date + ', ' + x.time + ' · Стіл ' + x.table + ' · ' + x.guests + ' ' + plural(x.guests, 'гравець', 'гравці', 'гравців');
      info.appendChild(h); info.appendChild(m);
      var side = document.createElement('div'); side.className = 'row__side';
      var isCancelled = x.status === 'cancelled';
      var bd = document.createElement('span');
      bd.className = isCancelled ? 'badge badge--neutral' : 'badge badge--success';
      bd.textContent = isCancelled ? 'Скасовано' : 'Підтверджено';
      side.appendChild(bd);
      if (!isCancelled) {
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn--secondary btn--sm';
        btn.setAttribute('data-cancel', ''); btn.setAttribute('data-open', 'modal-cancel'); btn.textContent = 'Скасувати';
        side.appendChild(btn);
      } else {
        var delBtn = document.createElement('button'); delBtn.type = 'button'; delBtn.className = 'btn btn--secondary btn--sm';
        delBtn.setAttribute('data-delete', ''); delBtn.textContent = 'Видалити';
        side.appendChild(delBtn);
      }
      row.appendChild(info); row.appendChild(side);
      savedList.insertBefore(row, savedList.firstChild);
    });
  }

  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) openModal(o.dataset.open);
    var c = e.target.closest('[data-close]');
    if (c) closeModal(c);
    if (e.target.tagName === 'DIALOG') closeModal(e.target);
  });

  /* ---------- Каталог: Tag-фільтри (умови поєднуються через «і») ---------- */
  var catalog = document.getElementById('catalog');
  if (catalog) {
    var filters = {
      'players-2': function (c) { return +c.dataset.min <= 2 && 2 <= +c.dataset.max; },
      'players-4': function (c) { return +c.dataset.min <= 4 && 4 <= +c.dataset.max; },
      'players-6': function (c) { return +c.dataset.max >= 6; },
      'time-30':   function (c) { return +c.dataset.time <= 30; },
      'time-60':   function (c) { return +c.dataset.time <= 60; },
      'diff-low':  function (c) { return +c.dataset.diff <= 2; },
      'diff-high': function (c) { return +c.dataset.diff >= 3; }
    };
    var tags = document.querySelectorAll('[data-filter]');
    var items = catalog.querySelectorAll('li');
    var counter = document.getElementById('result-count');
    var empty = document.getElementById('empty');
    var search = document.getElementById('search');
    var sortSel = document.getElementById('sort');

    function applyFilters() {
      var active = [];
      tags.forEach(function (t) { if (t.getAttribute('aria-pressed') === 'true') active.push(filters[t.dataset.filter]); });
      var query = search ? search.value.trim().toLowerCase() : '';
      var shown = 0;
      items.forEach(function (li) {
        var card = li.querySelector('.card');
        var ok = active.every(function (f) { return f(card); }) &&
          li.querySelector('.card__title').textContent.toLowerCase().indexOf(query) !== -1;
        li.hidden = !ok;
        if (ok) shown++;
      });
      counter.textContent = 'Знайдено ігор: ' + shown;
      empty.hidden = shown !== 0;
    }
    tags.forEach(function (t) {
      t.addEventListener('click', function () {
        t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        applyFilters();
      });
    });
    // ЛР4: пошук за назвою та сортування
    function sortItems() {
      var key = sortSel.value;
      var val = function (li) {
        return key === 'name' ? li.querySelector('.card__title').textContent : +li.querySelector('.card').dataset[key];
      };
      Array.prototype.slice.call(items).sort(function (a, b) {
        return key === 'name' ? val(a).localeCompare(val(b), 'uk') : val(a) - val(b);
      }).forEach(function (li) { catalog.appendChild(li); });
    }
    if (search) search.addEventListener('input', applyFilters);
    if (sortSel) sortSel.addEventListener('change', sortItems);
  }

  /* ---------- Події: фільтр і запис ---------- */
  var events = document.getElementById('events');
  if (events) {
    var evTags = document.querySelectorAll('button[data-kind]'); // лише кнопки-фільтри, а не картки подій із таким самим атрибутом
    evTags.forEach(function (t) {
      t.addEventListener('click', function () {
        evTags.forEach(function (o) { o.setAttribute('aria-pressed', o === t ? 'true' : 'false'); });
        events.querySelectorAll('.row').forEach(function (r) {
          r.hidden = !(t.dataset.kind === 'all' || r.dataset.kind === t.dataset.kind);
        });
      });
    });

    var currentEvent = null;
    events.querySelectorAll('[data-event-btn]').forEach(function (b) {
      b.addEventListener('click', function () {
        currentEvent = b.closest('.row');
        var wait = currentEvent.dataset.full === 'true';
        var title = currentEvent.querySelector('.row__title').textContent;
        document.getElementById('mc-title').textContent = wait ? 'Додати у список очікування?' : 'Записатися на подію?';
        document.getElementById('mc-text').textContent = '«' + title + '»';
        document.getElementById('ms-title').textContent = wait ? 'Вас додано до списку очікування' : 'Ви записані';
        document.getElementById('ms-text').textContent = wait
          ? 'Ми повідомимо вас, щойно з’явиться вільне місце.'
          : 'Чекаємо на вас у клубі. Подію додано до вашого профілю.';
      });
    });
    var evYes = document.getElementById('confirm-yes');
    evYes.addEventListener('click', function () {
      closeModal(evYes);
      if (currentEvent) {
        var btn = currentEvent.querySelector('[data-event-btn]');
        btn.textContent = currentEvent.dataset.full === 'true' ? 'У списку очікування' : 'Ви записані';
        btn.disabled = true;
      }
      openModal('modal-success');
    });
  }

  /* ---------- Мої бронювання: скасування та видалення ---------- */
  var bookings = document.getElementById('bookings');
  if (bookings) {
    var currentBooking = null;
    bookings.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cancel]');
      if (b) {
        currentBooking = b.closest('.row');
        return;
      }
      var d = e.target.closest('[data-delete]');
      if (d) {
        var row = d.closest('.row');
        if (row.dataset.id) {
          saveBookings(loadBookings().filter(function (x) { return String(x.id) !== row.dataset.id; }));
        }
        row.remove();
        return;
      }
    });
    var cancelYes = document.getElementById('cancel-yes');
    if (cancelYes) {
      cancelYes.addEventListener('click', function () {
        closeModal(cancelYes);
        if (!currentBooking) return;
        if (currentBooking.dataset.soon === 'true') {
          openModal('modal-error'); // скасування менш ніж за 2 години неможливе
          return;
        }
        var badge = currentBooking.querySelector('.badge');
        if (badge) {
          badge.className = 'badge badge--neutral';
          badge.textContent = 'Скасовано';
        }
        var cBtn = currentBooking.querySelector('[data-cancel]');
        if (cBtn) {
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn btn--secondary btn--sm';
          delBtn.setAttribute('data-delete', '');
          delBtn.textContent = 'Видалити';
          cBtn.parentNode.replaceChild(delBtn, cBtn);
        }
        if (currentBooking.dataset.id) {
          var all = loadBookings();
          all.forEach(function (x) {
            if (String(x.id) === currentBooking.dataset.id) x.status = 'cancelled';
          });
          saveBookings(all);
        }
        openModal('modal-success');
      });
    }
  }

  /* ---------- Вхід ---------- */
  var login = document.getElementById('login-form');
  if (login) {
    liveValidate(['email', 'password']);
    login.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!checkAll(['email', 'password'])) return;
      setUser(document.getElementById('email').value.trim().split('@')[0]);
      paintAuth();
      openModal('modal-success');
    });
  }

  /* ---------- Бронювання: три кроки на одній сторінці ---------- */
  var wizard = document.getElementById('wizard');
  if (wizard) {
    var GAMES = {
      catan:       { name: 'Catan',       min: 3, max: 4 },
      dixit:       { name: 'Dixit',       min: 3, max: 8 },
      pandemic:    { name: 'Pandemic',    min: 2, max: 4 },
      carcassonne: { name: 'Carcassonne', min: 2, max: 5 },
      codenames:   { name: 'Codenames',   min: 4, max: 8 },
      wingspan:    { name: 'Wingspan',    min: 1, max: 5 }
    };
    var TABLES = [
      { n: 1, cap: 2 }, { n: 2, cap: 4 }, { n: 3, cap: 4 },
      { n: 4, cap: 6 }, { n: 5, cap: 8 }, { n: 6, cap: 8 }
    ];
    // Зайняті столи залежать від обраного часу (імітація даних сервера)
    var BUSY = { '14:00': [3], '16:00': [2, 5], '18:00': [2, 4], '20:00': [4, 6] };
    var WEEK = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    var MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

    var key = new URLSearchParams(location.search).get('game');
    var game = GAMES[key] || GAMES.catan;
    var state = { date: null, time: null, guests: game.min, table: null };
    var step = 1;

    var title = document.getElementById('wizard-title');
    var stepEls = wizard.querySelectorAll('.step');
    var stepItems = document.querySelectorAll('.steps li');
    var datesBox = document.getElementById('dates');
    var timesBox = document.getElementById('times');
    var tablesBox = document.getElementById('tables');
    var guestsSel = document.getElementById('guests');
    var TITLES = { 1: 'Бронювання: ' + game.name, 2: 'Оберіть стіл', 3: 'Підтвердження' };

    // Дати: найближчі три дні
    for (var i = 1; i <= 3; i++) {
      var d = new Date(); d.setDate(d.getDate() + i);
      var label = WEEK[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tag'; b.textContent = label;
      b.setAttribute('aria-pressed', i === 1 ? 'true' : 'false');
      if (i === 1) state.date = label;
      b.addEventListener('click', pickDate.bind(null, b, label));
      datesBox.appendChild(b);
    }
    function pickDate(btn, label) {
      datesBox.querySelectorAll('.tag').forEach(function (t) { t.setAttribute('aria-pressed', t === btn ? 'true' : 'false'); });
      state.date = label;
    }

    // Час
    timesBox.querySelectorAll('.slot').forEach(function (s) {
      s.addEventListener('click', function () {
        timesBox.querySelectorAll('.slot').forEach(function (o) { o.setAttribute('aria-pressed', o === s ? 'true' : 'false'); });
        state.time = s.dataset.time;
        document.getElementById('hint-time').hidden = true;
      });
    });

    // Кількість гравців — у межах, які дозволяє гра
    for (var g = game.min; g <= game.max; g++) {
      var o = document.createElement('option'); o.value = g; o.textContent = g; guestsSel.appendChild(o);
    }
    guestsSel.addEventListener('change', function () { state.guests = +guestsSel.value; });

    function renderTables() {
      var saved = loadBookings().filter(function (x) {
        return x.status !== 'cancelled' && x.date === state.date && x.time === state.time;
      }).map(function (x) { return Number(x.table); });
      var busy = (BUSY[state.time] || []).concat(saved);
      if (state.table && (busy.indexOf(state.table) !== -1 || TABLES[state.table - 1].cap < state.guests)) state.table = null;
      tablesBox.innerHTML = '';
      TABLES.forEach(function (t) {
        var unavailable = busy.indexOf(t.n) !== -1 || t.cap < state.guests;
        var s = document.createElement('button');
        s.type = 'button'; s.className = 'slot';
        s.innerHTML = 'Стіл ' + t.n + '<small>до ' + t.cap + ' осіб</small>';
        s.disabled = unavailable;
        s.setAttribute('aria-pressed', state.table === t.n ? 'true' : 'false');
        s.addEventListener('click', function () {
          state.table = t.n;
          renderTables();
          document.getElementById('hint-table').hidden = true;
        });
        tablesBox.appendChild(s);
      });
    }

    function renderSummary() {
      document.getElementById('sum-game').textContent = game.name;
      document.getElementById('sum-date').textContent = state.date + ', ' + state.time;
      document.getElementById('sum-table').textContent = 'Стіл ' + state.table;
      document.getElementById('sum-guests').textContent = state.guests + ' ' + plural(state.guests, 'гравець', 'гравці', 'гравців');
    }

    function go(n) {
      step = n;
      stepEls.forEach(function (el) { el.hidden = +el.dataset.step !== n; });
      stepItems.forEach(function (li, i) {
        if (i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      title.textContent = TITLES[n];
      if (n === 2) renderTables();
      if (n === 3) renderSummary();
      title.focus();
    }

    document.getElementById('to-2').addEventListener('click', function () {
      if (!state.time) { document.getElementById('hint-time').hidden = false; return; }
      go(2);
    });
    document.getElementById('back-1').addEventListener('click', function () { go(1); });
    document.getElementById('to-3').addEventListener('click', function () {
      if (!state.table) { document.getElementById('hint-table').hidden = false; return; }
      go(3);
    });
    document.getElementById('back-2').addEventListener('click', function () { go(2); });
    liveValidate(['b-name', 'b-phone']);
    document.getElementById('confirm-booking').addEventListener('click', function () {
      if (!checkAll(['b-name', 'b-phone'])) return;
      var all = loadBookings();
      var taken = all.some(function (x) {
        return x.status !== 'cancelled' && x.date === state.date && x.time === state.time && Number(x.table) === state.table;
      });
      // повторне натискання після закриття вікна не повинно створювати дублікат
      if (!taken) {
        all.push({ id: Date.now(), game: game.name, date: state.date, time: state.time, table: state.table, guests: state.guests, status: 'confirmed' });
        saveBookings(all);
      }
      document.getElementById('confirm-booking').disabled = true;
      openModal('modal-success');
    });

    title.textContent = TITLES[1];
    document.title = 'Бронювання: ' + game.name + ' — BoardHaven';
  }
})();
