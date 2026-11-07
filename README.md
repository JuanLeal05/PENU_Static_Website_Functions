# PENU · Laboratorio 7 — Serverless en Google Cloud

Sitio estático interactivo (formularios y preguntas) cuya lógica corre en **4 Cloud Run functions** (Node.js 22).
El sitio se publica en **Firebase Hosting**, que reescribe `/api/*` hacia las funciones en el mismo dominio, y todo se
despliega con **GitHub Actions** autenticado por **Workload Identity Federation (OIDC)**: no hay llaves JSON ni
secretos en el repositorio.

> Es la adaptación a GCP del laboratorio original pensado para Azure Static Web Apps + Azure Functions.
> Se conservan los mismos 4 endpoints, las mismas pruebas, los mismos experimentos y la misma rúbrica.

## Objetivos de aprendizaje

1. Explicar qué es serverless, FaaS y los triggers.
2. Separar contenido estático (CDN global de Firebase Hosting) de la lógica (funciones bajo demanda).
3. Monitorear las funciones con Cloud Run Metrics y Cloud Logging: invocaciones, duración, errores e instancias.
4. Observar en vivo el **cold start**, el comportamiento **stateless** y el **escalado** horizontal.
5. Construir un pipeline CI/CD con pruebas, despliegue a producción y **preview por Pull Request**.
6. Desplegar **sin llaves** (OIDC) y comparar su alcance con un token de despliegue y una llave JSON.
7. Reconocer los mismos conceptos en otra nube con un simulador local de AWS (anexo).

## Arquitectura

```
                    ┌──────────────────── Firebase Hosting (CDN global) ────────────────────┐
 Navegador ──HTTPS──▶  /              → contenido estático (src/)                            │
                    │  /api/<fn>      → rewrite (firebase.json) → Cloud Run  lab-<fn>  (api/) │
                    └────────────────────────────────────────────────────────────────────────┘
                                                   ▲
 git push / PR ──▶ GitHub Actions ──▶ npm test ──▶ gcloud functions deploy (x4) ──▶ firebase deploy
                         └── OIDC ──▶ Workload Identity Federation ──▶ sa-serverless-deploy
```

| Endpoint | Método | Servicio | Qué enseña |
|---|---|---|---|
| `/api/info` | GET | `lab-info` | Cold start, stateless (contador en memoria), escalado (`instanceId`) |
| `/api/questions` | GET | `lab-questions` | La función entrega datos **sin** las respuestas |
| `/api/answer` | POST | `lab-answer` | Lógica de negocio en el servidor (el cliente no puede hacer trampa) |
| `/api/certificate` | POST | `lab-certificate` | Recalifica todo el formulario y emite un código verificable |

### Equivalencias Azure → GCP

| Concepto | Azure (laboratorio original) | GCP (este repositorio) |
|---|---|---|
| Sitio estático global | Static Web Apps | Firebase Hosting |
| Funciones HTTP | Azure Functions administradas (Node 20, `app.http`) | Cloud Run functions 2.ª gen (Node 22, `functions.http`) |
| `/api` en el mismo dominio | Proxy de la Static Web App | `rewrites` de `firebase.json` hacia Cloud Run |
| Configuración de rutas | `staticwebapp.config.json` | `firebase.json` |
| `app_location` / `api_location` | Pasos del workflow | `public: "src"` / `--source=api` + `--entry-point` |
| Preview por Pull Request | Entorno de staging automático | Canal de Hosting `pr-N` + funciones `lab-*-prN` |
| Credencial del pipeline | Token de despliegue (secreto) | OIDC con Workload Identity Federation (sin secretos) |
| Monitoreo | Application Insights + KQL | Cloud Run Metrics + Logs Explorer + `scripts/analyze-logs.sh` |
| Identificador de instancia | `cloud_RoleInstance` | `labels.instanceId` de los request logs |
| Limpieza | `az group delete` | `gcloud projects delete` |

## Estructura del repositorio

