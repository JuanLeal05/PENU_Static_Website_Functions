#!/usr/bin/env bash
# Equivalente a las consultas KQL de Application Insights, sobre Cloud Logging.
# Uso: scripts/analyze-logs.sh [ventana]      (ej.: 30m, 1h, 1d; por defecto 1h)
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-serverless-lab-juanleal}"
FRESH="${1:-1h}"
REQ_LOG="projects/${PROJECT_ID}/logs/run.googleapis.com%2Frequests"
BASE="resource.type=\"cloud_run_revision\" AND logName=\"${REQ_LOG}\""

echo "== 1) Invocaciones y duración promedio por función (últimos ${FRESH})"
printf '%-24s %13s %17s\n' "función" "invocaciones" "duracion_ms_prom"
gcloud logging read "${BASE} AND resource.labels.service_name=~\"^lab-\"" \
    --project="${PROJECT_ID}" --freshness="${FRESH}" --limit=5000 \
    --format='value(resource.labels.service_name,httpRequest.latency)' |
  awk -F'\t' 'NF>=2 { gsub(/s$/,"",$2); n[$1]++; sum[$1]+=$2 }
              END { for (k in n) printf "%-24s %13d %17.1f\n", k, n[k], 1000*sum[k]/n[k] }' | sort

echo
echo "== 2) Instancias que atendieron /api/info (escalado)"
printf '%13s  %s\n' "invocaciones" "instanceId (primeros 16 caracteres)"
gcloud logging read "${BASE} AND resource.labels.service_name=\"lab-info\"" \
    --project="${PROJECT_ID}" --freshness="${FRESH}" --limit=5000 \
    --format='value(labels.instanceId)' |
  cut -c1-16 | sort | uniq -c | sort -rn | awk '{ printf "%13d  %s\n", $1, $2 }'

echo
echo "== 3) Mensajes que escribe info.js (más recientes primero)"
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"lab-info\" AND jsonPayload.message:\"Instancia\"" \
    --project="${PROJECT_ID}" --freshness="${FRESH}" --limit=15 \
    --format='table(timestamp.date("%H:%M:%S"),jsonPayload.message)'
