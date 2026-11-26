/**
 * ============================================================
 *  BACKEND YAMIL  —  Google Apps Script (GAS)
 *  Proyecto: Yamila Potel | Asesoría Contable, Impositiva,
 *            Económica y Financiera
 *
 *  Pegar en: script.google.com (proyecto "Backend Yamil")
 *            o Extensiones > Apps Script desde la hoja
 *  Versión: 1.0 — 28/10/2026
 * ============================================================
 *
 *  QUÉ HACE ESTE ARCHIVO
 *  ---------------------
 *  - setupHoja(): crea las pestañas y las columnas a medida
 *    (este es el "código que arma la hoja" pedido).
 *  - doPost(e): recibe los formularios de la web (contacto y
 *    diagnóstico), los valida, escribe una fila en la hoja
 *    "YP - Base de datos" y manda un email de respaldo con
 *    GmailApp. Responde { ok: true }.
 *  - doGet(e): stub listo para el panel admin (Fase 4).
 *  - probarEnvio(): prueba de humo, escribe una fila de prueba
 *    y manda un email de prueba.
 *
 *  PRIMER PASO (una sola vez)
 *  --------------------------
 *  1. Pegar todo este archivo en el editor de "Backend Yamil".
 *  2. Recargar la hoja de sheets -> menú "Backend Yamil" ->
 *     "1) Preparar hoja (crear columnas)".
 *  3. Ejecutar "2) Probar con una consulta de ejemplo".
 *  4. Implementar como app web y copiar la URL /exec.
 *  (El detalle paso a paso está en LEEME-COMO-USAR.txt)
 * ============================================================
 */


/* ============================================================
   CONFIGURACIÓN — editar acá si hace falta
   ============================================================ */

// Nombre del Google Sheet. Si ID_PLANILLA está vacío, el
// código busca este archivo en Drive.
var NOMBRE_PLANILLA = 'YP - Base de datos';

// ID de la hoja (opcional). Si se conoce, se usa directo: es
// más rápido y no depende del nombre. Se saca de la URL:
// https://docs.google.com/spreadsheets/d/ESTE_ID/edit
var ID_PLANILLA = '';

// Nombres de las pestañas. Si cambiás alguno acá, volvé a
// correr "1) Preparar hoja (crear columnas)".
var PESTANA_CONTACTOS = 'Consultas';
var PESTANA_DIAGNOSTICOS = 'Diagnosticos';

// Email donde llegan las notificaciones de cada consulta.
// Cuenta Gmail del proyecto (la que abrió Sheets y GAS).
var EMAIL_NOTIFICACION = 'yamilapotel1@gmail.com';

// Prefijo de los asuntos de email.
var ASUNTO_PREFIX = '[Web Yamila Potel] ';

// Límites de longitud (anti-abuso).
var LIM = {
  nombre: 120,
  email: 200,
  telefono: 40,
  servicio: 60,
  origen: 40,
  mensaje: 4000,
  campo: 300
};

// Opciones del dropdown de la columna "estado".
var ESTADOS = ['pendiente', 'contactado', 'propuesta enviada', 'cerrada'];

// Columnas de cada pestaña (orden exacto de la planilla).
var COLS_CONSULTAS = [
  'fecha', 'origen', 'servicio', 'nombre', 'email', 'telefono',
  'campos_extra', 'mensaje', 'estado'
];

var COLS_DIAGNOSTICOS = [
  'fecha', 'estado',
  'nombre', 'negocio', 'rubro', 'antiguedad', 'tipo_gestion',
  'registro_movimientos', 'frecuencia_revision', 'sistema_registro',
  'medios_cobro', 'pct_facturacion', 'nivel_facturacion',
  'cuenta_bancaria', 'cuenta_exclusiva', 'retiros_personales',
  'punto_equilibrio', 'fondo_reserva', 'control_costos',
  'desafio_principal', 'comentarios',
  'turno_fecha', 'turno_horario'
];

