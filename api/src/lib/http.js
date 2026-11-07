// Utilidades HTTP para las funciones (equivalente al "adaptador" de cada nube).
// Functions Framework ya parsea application/json en req.body; si el cliente envía
// otro Content-Type, el cuerpo crudo llega en req.rawBody (Buffer).
function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try {
    return JSON.parse(req.rawBody ? req.rawBody.toString('utf8') : '');
  } catch {
    return null;
  }
}

// Log estructurado: Cloud Logging lo guarda como jsonPayload (con severity y campos propios).
function log(message, fields = {}) {
  console.log(JSON.stringify({ severity: 'INFO', message, ...fields }));
}

module.exports = { readJsonBody, log };
