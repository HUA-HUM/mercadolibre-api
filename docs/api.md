# Referencia de la API

Todos los endpoints del servicio, agrupados por tema.

← [Volver al inicio](../README.md)

**URL base de producción:** `https://api.meli.loquieroaca.com`

Los ejemplos usan dos variables de entorno para no repetir la URL y la clave:

```bash
export MELI_API_URL="https://api.meli.loquieroaca.com"
export INTERNAL_API_KEY="..."
```

**Contenido**

| Grupo | Endpoints |
|---|---|
| [Publicaciones](#publicaciones) | Listado · Detalle · Detalle en lote · Descripción · Comisión |
| [Cambios en publicaciones](#cambios-en-publicaciones) | Cambiar precio · Eliminar · Eliminar en lote |
| [Visitas](#visitas) | De una publicación · En lote |
| [Ventas](#ventas) | De la cuenta · De una publicación |
| [Categorías](#categorías) | Principales · Una categoría · Una categoría, completa |
| [Promociones](#promociones) | Campañas · Publicaciones de una campaña · Sumar · Sacar · Eliminar campaña |
| [Credenciales](#credenciales) | Token guardado |

### Autenticación

Todos los endpoints piden el header:

```
x-internal-api-key: <INTERNAL_API_KEY>
```

Excepto estos cuatro, que devuelven datos públicos de Mercado Libre:

- `GET /meli/categories`
- `GET /meli/categories/:id`
- `GET /meli/categories/:id/raw`
- `GET /meli/products/:itemId/description`

### Convenciones

- **Cuenta de Mercado Libre** — todo usa la cuenta principal (`default`), salvo promociones, que usan siempre `promotions-engine-api`. Cambiar precio y eliminar aceptan `?appKey=` para elegir.
- **Errores** — `400` pedido mal armado, `401` clave interna, `404` Mercado Libre no tiene el dato, `429` límite de Mercado Libre (con `Retry-After`), `502` Mercado Libre falló. El catálogo completo está en [Errores y límites](errores.md).
- **Números de publicación** — se envían como `MLA…`. En los parámetros de lote van separados por coma.
- **Sitio** — categorías y comisiones son siempre de Mercado Libre Argentina (`MLA`).

---

## Publicaciones

### Listado de publicaciones

```
GET /mercadolibre/products
```

Devuelve los números de publicación de la cuenta principal.

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `status` | query | `active` | `active`, `paused` o `closed`. |
| `offset` | query | `0` | Posición desde donde empezar. |
| `limit` | query | `50` | Cantidad por página. |
| `useScan` | query | `false` | `true` fuerza el recorrido continuo. |
| `scrollId` | query | — | Marca devuelta por la página anterior en recorrido continuo. |

El recorrido continuo se activa solo con `useScan=true`, con `offset` de 1.000 o más, o al enviar `scrollId`. En ese modo se ignora `offset`.

```bash
curl -s "$MELI_API_URL/mercadolibre/products?status=active&limit=50" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

```json
{
  "seller_id": "123456789",
  "items": ["MLA1538120729", "MLA1424202023"],
  "pagination": { "limit": 50, "offset": 0, "total": 1248321, "has_next": true }
}
```

En recorrido continuo la respuesta suma `scroll_id`, `offset` es siempre `0` y `has_next` es `true` mientras la página traiga resultados:

```json
{
  "seller_id": "123456789",
  "items": ["MLA1538120729"],
  "scroll_id": "YXBpY29yZS1pdGVtcw==",
  "pagination": { "limit": 50, "offset": 0, "total": 1248321, "has_next": true }
}
```

Si Mercado Libre no responde con datos: `items: []`, `total: 0` y `seller_id` vacío.

### Detalle de una publicación

```
GET /meli/products/:itemId
```

```bash
curl -s "$MELI_API_URL/meli/products/MLA1538120729" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

Campos principales de la respuesta:

| Campo | Descripción |
|---|---|
| `id`, `title`, `categoryId` | Número, título y categoría. |
| `price`, `currency` | Precio y moneda. |
| `stock`, `soldQuantity` | Stock disponible y unidades vendidas. |
| `status`, `condition`, `listingTypeId`, `buyingMode` | Estado, condición, tipo de publicación y modo de compra. |
| `permalink`, `thumbnail`, `pictures` | Enlace, miniatura y URLs de las fotos. |
| `sellerSku`, `brand`, `warranty` | Atributos `SELLER_SKU` y `BRAND`, y garantía. |
| `freeShipping`, `health` | Envío gratis y salud de la publicación. |
| `description` | Descripción en texto plano. |
| `lastUpdated` | Última modificación. |

Además devuelve, con sus nombres originales de Mercado Libre: `site_id`, `seller_id`, `user_product_id`, `family_id`, `family_name`, `official_store_id`, `base_price`, `original_price`, `inventory_id`, `initial_quantity`, `available_quantity`, `sale_terms`, `start_time`, `stop_time`, `end_time`, `expiration_time`, `date_created`, `last_updated`, `video_id`, `accepts_mercadopago`, `shipping`, `international_delivery_mode`, `attributes`, `variations`, `sub_status`, `tags`, `catalog_product_id`, `domain_id`, `seller_custom_field`, `parent_item_id`, `automatic_relist`, `catalog_listing`, `channels`, `warnings`, `item_relations` y `deal_ids`.

`404 Product with id … not found` si Mercado Libre no la devuelve.

### Detalle de varias publicaciones

```
GET /meli/products/bulk?ids=MLA1,MLA2,...
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `ids` | query | Números de publicación separados por coma. Obligatorio. |

Devuelve un array con el mismo formato que el detalle individual. Los repetidos se consultan una vez y las publicaciones que Mercado Libre no devuelve se omiten. Internamente consulta de a 20 publicaciones y trae las descripciones de a 5 en paralelo.

```bash
curl -s "$MELI_API_URL/meli/products/bulk?ids=MLA1538120729,MLA1424202023" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

`400 At least one itemId is required` si `ids` viene vacío.

### Descripción

```
GET /meli/products/:itemId/description
```

**No requiere clave.** Devuelve la respuesta de Mercado Libre sin modificar:

```json
{
  "text": "",
  "plain_text": "TIENDA LO QUIERO ACÁ – IMPORTADOS…",
  "last_updated": "2026-10-02T14:03:11.000Z",
  "date_created": "2025-05-30T12:00:00.000Z",
  "snapshot": { "url": "…", "width": 0, "height": 0, "status": "" }
}
```

`404 Product description with id … not found` si no existe.

### Comisión

```
GET /meli/products/:itemId/commission
```

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `price` | query | El de la publicación | Precio para calcular la comisión. |
| `category_id` | query | La de la publicación | Categoría. |
| `listing_type_id` | query | El de la publicación | Tipo de publicación (`gold_special`, `gold_pro`…). |

Si falta alguno de los tres, se lee la publicación para completarlo. Devuelve la respuesta de `/sites/MLA/listing_prices` de Mercado Libre.

```bash
curl -s "$MELI_API_URL/meli/products/MLA1538120729/commission?price=150000" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

`404 Listing prices for product … not found` si la publicación no existe o Mercado Libre no devuelve precios.

---

## Cambios en publicaciones

### Cambiar el precio

```
PATCH /meli/products/:itemId/price
```

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `price` | body | — | Precio nuevo. Número mayor a cero. |
| `appKey` | query | `default` | `default` o `promotions-engine-api`. |

```bash
curl -s -X PATCH "$MELI_API_URL/meli/products/MLA1538120729/price" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"price": 149999}'
```

```json
{
  "id": "MLA1538120729",
  "appKey": "default",
  "previousPrice": 155000,
  "price": 149999,
  "currency": "ARS",
  "status": "active",
  "lastUpdated": "2026-11-25T13:10:00.000Z"
}
```

Errores: `400 Price must be a positive number`, `400 Unsupported appKey`, `404` si la publicación no existe, y `403` o `502` con `operation: "update_price"` si Mercado Libre rechaza el cambio.

### Eliminar una publicación

```
DELETE /meli/products/:itemId
```

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `appKey` | query | `default` | `default` o `promotions-engine-api`. |

Finaliza la publicación si hace falta y después la elimina. Si Mercado Libre responde que está en uso (`409` u *optimistic locking*), reintenta la eliminación hasta 3 veces, con 1 segundo entre intentos.

```bash
curl -s -X DELETE "$MELI_API_URL/meli/products/MLA1538120729" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

```json
{
  "id": "MLA1538120729",
  "appKey": "default",
  "deleted": true,
  "alreadyDeleted": false,
  "closePerformed": true,
  "status": "closed",
  "subStatus": ["deleted"]
}
```

| Campo | Significado |
|---|---|
| `alreadyDeleted` | `true` si ya estaba eliminada: no se hizo nada. |
| `closePerformed` | `true` si hubo que finalizarla antes. |

Errores: `400 Unsupported appKey`, `404` si no existe, y `403` o `502` con `operation: "close"` o `"delete"` si Mercado Libre la rechaza.

### Eliminar en lote

```
POST /meli/products/bulk/delete
```

Encola las publicaciones y responde enseguida. Se procesan de a una en segundo plano, con hasta 5 intentos cada una. El avance se ve en `/admin/queues`.

| Campo | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `ids` | body | — | Array de números de publicación, o un texto separado por comas. |
| `appKey` | body | `default` | `default` o `promotions-engine-api`. |

```bash
curl -s -X POST "$MELI_API_URL/meli/products/bulk/delete" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["MLA1496032965", "MLA1757293798"], "appKey": "default"}'
```

```json
{
  "batchId": "1a895bad-d2f8-4d83-8f98-9112105c456b",
  "queued": 2,
  "appKey": "default",
  "jobs": [
    { "itemId": "MLA1496032965", "jobId": "1a895bad-d2f8-4d83-8f98-9112105c456b-MLA1496032965" },
    { "itemId": "MLA1757293798", "jobId": "1a895bad-d2f8-4d83-8f98-9112105c456b-MLA1757293798" }
  ]
}
```

Los números repetidos se encolan una vez. Errores: `400 At least one item id is required`, `400 Unsupported appKey`. Qué se reintenta y qué no está en [Errores y límites](errores.md#eliminación-en-lote-qué-se-reintenta).

---

## Visitas

### Visitas de una publicación

```
GET /meli/items/:itemId/visits
```

```bash
curl -s "$MELI_API_URL/meli/items/MLA1538120729/visits" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

```json
{ "item_id": "MLA1538120729", "total": 30 }
```

`404 Mercado Libre did not return visits for item …` si Mercado Libre no la midió. Nunca devuelve `total: 0` por un fallo.

### Visitas en lote

```
GET /meli/items/visits?ids=MLA1,MLA2,...
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `ids` | query | Hasta 100 números de publicación distintos, separados por coma. |

```bash
curl -s "$MELI_API_URL/meli/items/visits?ids=MLA1538120729,MLA1424202023,MLA9999999999" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

```json
[
  { "item_id": "MLA1538120729", "total": 30 },
  { "item_id": "MLA1424202023", "total": 161 }
]
```

`MLA9999999999` no existe, así que no aparece.

**Contrato:**

- Solo vienen las publicaciones que Mercado Libre midió. Un `total: 0` es siempre real.
- Mercado Libre acepta una publicación por consulta: el servicio hace una por cada una, 3 en paralelo. El lote ahorra viajes entre servicios, no consultas a Mercado Libre.
- Cada valor medido se guarda 30 minutos en memoria. Los no medidos no se guardan.
- Si Mercado Libre limita a mitad del lote: `200` con lo medido hasta ahí. Si no se midió ninguna: `429` con `Retry-After`.
- Si se pidieron varias y Mercado Libre no contestó ninguna: `502`.

Errores: `400 At least one itemId is required`, `400 At most 100 itemIds per request`.

---

## Ventas

### Ventas de la cuenta

```
GET /meli/orders
```

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `status` | query | `paid` | Estado de la venta en Mercado Libre. |
| `limit` | query | `50` | Cantidad por página. |
| `offset` | query | `0` | Posición desde donde empezar. |

```bash
curl -s "$MELI_API_URL/meli/orders?status=paid&limit=50&offset=0" \
  -H "x-internal-api-key: $INTERNAL_API_KEY"
```

```json
{
  "results": [
    {
      "id": 2032217210,
      "status": "paid",
      "dateCreated": "2026-11-20T10:51:05.000-03:00",
      "dateClosed": "2026-11-20T10:51:07.000-03:00",
      "totalAmount": 943999,
      "currencyId": "ARS",
      "items": [
        { "itemId": "MLA1757293798", "title": "Freidora De Aire…", "quantity": 1, "unitPrice": 943999 }
      ]
    }
  ],
  "paging": { "total": 1200, "offset": 0, "limit": 50 }
}
```

Si Mercado Libre no responde con datos: `results: []` y `total: 0`.

### Ventas de una publicación

```
GET /meli/products/:itemId/orders
```

Mismos parámetros y respuesta que el anterior. Usa el buscador de ventas de Mercado Libre (`q=<itemId>`), que busca el texto entre número de venta, número y título de la publicación y apodo del comprador.

---

## Categorías

Los tres endpoints **no requieren clave**.

### Categorías principales

```
GET /meli/categories
```

```json
[
  { "id": "MLA5725", "name": "Accesorios para Vehículos" },
  { "id": "MLA1512", "name": "Agro" }
]
```

Devuelve `[]` si Mercado Libre no responde con datos.

### Una categoría

```
GET /meli/categories/:id
```

```json
{
  "id": "MLA1055",
  "name": "Celulares y Smartphones",
  "picture": "https://http2.mlstatic.com/…png",
  "totalItems": 103418,
  "pathFromRoot": [
    { "id": "MLA1051", "name": "Celulares y Teléfonos" },
    { "id": "MLA1055", "name": "Celulares y Smartphones" }
  ],
  "children": []
}
```

`children` trae las subcategorías directas, con `id`, `name` y `totalItems`. `404 Category … not found` si no existe.

### Una categoría, completa

```
GET /meli/categories/:id/raw
```

La respuesta de Mercado Libre para `/categories/:id`, sin modificar (incluye `path_from_root`, `children_categories`, `settings`, etc.). `404 Category … not found` si no existe.

---

## Promociones

Todos usan la cuenta `promotions-engine-api` y la versión 2 de la API de promociones de Mercado Libre. Las respuestas son las de Mercado Libre, sin modificar.

### Campañas disponibles

```
GET /meli/seller-promotions
```

Las campañas del vendedor configurado en `MELI_PROMOTIONS_ENGINE_API_SELLER_ID`. `404 Promotions not found for configured Mercado Libre seller` si Mercado Libre no devuelve nada.

### Publicaciones de una campaña

```
GET /meli/seller-promotions/:promotionId/items
```

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `promotion_type` | query | El de la campaña, o `DEAL` | Tipo de campaña. Si no se envía, se busca en las campañas de la cuenta. |
| `limit` | query | El de Mercado Libre | Cantidad por página. |
| `searchAfter` | query | — | Marca para pedir la página siguiente. |

Si la consulta falla, se reintenta una vez a los 300 ms. `404 Promotion items not found for promotion …` si no hay respuesta.

### Sumar una publicación a una campaña

```
POST /meli/seller-promotions/items/:itemId
```

```bash
curl -s -X POST "$MELI_API_URL/meli/seller-promotions/items/MLA1538120729" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"promotion_id": "P-MLA123456", "promotion_type": "SELLER_CAMPAIGN", "offer_id": "OFFER-MLA1538120729-123"}'
```

El cuerpo se envía tal cual a Mercado Libre. Si Mercado Libre la rechaza, la respuesta lleva su mismo código, con `meliStatus` y `meliResponse`.

### Sacar una publicación de una campaña

```
DELETE /meli/seller-promotions/items/:itemId
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `promotion_id` | query | Obligatorio. |
| `promotion_type` | query | Obligatorio. |
| `offer_id` | query | Obligatorio, salvo en campañas `DEAL`. |

Responde con el código y el cuerpo exactos de Mercado Libre.

### Eliminar una campaña

```
DELETE /meli/seller-promotions/promotions/:promotionId
```

| Parámetro | Tipo | Por defecto |
|---|---|---|
| `promotion_type` | query | `SELLER_CAMPAIGN` |

Si Mercado Libre la rechaza: `502` con lo que contestó en `upstream` (`status`, `path` y `data`).

---

## Credenciales

### Token guardado

```
GET /api/internal/mercadolibre/token
```

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `appKey` | query | `default` | Cuenta a consultar. |
| `all` | query | — | `true` devuelve las dos cuentas conocidas. |

Devuelve el token tal como está guardado en Madre: **no lo renueva ni revisa si venció**. Incluye `access_token` y `refresh_token`, así que la respuesta es tan sensible como la clave de la cuenta.

```json
{
  "default": {
    "app_key": "default",
    "access_token": "APP_USR-…",
    "refresh_token": "TG-…",
    "expires_in": 21600,
    "expires_at": "2026-11-25T19:04:53.000Z"
  },
  "promotions-engine-api": { "…": "…" }
}
```

El ejemplo es con `all=true`. Sin `all`, devuelve solo el objeto de la cuenta pedida, o una respuesta vacía si Madre no tiene token para esa cuenta.
