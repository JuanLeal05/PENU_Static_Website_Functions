// Punto de entrada de Cloud Run functions (Functions Framework).
// Cada archivo registra UNA función HTTP con functions.http('<nombre>', handler).
// En el despliegue se elige cuál se expone con --entry-point=<nombre>:
//   lab-info → info · lab-questions → questions · lab-answer → answer · lab-certificate → certificate
require('./src/functions/info');
require('./src/functions/questions');
require('./src/functions/answer');
require('./src/functions/certificate');
