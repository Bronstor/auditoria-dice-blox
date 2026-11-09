# Informe completo: el `bias` de dice-blox.com

Revisión del 9 de noviembre de 2026. Todo sale de archivos que dice-blox.com entrega a cualquier visitante: sus páginas, sus archivos JavaScript y su API pública `/api/verify`. No se usó ninguna cuenta ni se entró a zonas privadas.

## Índice
1. [Lo que dice el sitio](#1-lo-que-dice-el-sitio)
2. [Lo que hace su código](#2-lo-que-hace-su-código)
3. [Las formas de cambiar una tirada](#3-las-formas-de-cambiar-una-tirada)
4. [La firma: por qué el `bias` no se puede esconder](#4-la-firma-por-qué-el-bias-no-se-puede-esconder)
5. [El cambio del 8 de noviembre](#5-el-cambio-del-8-de-noviembre)
6. [Los textos del panel que trae su página](#6-los-textos-del-panel-que-trae-su-página)
7. [Resultados en tiradas reales](#7-resultados-en-tiradas-reales)
8. [Prueba controlada](#8-prueba-controlada)
9. [Límites](#9-límites)
10. [Correcciones a la versión anterior de este informe](#10-correcciones-a-la-versión-anterior-de-este-informe)
11. [Cadena de custodia y cómo reproducirlo](#11-cadena-de-custodia-y-cómo-reproducirlo)

---

## 1. Lo que dice el sitio

Copiado de sus páginas el 9 de noviembre de 2026:

| Página | Texto |
|---|---|
| `/en` | «This website uses virtual dice created with an algorithm that assigns equal probabilities to every possible outcome.» |
| `/en` | «The dice are drawn on the server from a committed seed, so nobody — us included — can steer a roll.» |
| `/es/chances` | «Los dados se generan en el servidor a partir de una semilla comprometida, así que nadie —nosotros incluidos— puede dirigir una tirada.» |
| `/en` | «Reveal it afterwards and your browser re-derives every die from it. If a single roll had been steered, the hash would not match.» |

## 2. Lo que hace su código

El motor de dados es el módulo `24710` de `https://dice-blox.com/_next/static/chunks/36e1gniza2wdf.js` (9.020 bytes, SHA-256 `a9301fcf10cfc17498510c50f678caefd00fb510fbb8d55755c77c067c7b2f75`). El mismo módulo está repetido en `3ec9vgoic3dyn.js`, `0nzi1xlrt19d3.js` y `2dl7i911b11hk.js`. Los fragmentos de abajo están copiados **tal cual** de ese archivo.

**a) Primero saca los dados de la semilla y después, si hay `bias`, los cambia** (función `h`):

```js
async function h({serverSeed:e,clientSeed:t,nonce:a,count:n,faces:r},s){let o=i(e,t,a),c=[];for(let e=0;e<n;e++)c.push(await l(o,r)+1);let u=s?await f(o,c,r,s):c;return await o.return(void 0),u}
```

`c` son los dados limpios de la semilla. `s` es el `bias`. Si existe, el resultado es `f(o,c,r,s)`, es decir, los dados cambiados.

**b) Qué lee del `bias`** (inicio de la función `f`):

```js
let r=n.includeWhitelist&&n.includeWhitelist.length>0?n.includeWhitelist:n.whitelist??[],i="number"==typeof n.includePercentage?n.includePercentage:n.percentage??0,f=n.excludeWhitelist??(0===i?n.whitelist??[]:[])
```
```js
if(!n.patterns&&void 0===n.rollsSinceFourColors&&!n.hostEdge&&!n.streamer&&(0===i||0===r.length)&&(0===h||0===f.length))return t;
```

**c) Su verificador vuelve a aplicar el mismo `bias`** (función `d`, exportada como `verify`):

```js
let t=await h(e,e.bias),a=t.length===e.raw.length&&t.every((t,a)=>t===e.raw[a]);return{ok:a,reason:a?"verified":"dice do not match seeds",recomputed:t}
```

Por eso, al revelar la semilla, una tirada cambiada por el `bias` sale «verified»: el verificador recalcula **con** el `bias`, no contra la semilla sola.

**d) La firma de cada tirada incluye el `bias`** (`rollMessage`; abreviado en `{...}`, que es la función que ordena las claves):

```js
"rollMessage",0,e=>{let t=["v1",e.id,e.serverSeedId,e.clientSeed,e.nonce,e.type,e.count,e.faces,e.raw,function e(t){...}(e.bias??null),new Date(e.createdAt).getTime()];return e.labels&&t.push(e.labels),JSON.stringify(t)}
```

**e) Llave pública con la que se firman** (módulo `27748`):

```
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBgEMRAU8CHQQcZ9l/dk8Br3mVl5OZ9WzNJBcjWdJXE/YWzHG0svNXe9i70b6XM2gujmOc0xoK7yTqfjMA0qfeg==
```

**f) Una fórmula para calcular cuánto baja el acierto con `hostEdge`** (exportada como `hostEdgeHitRate`):

```js
function(e,t=4){return 100*(1-(5/6)**t)-(3===t?.163:.156)*("number"==typeof e&&Number.isFinite(e)?Math.min(90,Math.max(0,Math.round(e))):0)}
```

Con 4 dados, acertar un color con dados justos es 51,77 %. Con `hostEdge` = 90 la fórmula da 37,73 %.

## 3. Las formas de cambiar una tirada

Todas están dentro de la función `f` y las funciones que llama (`o`, `s`, `c`, `u`):

| Campo del `bias` | Qué hace |
|---|---|
| `includeWhitelist` + `includePercentage` (o `whitelist` + `percentage`) | Con ese %, pone un color de la lista en la tirada. Con `maxAppearances: 1` lo pone en 1 dado y quita sus repeticiones |
| `excludeWhitelist` + `excludePercentage` | Con ese %, cambia los dados de esos colores por otros. Al 100 % ese color no puede salir |
| `maxAppearances` | Cuántas veces puede aparecer el color forzado |
| `patterns` (`streakValues`, `streak`, `triple`, `pair`) | Rompe rachas, tríos o pares |
| `rollsSinceFourColors` | Si salen 4 colores distintos, deja máximo 3 (entre 60 % y 100 % de las veces) |
| `hostEdge` | Con ese %, un dado copia el color de otro, así hay menos colores en la mesa |
| `streamer` (`streakValues`, `streak`, `fourRun`, `four`, `pair`) | Castiga colores que salieron en las dos tiradas anteriores, empuja a «un par + dos sueltos», evita 4 colores distintos seguidos y nunca deja 4 iguales |

## 4. La firma: por qué el `bias` no se puede esconder

Cada tirada que da la API trae `sig`: una firma ECDSA P-256 del mensaje `rollMessage`, que incluye el `bias`. Solo su servidor tiene la llave privada, así que:

- **Nadie puede inventar una tirada ni cambiarle un dato:** la firma dejaría de cuadrar.
- **Si la API no muestra el `bias`, igual se puede saber cuál era:** se prueban los `bias` posibles hasta encontrar el único con el que la firma cuadra. Los que usan son pocos:
  - perfil streamer: `{four:90, pair:60, streak:80, fourRun:0–3, streakValues:[…]}`
  - color forzado: `{whitelist:[a], percentage:100, maxAppearances:1, excludeWhitelist:[], includeWhitelist:[a], excludePercentage:100, includePercentage:100}`
  - color bloqueado: `{whitelist:[], percentage:0, maxAppearances:1, excludeWhitelist:[a] o [a,b], includeWhitelist:[], excludePercentage:100, includePercentage:0}`

Ejemplo real visible en su API el 7 de noviembre (sala A):

```json
{"streamer":{"four":90,"pair":60,"streak":80,"fourRun":0,"streakValues":[]},"whitelist":[],"percentage":0,"maxAppearances":1,"excludeWhitelist":[5],"includeWhitelist":[],"excludePercentage":100,"includePercentage":0}
```

`excludeWhitelist:[5]` con `excludePercentage:100` = el Azul no puede salir.

Colores: 1 Rojo · 2 Naranja · 3 Amarillo · 4 Verde · 5 Azul · 6 Morado.

## 5. El cambio del 8 de noviembre

- **Hasta el 8 de noviembre a las 18:10 UTC por lo menos**, `/api/verify` mostraba el `bias` de cada tirada (59 tiradas guardadas así, salas A y B).
- **El 8 de noviembre entre las 18:10 y las 22:18 UTC** lo quitaron de la API. Ya no aparece ni en tiradas nuevas ni en las viejas.
- **El código de la página no cambió:** sigue firmando y verificando con `e.bias??null`.
- **Resultado:** su propio verificador comprueba la firma con `bias = null`, no cuadra, y marca todas las tiradas con bias como **«❌ seal INVALID / sello INVÁLIDO»**. Esa página dice: «una tirada alterada en cualquier punto entre el servidor y esta pantalla aparece como inválida».
- Con el `bias` recuperado, la firma cuadra en todas. No hay error de transmisión: falta un dato que esconden.

## 6. Los textos del panel que trae su página

Las páginas `/es`, `/es/chances`, `/es/verify` y otras cargan las traducciones de un panel de control. Algunas, copiadas tal cual:

- «Configuración de Probabilidades de Dados (Lista Blanca)»
- «Configura dos pilas independientes de probabilidades (0% a 100%): una para evitar dados (no salir) y otra para favorecer dados (salir).»
- «🛑 Stack 1: Probabilidad de NO SALIR (Evitar / Bloquear)»
- «100% - Bloqueo total: los dados marcados abajo NUNCA saldrán en tus tiradas.»
- Registro de acciones: «Activó lista blanca», «Quitó lista blanca», «Colores» (`set_color_restrictions`), «Ventaja» (`set_host_edge`), «Algoritmo» (`set_streamer_mode`)
- «Ventaja del anfitrión: En cada tirada, con esta probabilidad, un dado repite un color que ya está en la mesa.»
- «Algoritmo Streamer: … un color que salió en las dos tiradas anteriores sale menos; más tiradas con un par …»

Es decir: el sitio tiene funciones para que ciertas cuentas o un administrador decidan qué colores salen o no salen, y eso no aparece en las reglas que se muestran a los jugadores.

## 7. Resultados en tiradas reales

146 tiradas de 5 salas, guardadas del 7 al 9 de noviembre de 2026 (las más viejas son del 5). Las 146 están en [`datos/tiradas-firmadas.json`](./datos/tiradas-firmadas.json) con su firma original.

**Firmas:** 145 cuadran con el `bias` publicado o recuperado. 1 sola cuadra con `bias = null` (sin truco). 1 no se pudo recuperar (su `bias` no es ninguna de las formas de la sección 4, pero tampoco es `null`).

| Sala | Tiradas | Fechas (UTC) | Bias visible en su API | Lo que llevaban |
|---|---|---|---|---|
| A | 19 | 7 nov | 19 | 19 con color bloqueado: Azul ×2, Rojo ×8, Amarillo ×4, Azul ×4, Azul+Verde ×1 |
| B | 60 | 8 nov | 40 | 52 solo perfil streamer, 4 color forzado, 3 color bloqueado, 1 sin bias |
| C | 21 | 5 y 9 nov | 0 | 16 color bloqueado (Amarillo ×3, Azul ×8, Rojo ×1, Verde ×4), 4 solo perfil, 1 sin recuperar |
| D | 26 | 9 nov | 0 | 26 solo perfil streamer |
| P | 20 | 8–9 nov | 0 | 17 color forzado, 3 solo perfil (ver sección 8) |

**Totales:**

| Qué | Resultado | Con dados justos |
|---|---|---|
| Color forzado al 100 % | Salió en **21 de 21** | Que pase en todas: 9,9·10⁻⁷ |
| Color bloqueado al 100 % | No salió en **38 de 38** | Que pase en todas: 6,5·10⁻¹³ |
| Perfil streamer, 4 dados: colores castigados (`streakValues`) | Salieron **7 de 75** veces (9 %) | Se espera 51,8 %. Que salgan 7 o menos: 6,3·10⁻¹⁵ |
| Perfil streamer, 4 dados: «un par + dos sueltos» | **53 de 60** (88 %) | Se espera 55,6 %. Que salgan 53 o más: 4,6·10⁻⁸ |
| Perfil streamer, 4 dados: 4 colores distintos | **4 de 60** (7 %) | Se espera 27,8 %. Que salgan 4 o menos: 4,3·10⁻⁵ |

## 8. Prueba controlada

Sala P: una persona abrió una sala nueva en modo incógnito y tiró 20 veces el 8 de noviembre (hora UTC).

- Tiradas 0 y 1 (21:17:52 y 21:19:48): solo perfil streamer.
- **Desde la tirada 2 (21:20:56) hasta la 18 (21:21:56): 17 tiradas seguidas con un color forzado al 100 %.** El color forzado cambió 5 veces en un minuto: Amarillo, Rojo, Naranja, Azul, Rojo, Azul. **Salió en las 17.**
- Tirada 19 (01:41:53 del 9 nov): solo perfil.

## 9. Límites

- **Esto prueba que el `bias` estaba en cada tirada** (lo firmó su servidor). **No prueba quién lo activó**: puede ser un administrador o una cuenta con «lista blanca». Por eso no se nombra a ningún streamer ni persona.
- La búsqueda por firma solo prueba las formas de `bias` que vimos en su API. Si usan otra, sale «no recuperado» (pasó 1 vez).
- El perfil streamer está en casi todas las tiradas. Que «castigue» colores y empuje a pares es lo que dice su propio texto de «Algoritmo Streamer».
- Los textos de `hostEdge` y del «Algoritmo Streamer» vienen en las traducciones del panel (sección 6). No revisamos si se le muestran a cada jugador. En las reglas públicas que citamos (sección 1) no encontramos ninguna mención a forzar o bloquear colores.
- Los códigos de sala reales se guardaron aparte y no se publican.

## 10. Correcciones a la versión anterior de este informe

Una versión anterior (hecha con otra herramienta) tenía errores que aquí se corrigieron:

| Error | Corrección |
|---|---|
| Fragmentos presentados como «extracto literal» que **no existen** en su código: `"hash-mismatch"`, `"dice-mismatch"`, `.toLowerCase()`, `Math.min(20, Math.floor(e.count))`, `s = t ?? e.bias ?? null`, `e.timestamp`, y el «código original» de varios mecanismos | Se reemplazaron por fragmentos copiados del archivo real (sección 2). Los textos reales son `"verified"` y `"dice do not match seeds"`, y la hora se toma de `createdAt` |
| Una `ROLL_PUBKEY` distinta (`…ExcCb7M36277…`) | La real es la de la sección 2 e) |
| «Abre F12 → Network y mira el `bias` en `/api/verify`» | Desde el 8 de noviembre la API ya no lo muestra; hay que recuperarlo por firma (sección 4) |
| «El verificador muestra ✅ Matches» | Ahora muestra «❌ seal INVALID» (sección 5) |
| `hostEdge` descrito como oculto | Su página trae un texto que lo explica (sección 6); el punto fuerte no es ese, sino el forzar/bloquear colores, que no aparece en sus reglas |
| No incluía tiradas reales | Se agregaron 146 tiradas firmadas y las cuentas de la sección 7 |

## 11. Cadena de custodia y cómo reproducirlo

- [`SHA256SUMS.txt`](./SHA256SUMS.txt): hash de los 15 archivos JavaScript y las 8 páginas revisadas. Los hashes de los cuatro archivos con el motor coinciden con los de una revisión independiente anterior.
- No se publican copias de sus archivos: se pueden bajar de las URL listadas y comparar el hash.
- `node herramientas/verificar.mjs`: comprueba las 146 firmas con su llave pública.
- `herramientas/script-consola.js`: hace lo mismo para cualquier sala, desde la consola del navegador en su sitio.
