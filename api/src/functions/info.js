// GET /api/info — expone datos de la instancia para OBSERVAR conceptos serverless:
//  - coldStart: true en la primera invocación que atiende esta instancia.
//  - invocationsOnThisInstance: contador EN MEMORIA (se pierde al reciclar = stateless).
//  - instanceId: distinto por instancia (si ves varios, la plataforma escaló).
const functions = require('@google-cloud/functions-framework');
const crypto = require('node:crypto');
const { log } = require('../lib/http');

// Este código corre UNA vez, cuando la instancia carga el módulo (fase de cold start).
const instanceId = crypto.randomUUID().slice(0, 8);
const instanceStartedAt = new Date().toISOString();
let invocations = 0;

functions.http('info', (req, res) => {
  invocations++;
  const started = Date.now();
  // Cloud Run pone el identificador de traza en este encabezado: sirve como id de invocación.
  const invocationId = (req.get('x-cloud-trace-context') || '').split('/')[0] || crypto.randomUUID();
  log(`Instancia ${instanceId}, invocación #${invocations}`, { instanceId, invocations });

  res.set('Cache-Control', 'no-store').json({
    instanceId,
    instanceStartedAt,
    coldStart: invocations === 1,
    invocationsOnThisInstance: invocations,
    invocationId,
    processUptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    region: process.env.REGION_NAME || 'local',
    service: process.env.K_SERVICE || 'local',
    revision: process.env.K_REVISION || 'local',
    version: (process.env.GIT_SHA || 'manual').slice(0, 7),
    serverTimeMs: Date.now() - started
  });
});
