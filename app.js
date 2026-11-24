'use strict';
// Carrito compartido (localStorage) + vistas de inicio, producto y carrito.
(function () {
  var P = window.PRODUCTS, KEY = 'barro-lento-cart';
  function $(id) { return document.getElementById(id); }
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
    try { var c = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(c) ? c.filter(function (l) { return find(l.id) && l.q > 0 && l.q < 50; }) : []; }
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
      el('a', { href: 'producto.html?p=' + p.id }, [
        el('img', { src: 'img/' + p.img + '-400.webp', srcset: 'img/' + p.img + '-400.webp 400w, img/' + p.img + '-800.webp 800w', sizes: '(min-width: 900px) 30vw, 50vw', width: '800', height: '800', alt: p.n + ', ' + p.t.split('.')[0].toLowerCase(), loading: 'lazy' }),
        el('span', { class: 'card-name', text: p.n }),
        el('span', { class: 'card-price', text: usd(p.p) })
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
    document.title = p.n + ' · Barro Lento, cerámica hecha a mano';
    var meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', p.n + ': ' + p.t.split('.')[0] + '. ' + usd(p.p) + '.');
    var img = $('p-img');
    img.src = 'img/' + p.img + '-800.webp'; img.alt = p.n + ' sobre fondo de yeso claro';
    $('p-cat').textContent = p.cat; $('p-name').textContent = p.n; $('p-price').textContent = usd(p.p);
    $('p-desc').textContent = p.t; $('p-size').textContent = p.size;
    $('p-stock').textContent = p.stock <= 4 ? 'Quedan ' + p.stock + ' de esta tanda' : 'En stock, sale en 2 días hábiles';
    var sel = $('p-var'); p.v.forEach(function (v) { sel.appendChild(el('option', { value: v, text: v })); });
    var qty = $('p-qty'); qty.max = String(p.stock);
    $('p-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = Math.max(1, Math.min(p.stock, parseInt(qty.value, 10) || 1));
      add(p.id, sel.value, q); toast('Añadido: ' + q + ' × ' + p.n + ' (' + sel.value + ')');
    });
    var more = $('more'); P.filter(function (x) { return x.id !== p.id; }).slice(0, 3).forEach(function (x) { more.appendChild(card(x)); });
    var ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.n, description: p.t, image: 'https://jormanj2b.github.io/demo-tienda/img/' + p.img + '-800.webp',
      brand: { '@type': 'Brand', name: 'Barro Lento' }, offers: { '@type': 'Offer', price: String(p.p), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: location.href } };
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
      t.c.forEach(function (l, idx) {
        var p = find(l.id);
        var q = el('input', { type: 'number', min: '1', max: String(p.stock), value: String(l.q), 'aria-label': 'Cantidad de ' + p.n, inputmode: 'numeric' });
        q.addEventListener('change', function () { var c = load(); c[idx].q = Math.max(1, Math.min(p.stock, parseInt(q.value, 10) || 1)); save(c); render(); });
        var rm = el('button', { type: 'button', class: 'link', text: 'Quitar' });
        rm.addEventListener('click', function () { var c = load(); c.splice(idx, 1); save(c); render(); });
        linesEl.appendChild(el('li', { class: 'line' }, [
          el('img', { src: 'img/' + p.img + '-400.webp', width: '96', height: '96', alt: '' }),
          el('div', null, [el('a', { href: 'producto.html?p=' + p.id, text: p.n }), el('p', { class: 'muted', text: l.v + ' · ' + usd(p.p) + ' c/u' }), rm]),
          q, el('strong', { text: usd(p.p * l.q) })
        ]));
      });
      $('t-sub').textContent = usd(t.sub);
      $('t-ship').textContent = t.ship ? usd(t.ship) : 'Gratis';
      $('t-total').textContent = usd(t.total);
      $('ship-note').textContent = t.sub >= 120 ? 'Tu envío es gratis.' : 'Te faltan ' + usd(120 - t.sub) + ' para el envío gratis.';
    }
    render();
    var rules = {
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Escribe un correo válido, por ejemplo nombre@correo.com.'; },
      nombre: function (v) { return v.length >= 3 ? '' : 'Escribe tu nombre y apellido.'; },
      direccion: function (v) { return v.length >= 6 ? '' : 'Falta la dirección de entrega.'; },
      ciudad: function (v) { return v.length >= 2 ? '' : 'Falta la ciudad.'; },
      zip: function (v) { return /^\d{5}$/.test(v) ? '' : 'El ZIP tiene 5 números.'; }
    };
    Object.keys(rules).forEach(function (k) {
      $(k).addEventListener('blur', function () { check(k); });
    });
    function check(k) {
      var msg = rules[k]($(k).value.trim()), e = $('err-' + k);
      e.textContent = msg; e.hidden = !msg; $(k).setAttribute('aria-invalid', String(!!msg)); return !msg;
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var bad = Object.keys(rules).filter(function (k) { return !check(k); });
      if (bad.length) { $(bad[0]).focus(); return; }
      var t = totals(); if (!t.c.length) return;
      var order = 'BL-' + String(Date.now()).slice(-6);
      $('done-num').textContent = order;
      $('done-total').textContent = usd(t.total);
      $('done-mail').textContent = $('email').value.trim();
      save([]); $('cart-body').hidden = true; $('done').hidden = false; $('done').focus();
    });
  }
})();
