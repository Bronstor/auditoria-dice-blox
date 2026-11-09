# Auditoría de dice-blox.com

**Fecha:** 9 de noviembre de 2026
**Qué se revisó:** el código que la página entrega a cualquier visitante, sus textos y 146 tiradas reales sacadas de su propia API pública.
**Qué no se hizo:** no se usó ninguna cuenta ni se entró a zonas privadas.

---

## Conclusión

**dice-blox.com promete que nadie puede dirigir una tirada. No es cierto.**

- Su código tiene una función que **cambia los dados después de tirarlos**: puede obligar a que salga un color o impedir que salga.
- Su servidor **firma cada tirada junto con ese cambio**. Gracias a esa firma se puede saber qué truco llevaba cada tirada, y nadie puede inventar esos datos.
- En 146 tiradas reales:
  - **cuando el truco obligaba un color, ese color salió 21 de 21 veces;**
  - **cuando el truco bloqueaba un color, ese color no salió ni una vez en 38 tiradas.**
- Desde el 8 de noviembre **esconden el truco**, y su propio verificador marca las tiradas como **«seal INVALID»**.

---

## 1. Lo que promete la página

Textos copiados de dice-blox.com:

> «The dice are drawn on the server from a committed seed, so **nobody — us included — can steer a roll**.»

> «Los dados se generan en el servidor a partir de una semilla comprometida, así que **nadie —nosotros incluidos— puede dirigir una tirada**.»

> «This website uses virtual dice created with an algorithm that assigns **equal probabilities** to every possible outcome.»

> «If a single roll had been steered, the hash would not match.»

## 2. Lo que encontramos

### 2.1 El código permite elegir qué colores salen

El motor de dados está en este archivo público:
`https://dice-blox.com/_next/static/chunks/36e1gniza2wdf.js`

Funciona en dos pasos:
1. Saca los dados de forma justa, a partir de una semilla.
2. **Si la tirada trae un objeto llamado `bias`, cambia esos dados.**

Esta es la línea que lo hace, copiada tal cual:

```js
let u=s?await f(o,c,r,s):c;
```

En palabras: «si hay `bias` (`s`), el resultado son los dados cambiados (`f(...)`); si no, los dados limpios (`c`)».

Lo que el `bias` puede hacer:

| Campo | Qué hace |
|---|---|
| `includeWhitelist` + `includePercentage` | Obliga a que salga un color. Al 100 %, sale siempre |
| `excludeWhitelist` + `excludePercentage` | Impide que salga un color. Al 100 %, no sale nunca |
| `hostEdge` | Hace que un dado copie el color de otro, así hay menos colores en la mesa |
| `streamer` | Castiga los colores que salieron en las dos tiradas anteriores, busca dejar «un par + dos sueltos» y evita que salgan 4 iguales |
| `patterns`, `rollsSinceFourColors` | Rompe rachas, pares o tríos y evita que salgan 4 colores distintos |

### 2.2 Cada tirada lleva el truco firmado

Cada tirada viene con una **firma digital** de su servidor, que incluye el `bias`. Sirve como un sello que solo ellos pueden poner:

- **Si alguien cambia un dado, un color o la hora, el sello deja de valer.** Por eso nadie puede inventar estas tiradas.
- **Aunque escondan el `bias`, se puede saber cuál era:** se prueban los `bias` posibles y solo uno hace que el sello valga.

La firma se comprueba con la llave pública que ellos mismos publican en su página (copiada en la sección 6).

### 2.3 Lo que pasó en 146 tiradas reales

Tiradas de 5 salas, tomadas del 5 al 9 de noviembre de 2026. Los códigos de sala se cambiaron por letras para no señalar a nadie.

| Sala | Tiradas | Qué truco llevaban |
|---|---|---|
| A | 19 | **19 con un color bloqueado** (Azul, Rojo, Amarillo, Azul+Verde) |
| B | 60 | 52 con perfil streamer, **4 con color obligado**, **3 con color bloqueado**, 1 sin truco |
| C | 21 | **16 con un color bloqueado** (Amarillo, Azul, Rojo, Verde), 4 con perfil streamer, 1 que no se pudo identificar |
| D | 26 | 26 con perfil streamer |
| P | 20 | **17 con color obligado**, 3 con perfil streamer (es nuestra prueba, sección 3) |

