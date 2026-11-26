'use strict';
// Carrito compartido (localStorage) + vistas de inicio, producto y carrito.
(function () {
  var P = window.PRODUCTS, KEY = 'slow-clay-cart';
  function $(id) { return document.getElementById(id); }
  // Validación de campos: ayuda a quien escribe y evita datos raros. La protección de verdad es que
  // todo lo que escribe el usuario se muestra con textContent, nunca como HTML.
  var NAME_RE = /^\p{L}(?:[\p{L}\p{M}]|['’ -](?=\p{L}))*$/u;
  function clean(v) { return String(v || '').normalize('NFC').replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function cleanLong(v) { return String(v || '').normalize('NFC').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
  function nameMsg(v, min, max, empty) {
    if (!v) return empty;
    if (/[^\p{L}\p{M}\d '’-]/u.test(v)) return 'Use letters, spaces, apostrophes and hyphens only (no symbols like < > / ; =).';
    if (/\d/.test(v)) return 'Names can’t contain numbers.';
    if (!NAME_RE.test(v)) return 'Use letters, spaces, apostrophes and hyphens only.';
    if (v.length < min) return 'Enter at least ' + min + ' letters.';
    if (v.length > max) return max + ' characters max.';
    return '';
  }
  function phoneMsg(v, min, short) {
    if (/(?!^\+)\D/.test(v)) return 'Phone numbers use digits only (and + at the start for a country code).';
    var d = v.replace(/\D/g, '');
    if (d.length < min) return short;
    if (d.length > 15) return 'Too many digits. Check the number.';
    return '';
  }
  function textMsg(v, max) {
    if (/[<>]/.test(v)) return 'Please leave out the < and > characters.';
    if (max && v.length > max) return max + ' characters max.';
    return '';
  }
  function isCharMsg(m) { return /numbers|letters, spaces|digits only|only accepts|characters\./.test(m); }
  // Valida al escribir solo si hay un carácter no permitido (o si el campo ya estaba marcado), y siempre al salir del campo
  function live(input, rule, show) {
    input.addEventListener('input', function () { var m = rule(input.value); if (input.getAttribute('aria-invalid') === 'true' || isCharMsg(m)) show(m); });
    input.addEventListener('blur', function () { if (input.value) show(rule(input.value)); });
  }
  // Filtro al escribir o pegar: quita lo que no corresponde al tipo de campo y lo avisa.
  var FILTERS = {
    name: [/[^\p{L}\p{M} '’-]/gu, 'This field only accepts letters, spaces, apostrophes and hyphens.'],
    digits: [/\D/g, 'This field only accepts numbers.'],
    phone: [/(?!^\+)\D/g, 'Phone numbers only accept digits (and + at the start for a country code).'],
    user: [/[^A-Za-z0-9._-]/g, 'Usernames use plain letters, numbers, dots and hyphens only.'],
    text: [/[<>]/g, 'The < and > characters aren’t allowed.']
  };
  function filter(input, kind, show) {
    input.addEventListener('input', function () {
      var k = typeof kind === 'function' ? kind() : kind, f = FILTERS[k];
      if (!f) return;
      var v = input.value, c = v.replace(f[0], '');
      if (c === v) return;
      var pos = Math.max(0, (input.selectionStart || c.length) - (v.length - c.length));
      input.value = c;
      try { input.setSelectionRange(pos, pos); } catch (e) {}
      if (show) show(f[1]);
    });
  }
  // Campos type=number: bloquea e, E, +, -, punto y coma (el navegador sí los deja escribir)
  function digitsOnlyNumber(input) {
    input.addEventListener('keydown', function (e) { if (['e', 'E', '+', '-', '.', ','].indexOf(e.key) > -1) e.preventDefault(); });
    input.addEventListener('paste', function (e) { var t = (e.clipboardData || window.clipboardData).getData('text'); if (/\D/.test(t)) e.preventDefault(); });
  }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k]; else if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function usd(v) { return '$' + v.toFixed(2).replace(/\.00$/, ''); }
  function find(id) { return P.filter(function (p) { return p.id === id; })[0]; }
  function load() {
    try { var c = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(c) ? c.filter(function (l) { var p = l && find(l.id); return p && p.v.indexOf(l.v) > -1 && Number.isInteger(l.q) && l.q > 0 && l.q < 50; }) : []; }
    catch (e) { return []; }
  }
  function save(c) { localStorage.setItem(KEY, JSON.stringify(c)); badge(); }
  function count() { return load().reduce(function (s, l) { return s + l.q; }, 0); }
  function badge() { var b = $('cart-count'); if (b) { var n = count(); b.textContent = n; b.hidden = !n; } }
  function add(id, v, q) {
    var c = load(), p = find(id), line = c.filter(function (l) { return l.id === id && l.v === v; })[0];
    if (line) line.q = Math.min(p.stock, line.q + q); else c.push({ id: id, v: v, q: Math.min(p.stock, q) });
    save(c);
  }
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.hidden = false; clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function card(p) {
    return el('li', { class: 'card' }, [
      el('a', { href: 'product.html?p=' + p.id }, [
        el('img', { src: '../img/' + p.img + '-400.webp', srcset: '../img/' + p.img + '-400.webp 400w, ../img/' + p.img + '-800.webp 800w', sizes: '(min-width: 900px) 30vw, 50vw', width: '800', height: '800', alt: p.n + ', ' + p.t.split('.')[0].toLowerCase(), loading: 'lazy' }),
        el('span', { class: 'card-name', text: p.n }),
        el('span', { class: 'card-price', text: usd(p.p) }),
        el('span', { class: 'card-stock' + (p.stock <= 5 ? ' low' : ''), text: p.stock <= 5 ? 'Only ' + p.stock + ' left' : 'In stock' })
      ])
    ]);
  }

  badge();
  var page = document.body.dataset.page;

  if (page === 'home') {
    var grid = $('grid'); P.forEach(function (p) { grid.appendChild(card(p)); });
  }

  if (page === 'product') {
    var id = new URLSearchParams(location.search).get('p');
    var p = find(id) || P[0];
    document.title = p.n + ' · Slow Clay, handmade ceramics';
    var meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', p.n + ': ' + p.t.split('.')[0] + '. ' + usd(p.p) + '.');
    var img = $('p-img');
    img.sizes = '(min-width: 900px) 50vw, 100vw'; img.srcset = '../img/' + p.img + '-400.webp 400w, ../img/' + p.img + '-800.webp 800w'; img.src = '../img/' + p.img + '-800.webp'; img.alt = p.n + ' on a pale plaster background';
    $('p-cat').textContent = p.cat; $('p-name').textContent = p.n; $('p-price').textContent = usd(p.p);
    $('p-desc').textContent = p.t; $('p-size').textContent = p.size;
    $('p-stock').textContent = p.stock <= 4 ? 'Only ' + p.stock + ' left from this batch' : 'In stock, ships in 2 business days';
    var sel = $('p-var'); p.v.forEach(function (v) { sel.appendChild(el('option', { value: v, text: v })); });
    var qty = $('p-qty'); qty.max = String(p.stock); digitsOnlyNumber(qty);
    $('p-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = Math.max(1, Math.min(p.stock, parseInt(qty.value, 10) || 1));
      add(p.id, sel.value, q); toast('Added: ' + q + ' × ' + p.n + ' (' + sel.value + ')');
    });
    var more = $('more'); P.filter(function (x) { return x.id !== p.id; }).slice(0, 3).forEach(function (x) { more.appendChild(card(x)); });
    var ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.n, description: p.t, image: 'https://jormanj2b.github.io/demo-tienda/img/' + p.img + '-800.webp',
      brand: { '@type': 'Brand', name: 'Slow Clay' }, offers: { '@type': 'Offer', price: String(p.p), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: location.href } };
    var s = el('script', { type: 'application/ld+json' }); s.textContent = JSON.stringify(ld); document.head.appendChild(s);
  }

  if (page === 'cart') {
    var linesEl = $('lines'), form = $('checkout');
    function totals() {
      var c = load(), sub = c.reduce(function (s, l) { return s + find(l.id).p * l.q; }, 0);
      var ship = sub === 0 || sub >= 120 ? 0 : 9;
      return { c: c, sub: sub, ship: ship, total: sub + ship };
    }
    function render() {
      var t = totals(); linesEl.textContent = '';
      $('empty').hidden = !!t.c.length; $('cart-body').hidden = !t.c.length;
      document.documentElement.classList.toggle('cart-empty', !t.c.length);
      t.c.forEach(function (l, idx) {
        var p = find(l.id);
        var q = el('input', { type: 'number', min: '1', max: String(p.stock), value: String(l.q), 'aria-label': 'Quantity of ' + p.n, inputmode: 'numeric' });
        q.addEventListener('change', function () { var c = load(); c[idx].q = Math.max(1, Math.min(p.stock, parseInt(q.value, 10) || 1)); save(c); render(); });
        var rm = el('button', { type: 'button', class: 'link', text: 'Remove' });
        rm.addEventListener('click', function () { var c = load(); c.splice(idx, 1); save(c); render(); });
        linesEl.appendChild(el('li', { class: 'line' }, [
          el('img', { src: '../img/' + p.img + '-400.webp', width: '96', height: '96', alt: '' }),
          el('div', null, [el('a', { href: 'product.html?p=' + p.id, text: p.n }), el('p', { class: 'muted', text: l.v + ' · ' + usd(p.p) + ' each' }), rm]),
          q, el('strong', { text: usd(p.p * l.q) })
        ]));
      });
      $('t-sub').textContent = usd(t.sub);
      $('t-ship').textContent = t.ship ? usd(t.ship) : 'Free';
      $('t-total').textContent = usd(t.total);
      $('ship-note').textContent = t.sub >= 120 ? 'Your shipping is free.' : 'Add ' + usd(120 - t.sub) + ' more for free shipping.';
    }
    render();
    var rules = {
      email: function (v) { v = clean(v); return v.length <= 80 && /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/.test(v) ? '' : 'Enter a valid email, like name@example.com.'; },
      nombre: function (v) { v = clean(v); return nameMsg(v, 3, 80, 'Enter your first and last name.') || (v.indexOf(' ') < 0 ? 'Add your last name too.' : ''); },
      direccion: function (v) { v = clean(v); return textMsg(v, 120) || (v.length >= 6 ? '' : 'Enter your street address.'); },
      ciudad: function (v) { v = clean(v); return /\d/.test(v) ? 'City names can’t contain numbers.' : textMsg(v, 60) || (v.length >= 2 ? '' : 'Enter your city.'); },
      state: function (v) { return v ? '' : 'Choose your state.'; },
      zip: function (v) { v = clean(v); return /\D/.test(v) ? 'ZIP codes use digits only.' : /^\d{5}$/.test(v) ? '' : 'Enter a 5-digit ZIP code.'; }
    };
    function show(k, msg) { var e = $('err-' + k); e.textContent = msg; e.hidden = !msg; $(k).setAttribute('aria-invalid', String(!!msg)); return !msg; }
    function check(k) { $(k).value = clean($(k).value); return show(k, rules[k]($(k).value)); }
    var KIND = { email: 'text', nombre: 'name', direccion: 'text', ciudad: 'name', state: 'none', zip: 'digits' };
    Object.keys(rules).forEach(function (k) { live($(k), rules[k], function (m) { show(k, m); }); filter($(k), KIND[k], function (m) { show(k, m); }); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var bad = Object.keys(rules).filter(function (k) { return !check(k); });
      if (bad.length) { $(bad[0]).focus(); return; }
      var t = totals(); if (!t.c.length) return;
      var order = 'SC-' + String(Date.now()).slice(-6);
      $('done-num').textContent = order;
      $('done-total').textContent = usd(t.total);
      $('done-mail').textContent = clean($('email').value);
      save([]); $('cart-body').hidden = true; $('done').hidden = false; $('done').focus();
    });
  }
})();
