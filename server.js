/**
 * ============================================================
 *  server.js — Servidor LOCAL de prueba
 *  Proyecto: Yamila Potel | Asesoría Contable, Impositiva,
 *            Económica y Financiera
 *
 *  QUÉ HACE
 *  --------
 *  Sirve la web (carpeta Sistema/) en tu navegador para poder
 *  probarla SIN subir nada a Internet.
 *
 *    node server.js
 *    -> http://localhost:3000
 *
 *  No necesita npm install: usa solo lo que trae Node.
 *  No reemplaza al backend: los formularios siguen hablando
 *  con el GAS "Backend Yamil" (Apps Script).
 *
 *  Para detener: Ctrl+C en la consola.
 * ============================================================
 */

'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

// Carpeta que se sirve: Yamila-Potel/Sistema
var RAIZ = path.join(__dirname, 'Sistema');
var PUERTO = leerPuerto();

// Tipos de archivo (MIME) para que el navegador los renderice.
var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
};

/* =========================================================
   Configuración (.env opcional)
   ========================================================= */

// Lee el puerto del archivo .env si existe (PORT=3000).
// Si no hay .env o no está bien escrito, usa 3000.
function leerPuerto() {
  try {
    var rutaEnv = path.join(__dirname, '.env');

    if (fs.existsSync(rutaEnv)) {
      var lineas = fs.readFileSync(rutaEnv, 'utf8').split(/\r?\n/);

      for (var i = 0; i < lineas.length; i++) {
        var linea = lineas[i].trim();

        if (linea.indexOf('PORT=') === 0) {
          var valor = parseInt(linea.substring(5).trim(), 10);

          if (!isNaN(valor) && valor > 0) {
            return valor;
          }
        }
      }
    }
  } catch (error) {
    console.warn('[server] No se pudo leer .env: ' + error.message);
  }

  return 3000;
}

/* =========================================================
   Resolución de archivos
   ========================================================= */

// Convierte la URL pedida en una ruta de archivo real,
// protegiéndose de ../.. (path traversal).
function resolverArchivo(urlPath) {
  var decodificada;

  try {
    decodificada = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch (error) {
    return null;
  }

  if (!decodificada || decodificada === '/') {
    decodificada = '/index.html';
  }

  // Carpeta pedida -> su index.html
  if (decodificada.charAt(decodificada.length - 1) === '/') {
    decodificada = decodificada + 'index.html';
  }

  var relativa = path.normalize(decodificada).replace(/^([/\\])+/, '');
  var completo = path.join(RAIZ, relativa);

  // Si la ruta escapa de la carpeta Sistema, se rechaza.
  if (completo.indexOf(RAIZ) !== 0) {
    return null;
  }

  return completo;
}

function pagina404() {
  return [
    '<!DOCTYPE html>',
    '<html lang="es">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>404 — Yamila Potel</title>',
    '<style>',
    'body{font-family:Georgia,serif;background:#FAF7F3;color:#171717;',
    'display:flex;align-items:center;justify-content:center;',
    'min-height:100vh;margin:0;padding:2rem;text-align:center;}',
    'h1{font-size:3rem;margin:0 0 .5rem;color:#8F1624;}',
    'p{color:#524C48;margin:0 0 1.5rem;}',
    'a{color:#8F1624;font-weight:600;}',
    '</style>',
    '</head>',
    '<body>',
    '<div>',
    '<h1>404</h1>',
    '<p>La página que buscás no existe en este servidor local.</p>',
    '<a href="/">Volver al inicio</a>',
    '</div>',
    '</body>',
    '</html>'
  ].join('\n');
}

/* =========================================================
   Servidor
   ========================================================= */

var servidor = http.createServer(function (req, res) {
  var inicio = Date.now();

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Metodo no permitido.');
    return;
  }

  var ruta = resolverArchivo(req.url);

  if (!ruta) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Ruta no permitida.');
    return;
  }

  fs.stat(ruta, function (errorStat, stats) {
    if (errorStat || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(pagina404());
      console.log('  404  ' + req.url);
      return;
    }

    var tipo = MIME[path.extname(ruta).toLowerCase()] || 'application/octet-stream';

    fs.readFile(ruta, function (errorLectura, contenido) {
      if (errorLectura) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error al leer el archivo.');
        console.log('  500  ' + req.url + '  (' + errorLectura.message + ')');
        return;
      }

      // Sin caché: en desarrollo siempre queremos la versión nueva.
      res.writeHead(200, {
        'Content-Type': tipo,
        'Cache-Control': 'no-store',
        'Content-Length': contenido.length
      });

      res.end(contenido);

      console.log(
        '  200  ' + req.url +
        '  (' + (Date.now() - inicio) + ' ms)'
      );
    });
  });
});

servidor.on('error', function (error) {
  if (error.code === 'EADDRINUSE') {
    console.error('');
    console.error('[server] El puerto ' + PUERTO + ' ya está ocupado.');
    console.error('[server] Probá con otro: cambia PORT= en .env');
    console.error('[server] o cerrá el otro programa que lo usa.');
  } else {
    console.error('[server] Error: ' + error.message);
  }
  process.exit(1);
});

servidor.listen(PUERTO, function () {
  var linea = '='.repeat(58);

  console.log('');
  console.log(linea);
  console.log('  Servidor local — Yamila Potel');
  console.log(linea);
  console.log('  Web:     http://localhost:' + PUERTO);
  console.log('  Carpeta: ' + RAIZ);
  console.log('');
  console.log('  Los formularios hablan con el GAS "Backend Yamil".');
  console.log('  Si no está implementado, el envío falla a propósito');
  console.log('  (así no se manda nada a medias).');
  console.log('');
  console.log('  Para detener: Ctrl+C');
  console.log(linea);
  console.log('');
});