**De 146 tiradas, solo 1 salió sin ningún truco.**

| Qué se comprobó | Resultado | Con dados justos |
|---|---|---|
| Color obligado al 100 % | **Salió en 21 de 21** | Pasa 1 vez en un millón |
| Color bloqueado al 100 % | **No salió en 38 de 38** | Pasa 6 veces en 10 billones |
| Colores castigados por el perfil streamer (4 dados) | Salieron **7 de 75 veces (9 %)** | Debería ser cerca del 52 % |
| Tiradas de 4 dados con «un par + dos sueltos» | **53 de 60 (88 %)** | Debería ser cerca del 56 % |

### 2.4 Desde el 8 de noviembre esconden el truco

- Hasta el 8 de noviembre, su API mostraba el `bias` de cada tirada. Guardamos 59 tiradas así.
- Ese día, entre las 18:10 y las 22:18 (hora UTC), **lo quitaron de la API**. Pero lo siguen firmando.
- Su propia página de verificación comprueba el sello sin el `bias`, no le cuadra y **marca todas esas tiradas como «❌ seal INVALID»**.
- Esa misma página dice que una tirada alterada «aparece como inválida».

### 2.5 La página trae los textos del panel de trucos

Cualquiera puede verlos: entra a `view-source:https://dice-blox.com/es`, presiona `Ctrl + F` y busca **«Bloqueo total»**. Algunos de esos textos, copiados tal cual:

- «Configuración de Probabilidades de Dados (Lista Blanca)»
- «Configura dos pilas independientes de probabilidades (0% a 100%): una para evitar dados (no salir) y otra para favorecer dados (salir).»
- «🛑 Stack 1: Probabilidad de NO SALIR (Evitar / Bloquear)»
- «**100% - Bloqueo total: los dados marcados abajo NUNCA saldrán en tus tiradas.**»
- Registro de acciones: «Activó lista blanca», «Quitó lista blanca», «Colores», «Ventaja», «Algoritmo»

## 3. Prueba hecha por nosotros

El 8 de noviembre, una persona abrió una sala nueva en modo incógnito y tiró 20 veces (sala P):

- **Tiradas 1 y 2:** sin color obligado.
- **De la 3 a la 19:** 17 tiradas seguidas **con un color obligado al 100 %**. En un solo minuto el color obligado cambió 5 veces: Amarillo, Rojo, Naranja, Azul, Rojo y Azul. **El color obligado salió en las 17.**
- **Tirada 20:** sin color obligado.

## 4. Cómo comprobarlo tú

**En el navegador, con cualquier sala de dice-blox:**
1. Abre `https://dice-blox.com/es/verify/<ID de la sala>`.
2. Presiona `F12` y entra a **Console**. Si Chrome muestra un aviso, escribe `allow pasting` y presiona Enter.
3. Pega el contenido de [`herramientas/script-consola.js`](./herramientas/script-consola.js) y presiona Enter.
4. Verás cada tirada con sus colores y el truco que llevaba: **❌ FUERZA**, **❌ BLOQUEA** o **✅ solo perfil**.

El script solo lee datos públicos y comprueba los sellos con la llave pública de su página. No envía nada a ningún lado.

**En tu computador, con las 146 tiradas de esta auditoría** (necesitas Node.js 18 o más nuevo):

```bash
git clone https://github.com/Bronstor/auditoria-dice-blox.git
cd auditoria-dice-blox
node herramientas/verificar.mjs
```

## 5. Qué no prueba esta auditoría

- Prueba que el truco estaba en cada tirada, porque su servidor lo firmó. **No prueba quién lo activó**: puede ser un administrador o una cuenta con «lista blanca». Por eso no se nombra a ningún streamer ni persona.
- La búsqueda por sello solo prueba los trucos que ya vimos en su API. Si usan otro, la tirada sale «no identificada» (pasó 1 vez).
- La página puede cambiar en cualquier momento. Las fechas y los hashes de lo que revisamos están en [`SHA256SUMS.txt`](./SHA256SUMS.txt).

## 6. Detalles técnicos

