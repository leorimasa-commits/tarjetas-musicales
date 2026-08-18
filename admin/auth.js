// Portón de acceso del panel admin. Requiere que la página tenga en el <head>:
//   <style>html{visibility:hidden}</style>
// y este script como PRIMERA cosa dentro de <body> — así el contenido real queda
// invisible por CSS desde el arranque (sin parpadeo) y solo se revela si la
// contraseña es correcta. Si algo en este script falla, el contenido se queda
// oculto (falla "cerrado", no "abierto").
//
// OJO — esto es una traba simple para un sitio 100% estático (GitHub Pages, sin
// servidor propio): frena a cualquiera que llegue al link sin querer, pero no es
// seguridad real, porque el código (y este mismo hash) son públicos si alguien va
// a mirar el código fuente. Para algo más fuerte hay que sumar un backend con login
// de verdad (ej. Cloudflare Access, Netlify Identity, etc.).
//
// Para cambiar la contraseña: calculá el nuevo hash con
//   node -e "function h(s){var x=0;for(var i=0;i<s.length;i++){x=(Math.imul(31,x)+s.charCodeAt(i))|0;}console.log(x);} h('TU_NUEVA_CONTRASEÑA')"
// y pegá el resultado en PASSWORD_HASH.
(function () {
  var SESSION_KEY = 'scanbeat-admin-ok';
  var PASSWORD_HASH = -1652377803; // "scanbeat2026" — cambiala cuando quieras (ver comentario arriba)

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
    return h;
  }

  function reveal() {
    document.documentElement.style.visibility = 'visible';
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    reveal();
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'admin-gate';
  overlay.style.cssText = 'position:fixed;inset:0;background:#0f0c29;display:flex;' +
    'align-items:center;justify-content:center;z-index:99999;visibility:visible;' +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  overlay.innerHTML =
    '<form id="admin-gate-form" style="background:#1a1a2e;padding:36px 30px;border-radius:18px;' +
    'text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5);max-width:88vw;width:320px;">' +
      '<p style="font-size:36px;margin:0 0 6px;">🔒</p>' +
      '<p style="margin:0 0 16px;font-weight:800;font-size:16px;">Panel admin de ScanBeat</p>' +
      '<input id="admin-gate-pw" type="password" placeholder="Contraseña" ' +
      'style="display:block;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;' +
      'border:1px solid #444;background:#111;color:#fff;font-size:15px;margin-bottom:10px;">' +
      '<button type="submit" style="width:100%;padding:12px;border-radius:10px;border:none;' +
      'background:linear-gradient(135deg,#e94560,#ffd166);color:#111;font-weight:800;' +
      'font-size:14px;cursor:pointer;">Entrar</button>' +
      '<p id="admin-gate-error" style="display:none;color:#ff8fa3;font-size:12.5px;margin:12px 0 0;">' +
      'Contraseña incorrecta</p>' +
      '<a href="../" style="display:inline-block;margin-top:14px;font-size:12px;opacity:.55;color:#fff;">← Volver al sitio</a>' +
    '</form>';

  function attach() {
    document.body.appendChild(overlay);
    var pwInput = document.getElementById('admin-gate-pw');
    pwInput.focus();
    document.getElementById('admin-gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (hash(pwInput.value) === PASSWORD_HASH) {
        sessionStorage.setItem(SESSION_KEY, '1');
        overlay.remove();
        reveal();
      } else {
        document.getElementById('admin-gate-error').style.display = 'block';
        pwInput.value = '';
        pwInput.focus();
      }
    });
  }

  if (document.body) {
    attach();
  } else {
    document.addEventListener('DOMContentLoaded', attach);
  }
})();
