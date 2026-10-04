// Splash page behaviour (wifi/index.html). All of it is optional: if this file fails to load or
// anything here throws, the form still posts to the AP with its built-in fallback address.
(function () {
  try {
    // Query string the AP adds when it sends a guest here, e.g. ?post=...&site=Balance%20Perrysburg
    var q = {};
    window.location.search.replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var key = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
      var value = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
      if (key) q[key] = value;
    });

    // Location line. If the Instant On site name contains one of these words, name the location.
    // Any other site name leaves the default line in place.
    var LOCATIONS = {
      perrysburg: 'Perrysburg',
      sylvania: 'Sylvania',
      toledo: 'Downtown Toledo',
      cleveland: 'Downtown Cleveland'
    };
    var site = (q.site || '').toLowerCase();
    for (var word in LOCATIONS) {
      if (site.indexOf(word) !== -1) {
        document.getElementById('location').textContent = 'Welcome to Balance ' + LOCATIONS[word];
        break;
      }
    }

    // Send the login to the AP's own captive host, which it passes as ?post=. Only hostnames
    // Instant On uses are accepted, so a tampered link cannot point the form anywhere else.
    var form = document.getElementById('connect');
    var cta = document.getElementById('cta');
    var status = document.getElementById('status');
    var host = (q.post || '').toLowerCase();
    if (/^(captive-\d{4}\.aio\.cloudauth\.net|captiveportal-login\.arubainstanton\.com)$/.test(host)) {
      form.action = 'https://' + host + '/swarm.cgi';
    }

    // The AP sends the guest back here with ?errmsg= when the login fails.
    if (q.errmsg) {
      status.textContent = 'We couldn’t connect you. Please try again.';
    }

    form.addEventListener('submit', function () {
      cta.textContent = 'Connecting…';
      status.textContent = '';
      setTimeout(function () { cta.className = 'cta busy'; }, 0);
    });
  } catch (e) {}
})();