Fragmentos copiados tal cual de `36e1gniza2wdf.js` (9.020 bytes, SHA-256 `a9301fcf10cfc17498510c50f678caefd00fb510fbb8d55755c77c067c7b2f75`). El mismo código está repetido en `3ec9vgoic3dyn.js`, `0nzi1xlrt19d3.js` y `2dl7i911b11hk.js`.

**Genera los dados y aplica el `bias`:**
```js
async function h({serverSeed:e,clientSeed:t,nonce:a,count:n,faces:r},s){let o=i(e,t,a),c=[];for(let e=0;e<n;e++)c.push(await l(o,r)+1);let u=s?await f(o,c,r,s):c;return await o.return(void 0),u}
```

**Lee el `bias`:**
```js
let r=n.includeWhitelist&&n.includeWhitelist.length>0?n.includeWhitelist:n.whitelist??[],i="number"==typeof n.includePercentage?n.includePercentage:n.percentage??0,f=n.excludeWhitelist??(0===i?n.whitelist??[]:[])
```

**El verificador vuelve a aplicar el mismo `bias`.** Por eso, mientras la API lo mostraba, una tirada con truco salía como «verified»:
```js
let t=await h(e,e.bias),a=t.length===e.raw.length&&t.every((t,a)=>t===e.raw[a]);return{ok:a,reason:a?"verified":"dice do not match seeds",recomputed:t}
```

**El sello de cada tirada incluye el `bias`** (`rollMessage`; la parte `{...}` es la función que ordena las claves y aquí se abrevió):
```js
let t=["v1",e.id,e.serverSeedId,e.clientSeed,e.nonce,e.type,e.count,e.faces,e.raw,function e(t){...}(e.bias??null),new Date(e.createdAt).getTime()];
```

**Llave pública con la que se comprueban los sellos** (`ROLL_PUBKEY`):
```
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBgEMRAU8CHQQcZ9l/dk8Br3mVl5OZ9WzNJBcjWdJXE/YWzHG0svNXe9i70b6XM2gujmOc0xoK7yTqfjMA0qfeg==
```

**Formas de `bias` encontradas** (colores: 1 Rojo, 2 Naranja, 3 Amarillo, 4 Verde, 5 Azul, 6 Morado):
- Color obligado: `{whitelist:[a], percentage:100, maxAppearances:1, excludeWhitelist:[], includeWhitelist:[a], excludePercentage:100, includePercentage:100}`
- Color bloqueado: `{whitelist:[], percentage:0, maxAppearances:1, excludeWhitelist:[a], includeWhitelist:[], excludePercentage:100, includePercentage:0}`
- Perfil streamer, que va casi siempre: `{four:90, pair:60, streak:80, fourRun:0–3, streakValues:[…]}`

Un ejemplo real que su API mostraba el 7 de noviembre (sala A). `excludeWhitelist:[5]` al 100 % significa que el Azul no puede salir:
```json
{"streamer":{"four":90,"pair":60,"streak":80,"fourRun":0,"streakValues":[]},"whitelist":[],"percentage":0,"maxAppearances":1,"excludeWhitelist":[5],"includeWhitelist":[],"excludePercentage":100,"includePercentage":0}
```

**Cómo se calcularon las probabilidades:**
- Color obligado: se multiplicó, tirada por tirada, la probabilidad de que ese color salga con dados justos.
- Color bloqueado: se multiplicó la probabilidad de que no salga.
- Perfil streamer: se usó una prueba binomial.

## 7. Archivos

| Archivo | Qué es |
|---|---|
| [`datos/tiradas-firmadas.json`](./datos/tiradas-firmadas.json) | Las 146 tiradas tal cual las dio su API, con su sello, y el `bias` de cada una |
| [`datos/estadisticas.json`](./datos/estadisticas.json) | Conteos por sala y totales |
| [`herramientas/verificar.mjs`](./herramientas/verificar.mjs) | Comprueba los 146 sellos con su llave pública |
| [`herramientas/script-consola.js`](./herramientas/script-consola.js) | Lo mismo, desde el navegador, para cualquier sala |
| [`SHA256SUMS.txt`](./SHA256SUMS.txt) | Hash de cada archivo de su página que se revisó |