// Anchos de columna (px) por pestaña.
var ANCHOS_CONSULTAS = [
  { col: 'fecha', ancho: 170 },
  { col: 'estado', ancho: 150 },
  { col: 'servicio', ancho: 190 },
  { col: 'campos_extra', ancho: 320 },
  { col: 'mensaje', ancho: 360 }
];

var ANCHOS_DIAGNOSTICOS = [
  { col: 'fecha', ancho: 170 },
  { col: 'estado', ancho: 150 },
  { col: 'desafio_principal', ancho: 280 },
  { col: 'comentarios', ancho: 280 },
  { col: 'turno_fecha', ancho: 230 },
  { col: 'turno_horario', ancho: 170 }
];

// Etiquetas legibles para el cuerpo del email de diagnóstico.
var LABELS_DIAG = {
  nombre: 'Nombre',
  negocio: 'Emprendimiento',
  rubro: 'Rubro / Actividad',
  antiguedad: 'Antigüedad',
  tipo_gestion: 'Tipo de gestión',
  registro_movimientos: 'Registro de ingresos y egresos',
  frecuencia_revision: 'Frecuencia de revisión',
  sistema_registro: 'Sistema de registro',
  medios_cobro: 'Medios de cobro',
  pct_facturacion: 'Ventas que facturás',
  nivel_facturacion: 'Nivel de facturación',
  cuenta_bancaria: 'Cuenta bancaria',
  cuenta_exclusiva: 'Uso de la cuenta',
  retiros_personales: 'Retiros personales',
  punto_equilibrio: 'Punto de equilibrio',
  fondo_reserva: 'Fondo de reserva',
  control_costos: 'Control de costos',
  desafio_principal: 'Desafío principal',
  comentarios: 'Comentarios',
  turno_fecha: 'Fecha del turno',
  turno_horario: 'Horario del turno'
};


/* ============================================================
   1. MENÚ EN LA HOJA
   Aparece al recargar la planilla (solo si el script está
   vinculado a la hoja: Extensiones > Apps Script).
   ============================================================ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Backend Yamil')
    .addItem('1) Preparar hoja (crear columnas)', 'setupHoja')
    .addItem('2) Probar con una consulta de ejemplo', 'probarEnvio')
    .addToUi();
}


/* ============================================================
   2. PREPARAR LA HOJA — crea pestañas, columnas y formato
   ============================================================ */

function setupHoja() {
  var ss = obtenerPlanilla();

  asegurarPestana(ss, PESTANA_CONTACTOS, COLS_CONSULTAS, ANCHOS_CONSULTAS);
  asegurarPestana(ss, PESTANA_DIAGNOSTICOS, COLS_DIAGNOSTICOS, ANCHOS_DIAGNOSTICOS);

  aviso(
    'Backend Yamil: hoja preparada.\n\n' +
    'Pestañas creadas:\n' +
    '  - "' + PESTANA_CONTACTOS + '" (' + COLS_CONSULTAS.length + ' columnas)\n' +
    '  - "' + PESTANA_DIAGNOSTICOS + '" (' + COLS_DIAGNOSTICOS.length + ' columnas)\n\n' +
    'Si la planilla ya tenía datos, no se tocó nada: solo se ' +
    'completaron las columnas que faltaban.'
  );
}

// Crea la pestaña si no existe y garantiza encabezado + formato.
// Es idempotente: correrla varias veces no rompe nada.
function asegurarPestana(ss, nombre, columnas, anchos) {
  var hoja = ss.getSheetByName(nombre);

  if (!hoja) {
    hoja = crearPestana(ss, nombre);
  }

  asegurarEncabezado(hoja, columnas);
  formatearEncabezado(hoja, columnas, anchos);

  return hoja;
}

function crearPestana(ss, nombre) {
  // Si existe la hoja por defecto ("Hoja 1") y está vacía, la
  // reutilizamos renombrándola: así no queda una pestaña de más.
  var porDefecto = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Hoja1');

  if (porDefecto && porDefecto.getLastRow() === 0) {
    porDefecto.setName(nombre);
    return porDefecto;
  }

  return ss.insertSheet(nombre);
}

