// POST /api/answer  { "id": "q1", "choice": 1 }
// Califica UNA respuesta en el servidor y devuelve la explicación del concepto.
const functions = require('@google-cloud/functions-framework');
const { checkAnswer } = require('../lib/quiz');
const { readJsonBody, log } = require('../lib/http');

functions.http('answer', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });

  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ error: 'El cuerpo debe ser JSON' });

  const result = checkAnswer(body.id, body.choice);
  if (!result) return res.status(400).json({ error: 'Pregunta u opción inválida' });

  log(`Pregunta ${result.id}: ${result.correct ? 'correcta' : 'incorrecta'}`);
  res.json(result);
});
