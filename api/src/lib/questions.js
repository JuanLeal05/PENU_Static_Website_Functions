// Banco de preguntas del laboratorio.
// Vive en el BACKEND (la función) y no en el navegador: así el cliente nunca
// recibe la respuesta correcta y la lógica de calificación queda en el servidor.

const questions = [
  {
    id: 'q1',
    concept: 'Qué es serverless',
    text: '¿Qué significa realmente "serverless"?',
    options: [
      'Que el código se ejecuta sin ningún servidor físico',
      'Que existen servidores, pero el proveedor los gestiona y tú solo despliegas código o configuración',
      'Que la aplicación solo funciona en el navegador del usuario',
      'Que no se necesita conexión a Internet'
    ],
    answer: 1,
    explanation:
      'Siempre hay servidores. "Serverless" significa que tú no los aprovisionas, parcheas ni escalas: el proveedor (Google Cloud) se encarga y tú te concentras en el código.'
  },
  {
    id: 'q2',
    concept: 'Pago por uso',
    text: 'En un modelo serverless de consumo, ¿cuándo pagas por el cómputo?',
    options: [
      'Pagas una tarifa fija mensual por la máquina virtual',
      'Solo cuando tu código se ejecuta (invocaciones y tiempo de ejecución)',
      'Pagas por cada usuario registrado',
      'Nunca, serverless siempre es gratis'
    ],
    answer: 1,
    explanation:
      'El modelo de consumo cobra por ejecuciones y recursos usados mientras la función corre. Si nadie la invoca, el costo de cómputo tiende a cero. (Este lab cabe en la capa gratuita mensual de Cloud Run functions y en el plan Spark de Firebase Hosting.)'
  },
  {
    id: 'q3',
    concept: 'FaaS y triggers',
    text: '¿Qué hace que una Cloud Run function se ejecute?',
    options: [
      'Un trigger (disparador): una petición HTTP, un mensaje en una cola, un temporizador, etc.',
      'Se ejecuta en un bucle infinito esperando trabajo',
      'Un administrador la inicia manualmente desde el portal cada vez',
      'Se ejecuta automáticamente cada vez que alguien abre el sitio estático'
    ],
    answer: 0,
    explanation:
      'Las funciones son "event-driven": cada una tiene exactamente un trigger. En este laboratorio todas usan trigger HTTP (por eso responden en /api/...).'
  },
  {
    id: 'q4',
    concept: 'Cold start',
    text: '¿Qué es un "cold start" (arranque en frío)?',
    options: [
      'Un error que ocurre cuando la función falla',
      'La latencia extra cuando la plataforma debe crear una instancia nueva para atender una invocación',
      'Cuando la base de datos se apaga por inactividad',
      'El tiempo que tarda GitHub Actions en desplegar'
    ],
    answer: 1,
    explanation:
      'Si no hay una instancia "caliente", Google Cloud debe asignar recursos, cargar el runtime y tu código. Esa primera invocación tarda más. En la pestaña "Laboratorio en vivo" puedes verlo con el campo coldStart.'
  },
  {
    id: 'q5',
    concept: 'Stateless',
    text: 'Guardaste un contador en una variable global de tu función. ¿Qué puede pasar?',
    options: [
      'El contador es permanente y compartido por todos los usuarios',
      'El contador se reinicia cuando la instancia se recicla y no se comparte entre instancias',
      'Google Cloud lo guarda automáticamente en una base de datos',
      'La función no se puede desplegar con variables globales'
    ],
    answer: 1,
    explanation:
      'Las funciones deben diseñarse "stateless". La memoria de una instancia es efímera y cada instancia tiene la suya. Para persistir estado se usa un servicio externo (Firestore, Cloud Storage, Cloud SQL, etc.).'
  },
  {
    id: 'q6',
    concept: 'Escalado automático',
    text: 'Llegan 1 000 peticiones simultáneas a tu API serverless. ¿Qué hace la plataforma?',
    options: [
      'Rechaza todas las peticiones por encima de 1',
      'Escala horizontalmente creando más instancias según la demanda (dentro de los límites del plan)',
      'Tienes que crear manualmente más máquinas virtuales',
      'Pone las peticiones en pausa hasta el día siguiente'
    ],
    answer: 1,
    explanation:
      'El escalado horizontal (scale-out) es automático. Prueba el botón "Ráfaga" en el laboratorio en vivo: puede que veas distintos instanceId atendiendo las llamadas.'
  },
  {
    id: 'q7',
    concept: 'Firebase Hosting',
    text: 'En Firebase Hosting, ¿quién sirve los archivos HTML/CSS/JS?',
    options: [
      'Una máquina virtual que tú administras',
      'Una red de distribución global (CDN) administrada por Google; no hay servidor web que configurar',
      'El propio navegador del estudiante',
      'Una Cloud Run function por cada archivo'
    ],
    answer: 1,
    explanation:
      'El contenido estático se publica en infraestructura global administrada. Las peticiones a /api/* se reescriben (rewrites en firebase.json) hacia los servicios Cloud Run functions que salen de la carpeta api/.'
  },
  {
    id: 'q8',
    concept: 'API administrada',
    text: 'En este lab, ¿por qué el frontend puede llamar a /api/answer sin configurar CORS?',
    options: [
      'Porque CORS no existe en Google Cloud',
      'Porque Firebase Hosting sirve el sitio y reescribe /api/* hacia las funciones bajo el mismo dominio (mismo origen)',
      'Porque el navegador desactiva CORS para estudiantes',
      'Porque la función tiene authLevel "admin"'
    ],
    answer: 1,
    explanation:
      'Firebase Hosting actúa como proxy: el sitio y /api comparten origen, así que el navegador no necesita CORS. (En el anexo de AWS, S3 y API Gateway son orígenes distintos y por eso sí hace falta.)'
  },
  {
    id: 'q9',
    concept: 'CI/CD sin llaves',
    text: 'No quieres guardar una llave JSON de service account en GitHub. ¿Cómo despliega GitHub Actions a Google Cloud?',
    options: [
      'No es posible desplegar sin una llave JSON',
      'Con Workload Identity Federation (OIDC): GitHub presenta un token firmado y Google Cloud lo cambia por credenciales temporales de una service account de permisos mínimos',
      'Escribiendo tu contraseña de Google en el YAML',
      'Subiendo los archivos manualmente por FTP'
    ],
    answer: 1,
    explanation:
      'Con Workload Identity Federation no existe ninguna credencial de larga duración: el token OIDC de cada ejecución dura minutos y solo el repositorio autorizado puede canjearlo por la identidad de una service account con permisos mínimos. No hay secreto que filtrar.'
  },
  {
    id: 'q10',
    concept: 'Entornos de preview',
    text: '¿Qué ocurre cuando abres un Pull Request contra main en este repositorio?',
    options: [
      'Nada, solo los push a main hacen algo',
      'El pipeline ejecuta pruebas y despliega un entorno de preview con su propia URL',
      'Se borra el sitio de producción',
      'GitHub cobra el despliegue'
    ],
    answer: 1,
    explanation:
      'Firebase Hosting crea un canal de preview por Pull Request y el pipeline despliega copias de las funciones con sufijo -pr<N>, así la preview tiene su propia API. Al cerrar el PR, el job "close" borra el canal y esas funciones.'
  },
  {
    id: 'q11',
    concept: 'Escalado a cero',
    text: '¿Qué significa que una función serverless escale a cero?',
    options: [
      'Que la función deja de existir',
      'Que sin tráfico no hay instancias encendidas y no se paga cómputo',
      'Que solo atiende cero peticiones por segundo',
      'Que se apaga el sitio estático'
    ],
    answer: 1,
    explanation:
      'Con --min-instances=0 Cloud Run elimina las instancias inactivas; la siguiente petición paga un cold start.'
  }
];

module.exports = { questions };