function asegurarEncabezado(hoja, columnas) {
  var rango = hoja.getRange(1, 1, 1, columnas.length);
  var fila1 = rango.getValues()[0];

  var vacia = fila1.every(function (celda) {
    return celda === '' || celda === null;
  });

  if (vacia) {
    rango.setValues([columnas]);
    return;
  }

  // La hoja ya tiene encabezados y datos: escribimos SOLAMENTE las
  // columnas nuevas que faltan, sin pisar nada de lo existente.
  columnas.forEach(function (nombre, indice) {
    var actual = fila1[indice];

    if (actual === '' || actual === null) {
      hoja.getRange(1, indice + 1).setValue(nombre);
    }
  });
}

function formatearEncabezado(hoja, columnas, anchos) {
  var rango = hoja.getRange(1, 1, 1, columnas.length);

  rango.setBackground('#8F1624')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setWrap(true)
    .setVerticalAlignment('middle');

  hoja.setRowHeight(1, 34);
  hoja.setFrozenRows(1);

  anchos.forEach(function (item) {
    var idx = columnas.indexOf(item.col) + 1;

    if (idx > 0) {
      hoja.setColumnWidth(idx, item.ancho);
    }
  });

  // Dropdown en la columna "estado" para que Yamila marque el
  // avance de cada consulta sin escribir a mano.
  var colEstado = columnas.indexOf('estado') + 1;

  if (colEstado > 0) {
    var ultimaFila = Math.min(hoja.getMaxRows(), 2000);

    var regla = SpreadsheetApp.newDataValidation()
      .requireValueInList(ESTADOS, true)
      .setAllowInvalid(true)
      .setHelpText('Elegí un estado de la lista.')
      .build();

    hoja.getRange(2, colEstado, Math.max(ultimaFila - 1, 1), 1).setDataValidation(regla);
  }
}


/* ============================================================
   3. doPost — recibe los formularios de la web
   ============================================================ */

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return json({ ok: false, error: 'Sin datos en el pedido.' });
  }

  var datos;

  try {
    datos = JSON.parse(e.postData.contents);
  } catch (error) {
    return json({ ok: false, error: 'JSON inválido.' });
  }

  if (!datos || typeof datos !== 'object') {
    return json({ ok: false, error: 'Payload inválido.' });
  }

  // Honeypot: si el campo trampa tiene contenido, es un bot.
  // Respondemos ok:true para no avisarle, pero no guardamos nada.
  if (datos.honeypot) {
    Logger.log('[Backend Yamil] Honeypot detectado. Se descarta el envío.');
    return json({ ok: true });
  }

  try {
    if (datos.tipo === 'contacto') {
      guardarConsulta(datos);
      return json({ ok: true, tipo: 'contacto' });
    }

    if (datos.tipo === 'diagnostico') {
      guardarDiagnostico(datos);
      return json({ ok: true, tipo: 'diagnostico' });
    }

    return json({ ok: false, error: 'Tipo desconocido: ' + String(datos.tipo || '') });
  } catch (error) {
    Logger.log('[Backend Yamil] Error en doPost: ' + error);
    return json({ ok: false, error: 'No se pudo guardar el envío.' });
  }
}


/* ============================================================
   4. Guardado de cada tipo de envío
   ============================================================ */

