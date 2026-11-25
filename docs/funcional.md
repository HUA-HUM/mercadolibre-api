# Guía funcional

Qué hace el servicio con las publicaciones, visitas, ventas, categorías y promociones de la cuenta de Mercado Libre, explicado desde el negocio.

← [Volver al inicio](../README.md)

**Contenido**

1. [Para qué existe](#para-qué-existe)
2. [Las dos cuentas de acceso](#las-dos-cuentas-de-acceso)
3. [Publicaciones](#publicaciones)
4. [Cambiar el precio](#cambiar-el-precio)
5. [Eliminar publicaciones](#eliminar-publicaciones)
6. [Visitas](#visitas)
7. [Ventas](#ventas)
8. [Categorías](#categorías)
9. [Promociones y campañas](#promociones-y-campañas)
10. [Quién puede consultar qué](#quién-puede-consultar-qué)
11. [Lo que el servicio no hace](#lo-que-el-servicio-no-hace)

---

## Para qué existe

Mercado Libre pone condiciones para consultar sus datos: hay que presentar un permiso vigente (el token), ese permiso vence cada pocas horas, hay un límite de consultas por minuto y cada tipo de dato tiene sus propias reglas. Si cada sistema de la tienda resolviera eso por su cuenta, los errores se repetirían en todos lados.

Este servicio concentra esa relación. Los demás sistemas le piden "el detalle de esta publicación" o "las visitas de estas cien publicaciones", y él se ocupa del resto.

Hoy lo usan:

| Sistema | Para qué |
|---|---|
| catalog-sync-api | Sincronizar el catálogo: listado de publicaciones, detalle, visitas y categorías. |
| madre-api | Armar la ruta de categorías y traer descripciones de productos. |
| madre-ai-matcher | Clasificar productos en categorías de Mercado Libre. |
| panel-admin | Eliminar publicaciones en lote desde el panel. |

---

## Las dos cuentas de acceso

El servicio tiene dos juegos de credenciales de Mercado Libre, cada uno con su propio permiso:

| Cuenta | Nombre interno | Se usa para |
|---|---|---|
| Principal | `default` | Todo, salvo promociones. |
| Motor de promociones | `promotions-engine-api` | Las promociones siempre. También se puede elegir para cambiar precios o eliminar publicaciones. |

Los permisos se guardan en Madre. Cuando a uno le faltan menos de 5 minutos para vencer, el servicio lo renueva solo y guarda el nuevo. Si una consulta llega cuando otra ya está renovando, espera esa renovación en lugar de pedir otra: Mercado Libre invalida el permiso anterior al renovarlo, y dos renovaciones simultáneas dejan a una sin efecto.

Si el permiso no existe o Mercado Libre se niega a renovarlo, el servicio responde que hay que **volver a autorizar la aplicación** en Mercado Libre. Esa autorización inicial no la hace este servicio: se hace a mano y el permiso resultante se carga en Madre.

---

## Publicaciones

### El listado

Devuelve los números de publicación (`MLA…`) de la cuenta principal, filtrados por estado:

| Estado | Qué incluye |
|---|---|
| `active` | Publicaciones activas. Es el valor por defecto. |
| `paused` | Pausadas. |
| `closed` | Finalizadas. |

Mercado Libre no deja recorrer más de 1.000 resultados por posición (página 1, página 2…). Para catálogos más grandes, el servicio cambia solo a un **recorrido continuo**: devuelve una marca (`scroll_id`) que se envía en el pedido siguiente para seguir desde donde quedó. Esto pasa automáticamente al pedir a partir del resultado 1.000, o cuando se envía la marca.

### El detalle

Para cada publicación devuelve título, precio, moneda, stock disponible, cantidad vendida, estado, condición (nueva o usada), tipo de publicación, enlace, fotos, SKU del vendedor, marca, garantía, si tiene envío gratis, la salud de la publicación según Mercado Libre y la descripción en texto plano.

Se puede pedir de a una o hasta muchas juntas. En el pedido en lote, el servicio agrupa las consultas de a 20, que es lo máximo que Mercado Libre acepta, y descarta los números repetidos. Las publicaciones que Mercado Libre no devuelve, por ejemplo porque no existen, se omiten del resultado.

### La descripción

La descripción tal como la guarda Mercado Libre, en texto plano. Es un dato público, así que se puede consultar sin la clave interna.

### La comisión

Cuánto cobra Mercado Libre por vender esa publicación: comisión por venta y costos asociados, según el precio, la categoría y el tipo de publicación. Si no se indican esos tres datos, se toman de la publicación tal como está hoy. Se puede pasar un precio distinto para simular cuánto se cobraría con ese precio.

La consulta es siempre para Mercado Libre Argentina.

---

## Cambiar el precio

Actualiza el precio de una publicación y devuelve el precio anterior y el nuevo. El precio tiene que ser un número mayor a cero.

Antes de cambiarlo, el servicio confirma que la publicación existe; si no, no hace nada. Si Mercado Libre rechaza el cambio, devuelve el motivo tal como lo dio Mercado Libre.

---

## Eliminar publicaciones

En Mercado Libre una publicación no se puede eliminar directamente: primero hay que **finalizarla** y recién después **eliminarla**. El servicio hace los dos pasos:

1. Si la publicación ya está eliminada, no hace nada y lo informa.
2. Si no está finalizada, la finaliza y espera un segundo.
3. La elimina. Si Mercado Libre contesta que la publicación está siendo modificada por otro proceso, espera un segundo y reintenta, hasta tres veces en total.

La respuesta indica si se eliminó, si ya estaba eliminada y si hubo que finalizarla primero.

### Eliminación en lote

Para eliminar muchas publicaciones (por ejemplo desde el panel), se envía la lista completa y el servicio la procesa **en segundo plano**, de a una por vez:

- Responde enseguida con un número de lote y la lista de publicaciones encoladas. Los números repetidos se encolan una sola vez.
- Cada publicación que falla por una causa pasajera (Mercado Libre no responde, está saturado, la publicación está en uso) se reintenta hasta **5 veces**, esperando cada vez más: 30 segundos, 1 minuto, 2, 4…
- Las que fallan por una causa que no se va a resolver sola (no existe, falta permiso) no se reintentan.
- El avance se ve en Bull Board (`/admin/queues`).

---

## Visitas

Devuelve el número de visitas de cada publicación según Mercado Libre.

### Qué mide

El total que informa Mercado Libre para la publicación. **No está confirmado que sea un acumulado histórico**: hay publicaciones cuyo valor baja de una consulta a otra, lo que se parece más a una ventana móvil ("últimos N días"). Hasta confirmarlo, no conviene restar dos consultas para calcular las visitas de un período.

### De a una por vez

Mercado Libre solo acepta **una publicación por consulta** de visitas. El pedido en lote (hasta 100 publicaciones) le ahorra viajes al sistema que pide, pero el servicio igual hace una consulta a Mercado Libre por cada publicación, tres en paralelo. Por eso recorrer todo el catálogo lleva el mismo tiempo que antes: lo limita la cantidad de consultas por minuto que admite Mercado Libre.

### Qué se devuelve y qué no

- Un **0 es siempre un 0 real**: Mercado Libre midió la publicación y no tuvo visitas.
- Las publicaciones que Mercado Libre no midió (no existen, no son de la cuenta, o se cortó por límite de consultas) **no aparecen** en la respuesta del lote. En la consulta individual, la respuesta es "no encontrado".
- Si Mercado Libre empieza a limitar a mitad de un lote, se devuelve lo medido hasta ahí y se dejan afuera las demás.

### Memoria de 30 minutos

Cada valor medido queda guardado 30 minutos: si se vuelve a pedir en ese plazo, se responde sin consultar a Mercado Libre. Las publicaciones que no se pudieron medir no se guardan, así que se pueden volver a pedir enseguida. Esa memoria se borra cada vez que se reinicia el servicio.

---

## Ventas

Lista las ventas (órdenes) de la cuenta principal, de a páginas. Por defecto trae solo las **pagadas**, 50 por página.

También se pueden pedir las ventas de una publicación puntual. Para eso se usa el buscador de ventas de Mercado Libre, que busca el número de publicación entre los datos de cada venta.

Cada venta trae su número, estado, fecha de creación y de cierre, importe total, moneda y los productos vendidos con cantidad y precio unitario.

---

## Categorías

Las categorías de Mercado Libre Argentina, en tres formas:

| Consulta | Qué devuelve |
|---|---|
| Categorías principales | El primer nivel del árbol, con número y nombre. |
| Una categoría | Su nombre, foto, cantidad de publicaciones, la ruta desde la raíz y sus subcategorías directas. |
| Una categoría, completa | La respuesta de Mercado Libre sin modificar. |

Son datos públicos, así que se pueden consultar sin la clave interna.

---

## Promociones y campañas

Todo lo de promociones usa siempre la cuenta del **motor de promociones**.

| Acción | Qué hace |
|---|---|
| Ver campañas | Las campañas en las que la cuenta puede participar. |
| Ver publicaciones de una campaña | Las publicaciones invitadas o participando en una campaña, de a páginas. |
| Sumar una publicación | La activa en una campaña con la oferta indicada. |
| Sacar una publicación | La saca de una campaña. |
| Eliminar una campaña | Elimina una campaña propia de la cuenta. |

Detalles que importan:

- Para ver las publicaciones de una campaña hace falta su tipo (por ejemplo `DEAL` o `SELLER_CAMPAIGN`). Si no se indica, el servicio lo busca en la lista de campañas de la cuenta; si no la encuentra, asume `DEAL`.
- Para sacar una publicación de una campaña hace falta la oferta (`offer_id`), salvo en campañas `DEAL`.
- Si Mercado Libre rechaza una acción, el servicio devuelve el motivo y el código que dio Mercado Libre.

---

## Quién puede consultar qué

Todo pedido tiene que llevar la clave interna del servicio, salvo los que devuelven datos públicos de Mercado Libre:

| Sin clave | Con clave |
|---|---|
| Categorías (las tres consultas) | Todo lo demás: publicaciones, precios, eliminación, visitas, ventas, comisiones, promociones y credenciales. |
| Descripción de una publicación | |

---

## Lo que el servicio no hace

- **No publica ni edita publicaciones**, salvo el precio. No cambia stock, títulos, fotos ni atributos.
- **No guarda datos**: todo se consulta a Mercado Libre en el momento. La única excepción es la memoria de 30 minutos de visitas.
- **No hace la autorización inicial** con Mercado Libre: solo renueva un permiso que ya existe.
- **No reintenta las consultas** cuando Mercado Libre limita por tasa: avisa al que pidió cuánto esperar. Las únicas excepciones son la eliminación en lote, el paso de eliminar cuando la publicación está en uso, y un segundo intento inmediato al listar las publicaciones de una campaña.
- **No trabaja con otros países**: categorías y comisiones son siempre de Mercado Libre Argentina.