```
.
├── .github/workflows/gcp-serverless.yml  # test → deploy_api (x4) → deploy_hosting → close_pull_request_job
├── .firebaserc                           # Proyecto de Firebase por defecto
├── firebase.json                         # public: src + rewrites /api/<fn> → Cloud Run lab-<fn>
├── scripts/
│   ├── deploy-api.sh                     # Despliega UNA función (lo usan tu terminal y el pipeline)
│   └── analyze-logs.sh                   # Equivalente a las consultas KQL, sobre Cloud Logging
├── src/                                  # Sitio estático
│   ├── index.html  app.js  styles.css
│   └── config.js                         # URL base de la API (vacía: mismo origen)
├── api/                                  # Cloud Run functions (Functions Framework)
│   ├── index.js                          # Registra las 4 funciones; --entry-point elige cuál se expone
│   ├── package.json  package-lock.json  .gcloudignore
│   ├── src/functions/  info.js  questions.js  answer.js  certificate.js
│   ├── src/lib/        questions.js (banco)  quiz.js (lógica pura)  http.js (adaptador HTTP + logs)
│   └── test/quiz.test.js                 # 7 pruebas que corren en el pipeline
└── floci/                                # (Anexo) El mismo lab en un simulador local de AWS
```

## Nombres estándar

| Recurso | Nombre |
|---|---|
| Proyecto GCP / Firebase | `serverless-lab-juanleal` |
| Región | `us-central1` |
| Sitio en producción | `https://serverless-lab-juanleal.web.app` |
| Funciones | `lab-info`, `lab-questions`, `lab-answer`, `lab-certificate` |
| Funciones de un PR / canal de preview | `lab-<fn>-pr<N>` / `pr-<N>` |
| Service accounts | `sa-serverless-runtime` (sin roles), `sa-serverless-build`, `sa-serverless-deploy` |
| Pool / proveedor de identidad | `github-pool` / `github-provider` |
| Variables del repositorio (no secretas) | `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA` |

**Laboratorio desplegado:** repositorio `https://github.com/JuanLeal05/PENU_Static_Website_Functions` ·
producción `https://serverless-lab-juanleal.web.app`.

Si usas otro ID de proyecto, cámbialo en `.firebaserc`, en `env.PROJECT_ID` del workflow y en el valor por defecto
de `scripts/deploy-api.sh` y `scripts/analyze-logs.sh`. La región está también en los `rewrites` de `firebase.json`.

## Puesta en marcha (resumen)

La guía paso a paso (*PENU Laboratorio 7 - Serverless en GCP*) detalla cada comando y la evidencia a capturar.
Variables usadas en todas las fases (pégalas en cada terminal nueva):

```bash
export PROJECT_ID="serverless-lab-juanleal"
export REGION="us-central1"
export GH_USER="JuanLeal05"
export GH_REPO="PENU_Static_Website_Functions"   # nombre EXACTO del repositorio en GitHub
export RUNTIME_SA="sa-serverless-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
export BUILD_SA="sa-serverless-build@${PROJECT_ID}.iam.gserviceaccount.com"
export DEPLOY_SA="sa-serverless-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
```

| Fase | Qué se hace | Parte del PDF |
|---|---|---|
| 1 | Push a `main`: `test` pasa y `deploy_api` falla en `auth` (esperado, aún no hay nada en GCP) | Parte 1 |
| 2 | Proyecto, facturación, APIs y las 3 service accounts con sus roles | Parte 2 |
| 3 | Workload Identity Federation limitado a `${GH_USER}/${GH_REPO}` y variables del repositorio | Parte 3 |
| 4 | Activar Firebase, despliegue manual de `lab-info` (`./scripts/deploy-api.sh info`) y pipeline completo | Parte 3 |
| 5 | Leer `info.js`, `firebase.json`, `deploy-api.sh` y recorrer las 5 pestañas | Partes 4 y 5 |
| 6 | Experimentos de cold start, stateless y escalado | Parte 6 |
| 7 | Métricas de Cloud Run, error 400 en Logs Explorer y `./scripts/analyze-logs.sh 1h` | Parte 7 |
| 8 | PR con una pregunta nueva, preview, fallo controlado (`answer: 9`) y merge | Parte 8 |
| 9 | Retos opcionales | Parte 9 |