function guardarConsulta(datos) {
  var nombre = aTexto(datos.nombre, LIM.nombre);
  var mensaje = aTexto(datos.mensaje, LIM.mensaje);

  if (!nombre) {
    throw new Error('Falta el nombre de la consulta.');
  }

  if (!mensaje) {
    throw new Error('Falta el mensaje de la consulta.');
  }

  var fila = [
    fechaISO(),
    aTexto(datos.origen, LIM.origen) || 'directo',
    aTexto(datos.servicio, LIM.servicio),
    nombre,
    aTexto(datos.email, LIM.email),
    aTexto(datos.telefono, LIM.telefono),
    formatearCamposExtra(datos.campos_extra),
    mensaje,
    'pendiente'
  ];

  var ss = obtenerPlanilla();
  var hoja = asegurarPestana(ss, PESTANA_CONTACTOS, COLS_CONSULTAS, ANCHOS_CONSULTAS);

  // La planilla es el registro canónico: se escribe PRIMERO.
  hoja.appendRow(fila);

  // El email es respaldo: si falla, no se pierde la fila.
  enviarEmail(
    ASUNTO_PREFIX + 'Nueva consulta - ' + (fila[2] || 'general'),
    cuerpoConsulta(fila)
  );
}

function guardarDiagnostico(datos) {
  var nombre = aTexto(datos.nombre, LIM.nombre);

  if (!nombre) {
    throw new Error('Falta el nombre en el diagnóstico.');
  }

  var fila = [fechaISO(), 'pendiente'];

  COLS_DIAGNOSTICOS.slice(2).forEach(function (col) {
    fila.push(aTexto(datos[col], LIM.campo));
  });

  var ss = obtenerPlanilla();
  var hoja = asegurarPestana(ss, PESTANA_DIAGNOSTICOS, COLS_DIAGNOSTICOS, ANCHOS_DIAGNOSTICOS);

  hoja.appendRow(fila);

  enviarEmail(
    ASUNTO_PREFIX + 'Nuevo diagnóstico - ' + nombre,
    cuerpoDiagnostico(fila)
  );
}


/* ============================================================
   5. Email de respaldo (GmailApp, desde la misma cuenta)
   ============================================================ */

function enviarEmail(asunto, cuerpo) {
  var destino = EMAIL_NOTIFICACION || Session.getActiveUser().getEmail();

  if (!destino) {
    Logger.log('[Backend Yamil] No hay email de destino configurado. Se omite el respaldo.');
    return;
  }

  try {
    GmailApp.sendEmail(destino, asunto, cuerpo);
  } catch (error) {
    Logger.log('[Backend Yamil] No se pudo enviar el email: ' + error);
  }
}

function cuerpoConsulta(fila) {
  return [
    'Nueva consulta desde la web de Yamila Potel.',
    '',
    'Fecha: ' + fila[0],
    'Origen: ' + fila[1],
    'Servicio: ' + fila[2],
    '',
    'Nombre: ' + fila[3],
    'Email: ' + fila[4],
    'Teléfono: ' + fila[5],
    '',
    'Datos del formulario:',
    fila[6] || '(sin datos extra)',
    '',
    'Mensaje:',
    fila[7],
    '',
    'Estado inicial: ' + fila[8]
  ].join('\n');
}

function cuerpoDiagnostico(fila) {
  var lineas = [
    'Nuevo Diagnóstico Inicial desde la web de Yamila Potel.',
    '',
    'Fecha: ' + fila[0]
  ];

  for (var i = 2; i < COLS_DIAGNOSTICOS.length; i++) {
    var col = COLS_DIAGNOSTICOS[i];
    lineas.push((LABELS_DIAG[col] || col) + ': ' + (fila[i] || '—'));
  }

  return lineas.join('\n');
}


/* ============================================================
   6. doGet — stub para el panel admin (Fase 4)
   ============================================================ */

function doGet(e) {
  // El panel admin va a exigir acá un token de Firebase
  // (Authorization: Bearer <ID token>) antes de devolver datos.
  // Por ahora solo responde que está vivo.
  return json({
    ok: true,
    servicio: 'backend-yamil',
    version: '1.0.0',
    nota: 'El panel admin aún no está conectado.'
  });
}


/* ============================================================
   7. Utilidades
   ============================================================ */

