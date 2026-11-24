/* Antes de pintar: si el carrito está vacío, se muestra el aviso desde el principio (evita que la página salte al cargar). */
(function () {
  var empty = true;
  try { var c = JSON.parse(localStorage.getItem('barro-lento-cart') || '[]'); empty = !Array.isArray(c) || !c.length; } catch (e) {}
  if (empty) document.documentElement.classList.add('cart-empty');
})();
