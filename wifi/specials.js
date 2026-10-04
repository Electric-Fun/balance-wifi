// Featured Specials row on the connected page (wifi/connected/index.html).
//
// Pulls every menu item in the "Special" category from the balancegrille.com WordPress API and
// builds the same cards the site's specials slider uses. Change what is marked Special in
// WordPress and this updates by itself. If the site cannot be reached, or there are no specials,
// the section stays hidden.
(function () {
  var API = 'https://balancegrille.com/wp-json/wp/v2/';
  var SPECIAL_CATEGORY = 41;   // id of the "Special" category on balancegrille.com
  // Each menu type is its own list in the API, so there is one request per type.
  var TYPES = ['bowls', 'tacos', 'salads', 'snacks', 'bubble-tea', 'lattes', 'desserts'];
  var QUERY = '?categories=' + SPECIAL_CATEGORY + '&per_page=10&_embed=wp:featuredmedia' +
              '&_fields=id,type,title,link,acf,_links,_embedded';

  var section = document.getElementById('specials');
  if (!section || !window.fetch) return;
  var track = section.querySelector('.swiper-wrapper');
  var prev = section.querySelector('.swiper-button-prev');
  var next = section.querySelector('.swiper-button-next');

  // WordPress returns titles as HTML (entities). Read them as plain text.
  function text(html) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    return (doc.body.textContent || '').trim();
  }
  function hex(value) { return /^#[0-9a-f]{3,8}$/i.test(value || '') ? value : ''; }
  function image(item) {
    var media = (((item._embedded || {})['wp:featuredmedia']) || [])[0] || {};
    var sizes = (media.media_details || {}).sizes || {};
    var pick = sizes.medium_large || sizes.large || sizes.full || {};
    var url = pick.source_url || media.source_url || '';
    return /^https:\/\/balancegrille\.com\//.test(url) ? url : '';
  }

  function card(item) {
    var acf = item.acf || {};
    var a = document.createElement('a');
    a.className = 'card ' + item.type + ' special-colors';   // item.type, e.g. "bubble-tea", is a CSS hook
    a.href = /^https:\/\/balancegrille\.com\//.test(item.link) ? item.link : 'https://balancegrille.com/menu';
    a.draggable = false;   // so a mouse drag moves the row instead of dragging the link
    var c1 = hex(acf.special_color_1), c2 = hex(acf.special_color_2);
    if (c1) a.style.setProperty('--special-color-1', c1);
    if (c2) a.style.setProperty('--special-color-2', c2);

    if (acf.special_title) {
      var tag = document.createElement('div');
      tag.className = 'tag filled';
      tag.textContent = text(acf.special_title);
      a.appendChild(tag);
    }
    var img = document.createElement('div');
    img.className = 'card-image';
    var url = image(item);
    if (url) img.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
    a.appendChild(img);

    var content = document.createElement('div');
    content.className = 'card-content';
    var h3 = document.createElement('h3');
    h3.className = 'large';
    h3.textContent = text(item.title && item.title.rendered);
    content.appendChild(h3);
    if (acf.special_text) {
      var p = document.createElement('p');
      p.className = 'medium center';
      p.textContent = text(acf.special_text);
      content.appendChild(p);
    }
    a.appendChild(content);
    return a;
  }

  // Arrow buttons scroll one card at a time and dim at either end.
  function step() {
    var first = track.querySelector('.card');
    return first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(first).marginRight || 0) : 300;
  }
  function updateButtons() {
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.classList.toggle('swiper-button-disabled', track.scrollLeft <= 2);
    next.classList.toggle('swiper-button-disabled', track.scrollLeft >= max);
  }
  prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
  track.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);

  // Click and drag with a mouse. Touch screens already swipe natively, so this only handles
  // mouse pointers. While dragging, snapping is off; on release the row glides to the nearest card.
  var drag = null;
  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 5) return;
    if (!drag.moved) { drag.moved = true; track.classList.add('dragging'); }
    track.scrollLeft = drag.left - dx;
    e.preventDefault();
  });
  function endDrag() {
    if (!drag) return;
    var moved = drag.moved;
    drag = null;
    if (!moved) return;
    var w = step();
    var max = track.scrollWidth - track.clientWidth;
    var target = Math.max(0, Math.min(max, Math.round(track.scrollLeft / w) * w));
    track.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(function () { track.classList.remove('dragging'); }, 400);
    // A drag must not open the card that happened to be under the mouse.
    var cancel = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
    track.addEventListener('click', cancel, { capture: true, once: true });
    setTimeout(function () { track.removeEventListener('click', cancel, true); }, 50);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  Promise.all(TYPES.map(function (type) {
    return fetch(API + type + QUERY)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) { return Array.isArray(items) ? items : []; })
      .catch(function () { return []; });
  })).then(function (lists) {
    var items = [].concat.apply([], lists);
    if (!items.length) return;
    items.forEach(function (item) { track.appendChild(card(item)); });
    section.hidden = false;
    updateButtons();
  });
})();