function obtenerPlanilla() {
  if (ID_PLANILLA) {
    return SpreadsheetApp.openById(ID_PLANILLA);
  }

  // Script vinculado a la hoja (lo más común).
  var activa = SpreadsheetApp.getActiveSpreadsheet();

  if (activa) {
    return activa;
  }

  // Proyecto independiente: la buscamos por nombre en Drive.
  var archivos = DriveApp.getFilesByName(NOMBRE_PLANILLA);

  if (archivos.hasNext()) {
    return SpreadsheetApp.openById(archivos.next().getId());
  }

  throw new Error(
    'No encontré la planilla "' + NOMBRE_PLANILLA + '". ' +
    'Pegá su ID en ID_PLANILLA (arriba del código) o abrí este ' +
    'script desde la propia hoja (Extensiones > Apps Script).'
  );
}

// Convierte cualquier valor a texto limpio. Maneja arrays
// (campos de checkbox) uniéndolos con ", ".
function aTexto(valor, max) {
  if (valor === null || valor === undefined) {
    return '';
  }

  if (Array.isArray(valor)) {
    valor = valor.join(', ');
  }

  var texto = String(valor).trim();

  if (max && texto.length > max) {
    texto = texto.substring(0, max);
  }

  return texto;
}

// Los campos extra opcionales del formulario de contacto van en
// UNA sola columna, así: "situacion_fiscal: Monotributo | detalle: ..."
function formatearCamposExtra(extra) {
  if (!extra || typeof extra !== 'object') {
    return '';
  }

  var partes = [];

  Object.keys(extra).forEach(function (clave) {
    var valor = aTexto(extra[clave], LIM.campo);

    if (valor) {
      partes.push(clave + ': ' + valor);
    }
  });

  return partes.join(' | ');
}

// Fecha en formato ISO local (ordenable y filtrable).
function fechaISO() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ss"
  );
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function aviso(texto) {
  try {
    SpreadsheetApp.getUi().alert(texto);
  } catch (error) {
    Logger.log(texto);
  }
}


/* ============================================================
   8. Prueba de humo — "2) Probar con una consulta de ejemplo"
   ============================================================ */

function probarEnvio() {
  var ss = obtenerPlanilla();

  // Consulta de prueba
  var hojaC = asegurarPestana(ss, PESTANA_CONTACTOS, COLS_CONSULTAS, ANCHOS_CONSULTAS);

  hojaC.appendRow([
    fechaISO(),
    'prueba',
    'prueba-backend',
    'Prueba Backend Yamil',
    'prueba@correo.com',
    '11 0000-0000',
    'situacion_fiscal: Monotributo | detalle_impositivo: Esto es una prueba',
    'ESTA FILA ES UNA PRUEBA: puedes borrarla cuando quieras.',
    'pendiente'
  ]);

  // Diagnóstico de prueba
  var hojaD = asegurarPestana(ss, PESTANA_DIAGNOSTICOS, COLS_DIAGNOSTICOS, ANCHOS_DIAGNOSTICOS);

  var filaPrueba = [fechaISO(), 'pendiente'];

  for (var i = 2; i < COLS_DIAGNOSTICOS.length; i++) {
    filaPrueba.push(i === 2 ? 'Prueba Backend Yamil' : '—');
  }

  hojaD.appendRow(filaPrueba);

  enviarEmail(
    ASUNTO_PREFIX + 'PRUEBA de Backend Yamil',
    'Esto es una prueba del backend.\n\n' +
    'Si recibís este email, GmailApp está funcionando.\n' +
    'Se agregó una fila de prueba en cada pestaña de la planilla.\n' +
    'Borra las filas de prueba cuando quieras.'
  );

  aviso(
    'Prueba OK.\n\n' +
    'Se agregó una fila de prueba en "' + PESTANA_CONTACTOS + '"\n' +
    'y otra en "' + PESTANA_DIAGNOSTICOS + '".\n' +
    'También se envió un email de prueba.\n\n' +
    'Borrá las filas de prueba cuando quieras.'
  );
}
