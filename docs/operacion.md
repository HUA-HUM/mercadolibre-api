# Operación

Cómo desplegar, cómo verificar que quedó bien y qué hacer ante los problemas más frecuentes.

← [Volver al inicio](../README.md)

**Contenido**

1. [Dónde corre](#dónde-corre)
2. [Cómo entrar al servidor](#cómo-entrar-al-servidor)
3. [Deploy](#deploy)
4. [Verificar que está sano](#verificar-que-está-sano)
5. [Volver a la versión anterior](#volver-a-la-versión-anterior)
6. [Problemas frecuentes](#problemas-frecuentes)

---

## Dónde corre

| | |
|---|---|
| Servidor | Droplet de DigitalOcean `mercadolibre-api` (NYC3, Ubuntu 22.04, 1 vCPU, 2 GB) |
| Directorio | `/opt/mercadolibre-api` |
| Proceso | PM2, con el nombre `mercadolibre-api` |
| Punto de entrada | `dist/main.js` |
| Puerto | `8080`, detrás de un proxy HTTPS que publica `https://api.meli.loquieroaca.com` |
| Configuración | `/opt/mercadolibre-api/.env` |
| Logs | `~/.pm2/logs/mercadolibre-api-out.log` y `mercadolibre-api-error.log`, rotados por `pm2-logrotate` |
| Redis | Valkey administrado de DigitalOcean, `cache-manager-redis` |

Tres detalles que evitan confusiones:

- **PM2 ejecuta el código compilado** (`dist/`), no el fuente. Traer cambios con `git pull` no cambia nada de lo que está corriendo hasta compilar y reiniciar. La excepción es la documentación (`README.md` y `docs/`): el sitio la lee del disco en cada visita.
- **El Redis tiene la política de memoria `noeviction`** (cambiada el 24/11/2026; antes era `allkeys-lru`). Es lo que exige BullMQ para no perder jobs. Si Redis se llena, rechaza escrituras en vez de borrar claves.
- **Hay otro droplet, `catalog-sync-api`, con un prompt parecido.** Antes de pegar un comando, confirmar que el prompt diga `root@mercadolibre-api`.

---

## Cómo entrar al servidor

| Vía | Cuándo |
|---|---|
| **Console** del droplet en DigitalOcean | La forma normal. Necesita el agente de DigitalOcean funcionando y espacio en disco. |
| **Access → Launch Recovery Console** | Si la Console falla. Pide la contraseña de `root`. |
| SSH con una clave cargada en el droplet | Desde una terminal propia. |

Si la Console falla con `All configured authentication methods failed`, las causas probables son el disco lleno o el agente caído. Entrar por Recovery Console, revisar el disco ([Disco lleno](#disco-lleno)) y reinstalar el agente:

```bash
curl -sSL https://repos-droplet.digitalocean.com/install.sh | sudo bash
```

Si no se conoce la contraseña de `root`: **Access → Reset Root Password** genera una nueva y la manda por email. **Reinicia el droplet**: la API queda caída uno o dos minutos.

---

## Deploy

Tres pasos, y **los tres son necesarios**: traer el código, compilar y reiniciar.

```bash
cd /opt/mercadolibre-api && git status -sb
```

Antes de seguir, `git status` tiene que mostrar la rama `main` y ningún archivo modificado. Si hay cambios locales (pasó con un `axios` instalado a mano en `package.json`), guardarlos aparte antes de traer el código:

```bash
git stash push -m "cambios locales pre-deploy"
```

Después:

```bash
git checkout main && git pull && npm ci && npm run build && pm2 restart mercadolibre-api && pm2 save
```

`npm ci` instala exactamente lo que dice `package-lock.json`. Si una dependencia que el código usa no está declarada, el servicio no arranca: hay que agregarla al repositorio, no instalarla a mano en el servidor.

### Solo cambió la documentación

Si el cambio es solo en `README.md` o `docs/`, alcanza con `git pull`: no hace falta compilar ni reiniciar.

---

## Verificar que está sano

**1. El proceso está arriba y no se reinicia solo:**

```bash
pm2 status
```

`mercadolibre-api` tiene que estar `online` y la columna `↺` (reinicios) no tiene que crecer entre dos consultas.

**2. Responde, y la clave interna funciona:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/meli/categories
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/meli/products/MLA1538120729
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "x-internal-api-key: $(grep ^INTERNAL_API_KEY= .env | cut -d= -f2-)" localhost:8080/meli/products/MLA1538120729
```

Tienen que dar `200` (categorías, pública), `401` (sin clave) y `200` (con clave).

**3. El log no muestra errores nuevos:**

```bash
pm2 logs mercadolibre-api --lines 30 --nostream
```

Una línea `IMPORTANT! Eviction policy is …` significa que el Redis perdió la política `noeviction`.

**4. Hay espacio en disco:**

```bash
df -h /
```

---

## Volver a la versión anterior

```bash
cd /opt/mercadolibre-api && git log --oneline -5
```

```bash
git checkout <commit-anterior> && npm ci && npm run build && pm2 restart mercadolibre-api
```

Queda en un commit suelto (*detached HEAD*). Cuando el problema esté resuelto en `main`, volver con `git checkout main && git pull` y desplegar normalmente.

---

## Problemas frecuentes

### Disco lleno

**Síntoma:** la Console del droplet no deja entrar, el panel de DigitalOcean no muestra el uso de disco, o el servicio corta respuestas grandes a la mitad.

El 24/11/2026 el disco llegó al 100% (68 GB): 56 GB de `out.log` y 7 GB de `error.log`, porque el servicio escribía una línea por pedido y nadie rotaba los archivos. Desde entonces los logs son más cortos y `pm2-logrotate` está instalado.

```bash
df -h / && du -sh ~/.pm2/logs/*
```

Para liberar espacio (borra el contenido de los logs, sin reiniciar el servicio):

```bash
pm2 flush && journalctl --vacuum-size=200M && apt-get clean && df -h /
```

Confirmar que la rotación sigue configurada:

```bash
pm2 conf pm2-logrotate
```

Tiene que mostrar `max_size` (50M), `retain` (5) y `compress` (true). Si falta, instalarla de nuevo:

```bash
pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 50M && pm2 set pm2-logrotate:retain 5 && pm2 set pm2-logrotate:compress true && pm2 save
```

### Subí un cambio y se sigue comportando igual

Falta compilar o reiniciar. Repetir el [deploy](#deploy) completo y confirmar que `pm2 status` muestre un `uptime` de segundos.

### Después de un deploy, otro sistema empezó a recibir 401

Ese sistema llama sin `x-internal-api-key`. Pasó el 24/11/2026 con `madre-api` y `madre-ai-matcher`, que piden categorías y descripciones sin clave: esas rutas quedaron marcadas como públicas (`@Public()`). Para cualquier otra ruta, el sistema que llama tiene que enviar la clave.

### Todo devuelve 404 o vacío de golpe

Probablemente Mercado Libre rechazó la renovación del token con un `400`, y el servicio lo trata como "no hay dato". Buscar en el log:

```bash
grep "oauth/token" ~/.pm2/logs/mercadolibre-api-error.log | tail -5
```

Si aparece, hay que volver a autorizar la aplicación en Mercado Libre y cargar el token en Madre.

### Responde 401 "Reauthorize application"

El token no existe en Madre o Mercado Libre no lo renueva. Volver a autorizar la aplicación de esa cuenta (`default` o `promotions-engine-api`) y cargar el token en Madre. Para ver qué hay guardado:

```bash
curl -s -H "x-internal-api-key: $(grep ^INTERNAL_API_KEY= .env | cut -d= -f2-)" "localhost:8080/api/internal/mercadolibre/token?all=true" | grep -o '"expires_at":"[^"]*"'
```

### Muchos 429 en visitas

Es el límite de consultas por minuto de Mercado Libre. El servicio no lo puede evitar: el consumidor tiene que bajar el ritmo y respetar `Retry-After`. Para ver cuántos hubo:

```bash
grep -c "429" ~/.pm2/logs/mercadolibre-api-error.log
```

### Aparece "Resource deprecated" en el log

No es un endpoint dado de baja: es la respuesta de Mercado Libre al pedir más de 20 publicaciones juntas o con la coma sin codificar. Para ver de dónde vienen:

```bash
grep -h "Resource deprecated" ~/.pm2/logs/mercadolibre-api-*.log | grep -o "GET [^ ]*" | cut -d'?' -f1 | sort | uniq -c
```

Con el código actual no debería aparecer. Si aparece, algo está armando la consulta sin agrupar de a 20.

### Las eliminaciones en lote no avanzan

Mirar Bull Board en `/admin/queues` (usuario cualquiera, contraseña `INTERNAL_API_KEY`). Si los jobs quedan en *waiting*, el worker no está procesando: revisar el log y que el servicio esté `online`. Si fallan, el motivo de cada uno se ve en el job.

### El servicio se reinicia solo

```bash
pm2 logs mercadolibre-api --err --lines 50 --nostream
```

Las causas más comunes al arrancar son una variable obligatoria vacía (`MADRE_API_BASE_URL is not defined`, `REDIS_HOST is not defined`) o una dependencia que falta (`Cannot find module`).
