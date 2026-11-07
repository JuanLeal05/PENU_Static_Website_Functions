// GET /api/questions — devuelve las preguntas SIN las respuestas.
const functions = require('@google-cloud/functions-framework');
const { publicQuestions } = require('../lib/quiz');
const { log } = require('../lib/http');

functions.http('questions', (req, res) => {
  log('Listando preguntas');
  res.set('Cache-Control', 'no-store').json(publicQuestions());
});
