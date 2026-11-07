#!/usr/bin/env bash
# Despliega UNA función de api/ como Cloud Run function (2.ª gen).
# Lo usan igual tu terminal (primer despliegue) y el pipeline de GitHub Actions.
#
# Uso:   scripts/deploy-api.sh <info|questions|answer|certificate> [sufijo]
# Ej.:   scripts/deploy-api.sh info            → servicio lab-info
#        scripts/deploy-api.sh info -pr7       → servicio lab-info-pr7 (preview del PR #7)
set -euo pipefail
cd "$(dirname "$0")/.."

FN="${1:?Falta el nombre de la función: info | questions | answer | certificate}"
SUFFIX="${2:-}"
PROJECT_ID="${PROJECT_ID:-serverless-lab-juanleal}"
REGION="${REGION:-us-central1}"
GIT_SHA="${GIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo manual)}"
NAME="lab-${FN}${SUFFIX}"

echo "▶ Desplegando ${NAME} (entry-point=${FN}, proyecto=${PROJECT_ID}, región=${REGION}, versión=${GIT_SHA})"

# --concurrency=1  : una petición por instancia → la ráfaga SÍ provoca scale-out (varios instanceId).
# --min-instances=0: escala a cero → hay cold start tras un rato sin uso.
# GIT_SHA          : cambia en cada commit → garantiza revisión nueva → instancias nuevas (experimento 2).
gcloud functions deploy "${NAME}" \
  --gen2 \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --runtime=nodejs22 \
  --source=api \
  --entry-point="${FN}" \
  --trigger-http \
  --allow-unauthenticated \
  --run-service-account="sa-serverless-runtime@${PROJECT_ID}.iam.gserviceaccount.com" \
  --build-service-account="projects/${PROJECT_ID}/serviceAccounts/sa-serverless-build@${PROJECT_ID}.iam.gserviceaccount.com" \
  --memory=256Mi \
  --timeout=30s \
  --concurrency=1 \
  --min-instances=0 \
  --max-instances=20 \
  --set-env-vars="REGION_NAME=${REGION},GIT_SHA=${GIT_SHA}" \
  --quiet
