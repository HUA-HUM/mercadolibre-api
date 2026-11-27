# Errores y límites

Qué responde el servicio cuando algo sale mal, qué significa cada respuesta y qué hacer. Al final, los límites de Mercado Libre que explican la mayoría de los casos.

← [Volver al inicio](../README.md)

Todas las respuestas de error tienen el mismo formato base. Algunas suman campos con lo que contestó Mercado Libre:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Product with id MLA1538120729 not found"
}
```

**Contenido**

- [Los más frecuentes](#los-más-frecuentes)
- [Pedidos mal armados](#pedidos-mal-armados)
- [Acceso](#acceso)
- [No encontrado](#no-encontrado)
- [Límite de consultas de Mercado Libre](#límite-de-consultas-de-mercado-libre)
- [Mercado Libre falló o rechazó un cambio](#mercado-libre-falló-o-rechazó-un-cambio)
- [Permiso de Mercado Libre vencido o inexistente](#permiso-de-mercado-libre-vencido-o-inexistente)
- [Respuestas vacías que no son error](#respuestas-vacías-que-no-son-error)
- [Límites de Mercado Libre](#límites-de-mercado-libre)
- [Eliminación en lote: qué se reintenta](#eliminación-en-lote-qué-se-reintenta)

---

## Los más frecuentes

| Respuesta | En una línea | Qué hacer |
|---|---|---|
| `401 Internal API key missing` | Falta el header `x-internal-api-key`. | Enviar la clave interna. |
| `401 Invalid internal API key` | La clave no coincide. | Revisar que sea la misma que `INTERNAL_API_KEY` del servicio. |
| `404 … not found` | Mercado Libre no tiene ese dato, o no es de la cuenta. | Revisar el número. Reintentar no cambia nada. |
| [`429 too_many_requests`](#límite-de-consultas-de-mercado-libre) | Mercado Libre está limitando las consultas. | Esperar lo que indica `Retry-After` y reintentar. |
| [`502 [MELI API ERROR]`](#mercado-libre-falló-o-rechazó-un-cambio) | Mercado Libre falló o no respondió. | Reintentar más tarde. |
| [`401 … Reauthorize application`](#permiso-de-mercado-libre-vencido-o-inexistente) | El permiso de Mercado Libre no existe o no se pudo renovar. | Volver a autorizar la aplicación. |

---

## Pedidos mal armados

Responden `400 Bad Request`. Reintentar el mismo pedido no sirve: hay que corregirlo.

| Mensaje | Dónde | Causa |
|---|---|---|
| `ItemId is required` | Publicaciones, ventas, visitas | Falta el número de publicación. |
| `At least one itemId is required` | Detalle en lote, visitas en lote | `ids` vino vacío o sin enviar. |
| `At least one item id is required` | Eliminación en lote | `ids` vino vacío. |
| `At most 100 itemIds per request` | Visitas en lote | Se pidieron más de 100 publicaciones distintas. |
| `Price must be a positive number` | Cambio de precio | El precio no es un número o es cero o negativo. |
| `Unsupported appKey "…"` | Cambio de precio, eliminación | La cuenta no es `default` ni `promotions-engine-api`. |
| `promotion_id and promotion_type are required` | Sacar de una campaña | Falta alguno de los dos. |
| `promotion_id, promotion_type and offer_id are required …` | Sacar de una campaña | Falta `offer_id` en una campaña que no es `DEAL`. |
| `CategoryId is required` | Categorías | Falta el número de categoría. |
| `OrderId must be numeric` · `PackId must be numeric` | Detalle de venta o de carrito, factura | El número tiene algo que no es un dígito. |
| `A PDF is required in the multipart field "fiscal_document"` | Subir factura | No vino el archivo. |
| `Only PDF or XML files are accepted (…)` · `Exactly one PDF is required` · `At most one XML is accepted` | Subir factura | Archivos de otro tipo, o más de un PDF o de un XML. |

---

## Acceso

| Respuesta | Causa | Qué hacer |
|---|---|---|
| `401 Internal API key missing` | El pedido no trae `x-internal-api-key`. | Enviarla. Solo las categorías y la descripción de una publicación se responden sin clave. |
| `401 Invalid internal API key` | La clave no coincide con la del servicio. | Revisar la variable del sistema que llama (por ejemplo `MELI_INTERNAL_API_KEY` en catalog-sync-api). |
| `503 INTERNAL_API_KEY is not configured` | El servicio arrancó sin clave interna configurada. | Es un problema del servidor, no del pedido: hay que completar `INTERNAL_API_KEY` en su `.env` y reiniciarlo. |

Bull Board (`/admin/queues`) usa la misma clave: por header, o como contraseña del usuario y clave que pide el navegador (el usuario puede ser cualquiera).

---

## No encontrado

Responden `404 Not Found`. Significa que Mercado Libre no devolvió el dato: la publicación, categoría o campaña no existe, no pertenece a la cuenta, o Mercado Libre la rechazó por permisos.

| Mensaje | Dónde |
|---|---|
| `Product with id … not found` | Detalle, cambio de precio, eliminación |
| `Product description with id … not found` | Descripción |
| `Listing prices for product … not found` | Comisión |
| `Mercado Libre did not return visits for item …` | Visitas de una publicación |
| `Category … not found` | Categoría |
| `Order with id … not found` | Detalle de una venta (también si se pasa un número de carrito), factura |
| `Pack with id … not found` | Detalle de un carrito |
| `Promotions not found for configured Mercado Libre seller` | Campañas disponibles |
| `Promotion items not found for promotion …` | Publicaciones de una campaña |
| `Promotion activation failed for item …` | Sumar a una campaña, cuando Mercado Libre no devolvió respuesta |
| `Promotion removal failed for promotion …` | Eliminar una campaña, cuando Mercado Libre no devolvió respuesta |

**Por qué un "permiso denegado" de Mercado Libre se ve como 404:** el servicio trata igual los rechazos `400`, `403` y `404` de Mercado Libre en las consultas: "no hay dato". El motivo exacto queda en el log del servicio, en una línea `[MELI API] 403 GET /items/… – <motivo>`.

---

## Límite de consultas de Mercado Libre

Mercado Libre limita cuántas consultas acepta por minuto. Cuando corta, el servicio **no inventa un resultado ni reintenta**: responde `429` con el header `Retry-After` (en segundos) y este cuerpo:

```json
{
  "statusCode": 429,
  "error": "too_many_requests",
  "message": "Mercado Libre rate limit reached. Retry later.",
  "retryAfterSeconds": 60,
  "path": "/visits/items?ids=MLA1538120729"
}
```

**Qué hacer:** esperar los segundos indicados y reintentar. Si Mercado Libre no informa cuánto esperar, el servicio indica 60.

**En las visitas en lote** es distinto: si Mercado Libre corta a mitad del lote, la respuesta es `200` con las publicaciones medidas hasta ahí y sin las demás. El `429` aparece solo si no se llegó a medir ninguna. Las que faltan se vuelven a pedir en la pasada siguiente.

---

## Mercado Libre falló o rechazó un cambio

### Mercado Libre no respondió o tuvo un error interno

`502 Bad Gateway`. Mercado Libre devolvió un error `5xx`, o no contestó en 5 segundos:

```json
{
  "statusCode": 502,
  "message": "[MELI API ERROR] 503 – Request failed with status code 503",
  "meliStatus": 503
}
```

`meliStatus` es `null` cuando no hubo respuesta (tiempo agotado o error de red). **Qué hacer:** reintentar más tarde.

Este mismo `502` aparece si el que no responde es **Madre**, al buscar el permiso de Mercado Libre. El log aclara cuál de los dos fue, porque muestra la URL.

### Mercado Libre rechazó un cambio de precio o una eliminación

Si Mercado Libre se niega a finalizar, eliminar o cambiar el precio de una publicación, la respuesta incluye la operación y lo que contestó Mercado Libre:

```json
{
  "statusCode": 502,
  "message": "Mercado Libre could not delete item MLA1538120729",
  "operation": "delete",
  "itemId": "MLA1538120729",
  "meliStatus": 400,
  "meliResponse": { "message": "…" }
}
```

| `operation` | Paso que falló |
|---|---|
| `close` | Finalizar la publicación antes de eliminarla. |
| `delete` | Eliminarla. |
| `update_price` | Cambiar el precio. |
| `upload_invoice` | Adjuntar la factura a una venta (el mensaje nombra el carrito: `Mercado Libre could not attach the invoice to pack …`). |

Si Mercado Libre respondió `403` (falta de permiso sobre la publicación), el código es `403 Forbidden` en lugar de `502`. **Qué hacer:** leer `meliResponse`; casi siempre es la publicación en un estado que no admite el cambio, o una cuenta que no es la dueña.

### Mercado Libre rechazó una acción de promociones

| Acción | Cómo responde |
|---|---|
| Sumar una publicación | Con el mismo código que dio Mercado Libre (por ejemplo `400`), con `meliStatus` y `meliResponse`. |
| Sacar una publicación | Con el código y el cuerpo exactos de Mercado Libre. |
| Eliminar una campaña | `502`, con lo que contestó Mercado Libre en `upstream`. |


### La venta ya tiene factura

`409 Conflict` al subir una factura: `Order … already has an invoice in Mercado Libre. Send force=true to upload another one.` La respuesta trae en `documents` lo que Mercado Libre tiene cargado. **Qué hacer:** si es la misma factura, nada. Si es una nueva (por ejemplo, después de una nota de crédito), repetir con `force=true`.
---

## Permiso de Mercado Libre vencido o inexistente

| Mensaje | Causa |
|---|---|
| `401 MercadoLibre token not found for app "…". Reauthorize application.` | Madre no tiene permiso guardado para esa cuenta. |
| `401 Invalid refresh token response from MercadoLibre. Reauthorize application.` | Mercado Libre contestó la renovación sin un permiso válido. |

**Qué hacer:** volver a autorizar la aplicación en Mercado Libre y cargar el permiso en Madre. Este servicio no lo puede hacer solo.

**Un caso que no se ve como error de permiso:** si Mercado Libre rechaza la renovación con un `400` (por ejemplo porque el permiso de renovación ya se usó), las consultas siguientes responden `404` o vacío, como si no hubiera datos. Si de golpe "nada existe", buscar en el log una línea `[MELI API] 400 POST …/oauth/token`.

---

## Respuestas vacías que no son error

Algunas consultas responden `200` vacío cuando Mercado Libre no devuelve datos, en lugar de un error. Hay que tenerlo en cuenta antes de interpretar un vacío como "no hay":

| Consulta | Si Mercado Libre no responde con datos |
|---|---|
| Listado de publicaciones | `items: []`, `total: 0` y `seller_id` vacío. |
| Ventas | `results: []` y `total: 0`. |
| Categorías principales | `[]`. |
| Detalle en lote | Solo las publicaciones que Mercado Libre devolvió; puede ser `[]`. |
| Visitas de una publicación | Nunca vacío: `404`. |
| Visitas en lote | Solo las medidas. Si no se midió ninguna de varias, `502`. |

---

## Límites de Mercado Libre

Comprobados con consultas directas a Mercado Libre en noviembre de 2026:

| Límite | Qué pasa si se supera | Cómo lo maneja el servicio |
|---|---|---|
| **Visitas: 1 publicación por consulta** | `400 maximum amount of items to query is 1` | Consulta de a una, tres en paralelo. |
| **Detalle de publicaciones: 20 por consulta** | `403 Resource deprecated - client no longer allowed to consume this resource` | Agrupa de a 20. |
| **Coma entre números de publicación** | Con la coma tal cual, Mercado Libre responde `403 Resource deprecated`; codificada (`%2C`) funciona. | Siempre la codifica. |
| **Consultas por minuto** | `429 Too many requests` | Responde `429` con `Retry-After`. |

Dos aclaraciones:

- El mensaje **`Resource deprecated` es engañoso**: Mercado Libre no dio de baja nada, es su forma de rechazar más de 20 publicaciones o la coma sin codificar.
- **No hay un número oficial de consultas por minuto.** catalog-sync-api midió unas 300 por minuto en visitas antes de que Mercado Libre empiece a rechazar. Es una estimación, no un límite publicado.

---

## Eliminación en lote: qué se reintenta

Cada publicación del lote se procesa por separado. Lo que falla se trata así:

| Causa | ¿Se reintenta? |
|---|---|
| Mercado Libre no respondió o tuvo un error interno | Sí, hasta 5 intentos. |
| Mercado Libre limitó por tasa (`429`) | Sí. |
| La publicación estaba siendo modificada (`409`) | Sí. |
| La publicación no existe o no se puede leer | No. |
| Falta de permiso (`403`) | No. |
| Cuenta inválida u otro `4xx` | No. |

Entre intentos espera 30 segundos y duplica la espera cada vez. Las eliminaciones completadas se ven en Bull Board durante 7 días; las que fallaron del todo, durante 14.