> **Importante:** la `attribute-condition` del proveedor OIDC y el binding `workloadIdentityUser` usan
> `${GH_USER}/${GH_REPO}`. Deben coincidir exactamente (mayúsculas, guiones y guiones bajos) con el repositorio
> real, o el paso `auth` del workflow fallará.

### Decisiones de diseño

- **Node 22**: Node 20 ya no se puede usar para crear Cloud Run functions. `npm test` ejecuta `node --test` (sin
  argumentos) porque las versiones nuevas de Node no aceptan un directorio como argumento.
- **`--concurrency=1` y `--min-instances=0`**: una petición por instancia (la Ráfaga sí provoca *scale-out*) y escalado
  a cero (hay cold start tras un rato sin uso).
- **`GIT_SHA` como variable de entorno**: cada commit crea una revisión nueva → instancias nuevas (experimento 2).
- **Tres service accounts**: una ejecuta (sin roles), otra construye la imagen y otra despliega desde GitHub.
- **Previews con su propia API**: el job de preview genera `firebase.preview.json` (con `jq`) apuntando los rewrites
  a `lab-*-pr<N>`, así producción no cambia hasta el merge.
- **Forks**: un PR desde un fork no recibe token OIDC, así que el workflow omite los jobs de despliegue.

## Desarrollo local (opcional)

```bash
cd api && npm ci && npm test
npx functions-framework --target=info --port=8080
```

En otra terminal: `curl localhost:8080/api/info`. Cambia `--target` por `questions`, `answer` o `certificate` para
probar las demás (el Functions Framework es el mismo runtime que usa Cloud Run).

## Preguntas de discusión

1. ¿Por qué en GCP las funciones **sí** aparecen (como servicios de Cloud Run) y aun así siguen siendo serverless?
2. ¿Qué parte de este sistema **no** es serverless? (Pista: ¿quién compila el código y quién corre el pipeline?)
3. Si necesitas un trigger de temporizador o de cola, ¿qué cambiarías? (Cloud Scheduler, Pub/Sub, Eventarc)
4. ¿Qué riesgos tiene calificar el quiz solo en el navegador (como la autoevaluación de la pestaña Pipeline)?
5. ¿Qué ventajas y límites tiene OIDC frente a un token de despliegue o una llave JSON de service account?
6. ¿Cuándo **no** elegirías serverless? (cargas de larga duración, latencia estricta, estado en memoria…)

## Limpieza

Todo vive en un proyecto dedicado, así que borrarlo elimina funciones, imágenes, sitio, service accounts y el pool:

```bash
gcloud projects delete "$PROJECT_ID" --quiet
gcloud projects list
```

Si conservas el repositorio, borra también las variables para que el pipeline no quede en rojo:

```bash
gh variable delete GCP_WIF_PROVIDER --repo "$GH_USER/$GH_REPO"
gh variable delete GCP_DEPLOY_SA --repo "$GH_USER/$GH_REPO"
```

---

## Anexo — El mismo laboratorio en un simulador local de AWS (Floci)

