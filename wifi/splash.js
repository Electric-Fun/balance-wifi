// Splash page behaviour for the Balance guest Wi-Fi portal (wifi/index.html).
// Everything here is optional: if this file fails to load, the form still posts to the AP.
(function () {
  // All optional. Any failure leaves the generic page intact.
  try {
    var q = {};
    var s = window.location.search.replace(/^\?/, '');
    if (s) {
      s.split('&').forEach(function (kv) {
        var i = kv.indexOf('=');
        var k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, ' '));
        var v = decodeURIComponent((i < 0 ? '' : kv.slice(i + 1)).replace(/\+/g, ' '));
        if (k) q[k] = v;
      });
    }

    // Location line. Instant On sends site="Balance Perrysburg"; older Instant sends apname
    // like "perrysburg-01". Match a known slug inside either. Unknown names leave the default line.
    var LOCATIONS = {
      'downtown-toledo': 'Downtown Toledo',
      'downtown-cleveland': 'Downtown Cleveland',
      'perrysburg': 'Perrysburg',
      'sylvania': 'Sylvania',
      'toledo': 'Downtown Toledo',
      'cleveland': 'Downtown Cleveland'
    };
    var where = ((q.site || '') + ' ' + (q.apname || '')).toLowerCase().replace(/[\s_]+/g, '-');
    for (var slug in LOCATIONS) {
      if (where.indexOf(slug) !== -1) {
        document.getElementById('location').textContent = 'Welcome to Balance ' + LOCATIONS[slug];
        break;
      }
    }

    // Point the login at the AP's own captive host from ?post= (older firmware: ?switchip=).
    // Only hostnames Aruba uses are accepted, so a tampered link cannot redirect the form.
    var form = document.getElementById('connect');
    var cta = document.getElementById('cta');
    var status = document.getElementById('status');
    var host = (q.post || q.switchip || '').toLowerCase().replace(/[^a-z0-9.-]/g, '');
    var okHost = /^(securelogin\.arubanetworks\.com|captiveportal-login\.arubainstanton\.com|captive-\d{4}\.aio\.cloudauth\.net)$/;
    if (host && okHost.test(host)) {
      form.action = 'https://' + host + '/swarm.cgi';
    }

    // The AP returns the guest here with ?errmsg= when the login fails.
    if (q.errmsg) {
      status.textContent = 'We couldn\u2019t connect you. Please try again.';
    }

    form.addEventListener('submit', function () {
      cta.textContent = 'Connecting\u2026';
      status.textContent = '';
      setTimeout(function () { cta.className = 'cta busy'; }, 0);
    });
  } catch (e) {}
})();