[Floci](https://github.com/floci-io/floci) es un emulador **local** de AWS, gratuito y de código abierto (MIT). Corre
en Docker y responde en `http://localhost:4566` con la misma API que AWS. Aquí despliegas a mano, con la AWS CLI, el
mismo sitio y la misma lógica (`api/src/lib/`). No forma parte de los entregables ni de la rúbrica.

| Concepto | En GCP (Partes 1–9) | En AWS / Floci |
|---|---|---|
| Función (FaaS) | Cloud Run functions (`api/src/functions/`) | AWS Lambda (`floci/lambda/`) |
| Trigger HTTP | `functions.http(...)` + rewrite de Hosting | Ruta de **API Gateway** (HTTP API) → Lambda |
| Hosting estático | Firebase Hosting | **S3** con *website hosting* |
| Mismo dominio para `/api` | Sí: Hosting reescribe hacia Cloud Run | No: hace falta **CORS** y `src/config.js` |
| Identificador de invocación | `x-cloud-trace-context` | `context.awsRequestId` |
| Instancia | Instancia de Cloud Run | Contenedor (*execution environment*) de Lambda |

Compara `api/src/functions/answer.js` con `floci/lambda/answer.js`: las dos llaman a `checkAnswer()` de
`api/src/lib/quiz.js`; solo cambia el adaptador.

**Requisitos:** Docker Desktop encendido, AWS CLI v2 y una terminal `bash`/`zsh` con `curl` y `zip`. Ejecuta todo
desde la raíz del repositorio y en la misma terminal.

```bash
# 1. Arrancar el simulador y apuntar la AWS CLI a él
docker compose -f floci/docker-compose.yml up -d
curl -s --retry 15 --retry-all-errors --retry-delay 1 http://localhost:4566/_localstack/health
export AWS_ENDPOINT_URL=http://localhost:4566 AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_PAGER=""
```

```bash
# 2. Empaquetar y crear las cuatro Lambdas
for fn in info questions answer certificate; do
  rm -rf floci/.build/$fn && mkdir -p floci/.build/$fn/lib
  cp floci/lambda/$fn.js floci/.build/$fn/index.js
  cp floci/lambda/http.js floci/.build/$fn/
  cp api/src/lib/*.js floci/.build/$fn/lib/
  (cd floci/.build/$fn && zip -qr ../$fn.zip .)
  aws lambda create-function --function-name lab-$fn \
    --runtime nodejs22.x --handler index.handler \
    --role arn:aws:iam::000000000000:role/lab-lambda \
    --zip-file fileb://floci/.build/$fn.zip --query FunctionArn --output text
done
```

```bash
# 3. API Gateway con CORS y una ruta por función
API_ID=$(aws apigatewayv2 create-api --name lab-api --protocol-type HTTP \
  --cors-configuration '{"AllowOrigins":["*"],"AllowMethods":["GET","POST","OPTIONS"],"AllowHeaders":["content-type"]}' \
  --query ApiId --output text)
ruta() {
  INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id $API_ID \
    --integration-type AWS_PROXY --payload-format-version 2.0 \
    --integration-uri arn:aws:lambda:us-east-1:000000000000:function:lab-$1 \
    --query IntegrationId --output text)
  aws apigatewayv2 create-route --api-id $API_ID --route-key "$2" \
    --target integrations/$INTEGRATION_ID --query RouteKey --output text
}
ruta info "GET /api/info"
ruta questions "GET /api/questions"
ruta answer "POST /api/answer"
ruta certificate "POST /api/certificate"
aws apigatewayv2 create-stage --api-id $API_ID --stage-name '$default' --auto-deploy --query StageName --output text
API_URL=http://$API_ID.execute-api.localhost.floci.io:4566
curl $API_URL/api/info
```

```bash
# 4. Sitio estático en S3, apuntando a la API (en GCP no hace falta: mismo dominio)
aws s3 mb s3://lab-sitio
aws s3api put-bucket-policy --bucket lab-sitio --policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::lab-sitio/*"}]}'
aws s3api put-bucket-website --bucket lab-sitio --website-configuration '{"IndexDocument":{"Suffix":"index.html"}}'
aws s3 sync src s3://lab-sitio --exclude config.js
echo "window.LAB_API_BASE = '$API_URL';" > floci/.build/config.js
aws s3 cp floci/.build/config.js s3://lab-sitio/config.js --content-type application/javascript
echo "Abre: http://lab-sitio.s3-website-us-east-1.localhost:4566/"
```

Observa los mismos conceptos: tras ~2 minutos sin uso `/api/info` vuelve a marcar `coldStart: true`; `docker ps`
muestra un contenedor `floci-aws-lab-…` por instancia; la Ráfaga muestra varios `instanceId`; y
`aws logs tail /aws/lambda/lab-info --follow` muestra los logs. La consola web está en <http://localhost:4566/_floci/ui>.

Un simulador no es la nube: no reproduce la facturación, el escalado real ni la disponibilidad. Al terminar:

```bash
docker compose -f floci/docker-compose.yml down
```
