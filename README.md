# Auditoría de dice-blox.com: el «bias» que cambia las tiradas

**[English summary below](#english-summary)** · **[Informe completo](./INFORME_COMPLETO.md)** · **[Comprobarlo tú mismo](#cómo-comprobarlo-tú-mismo)**

dice-blox.com dice en su propia página:

> «The dice are drawn on the server from a committed seed, so **nobody — us included — can steer a roll**.»
> «If a single roll had been steered, the hash would not match.»
> «This website uses virtual dice created with an algorithm that assigns **equal probabilities** to every possible outcome.»

Lo que encontramos, usando solo su código público y las tiradas que su propia API entrega:

1. **Su código tiene un objeto `bias` que cambia los dados después de sacarlos de la semilla.** Puede forzar un color (`includeWhitelist`), bloquear colores (`excludeWhitelist`), aplicar una «ventaja del anfitrión» (`hostEdge`) y un «perfil streamer» (`streamer`). Está en `https://dice-blox.com/_next/static/chunks/36e1gniza2wdf.js`.
2. **Cada tirada va firmada por su servidor con ese `bias` adentro.** Con su llave pública cualquiera puede comprobar qué `bias` llevaba cada tirada. Nadie puede inventar una firma.
3. **En 146 tiradas reales de 5 salas** (del 5 al 9 de noviembre de 2026):
   - **21 tiradas con un color forzado al 100 %: el color salió en las 21.** Con dados justos, que pase eso: 1 en un millón (9,9·10⁻⁷).
   - **38 tiradas con un color bloqueado al 100 %: no salió en ninguna.** Con dados justos: 6,5·10⁻¹³.
   - **Solo 1 de 146 tiradas no llevaba bias.**
4. **El 8 de noviembre de 2026, por la tarde, dejaron de mostrar el `bias` en su API**, pero siguieron firmándolo. Desde entonces su propio verificador marca **«❌ seal INVALID»** en todas esas tiradas. Igual se puede recuperar comprobando la firma (lo hace `herramientas/verificar.mjs`).
5. **Sus páginas públicas traen los textos de un panel para manejar probabilidades:** «Configuración de Probabilidades de Dados (Lista Blanca)», «100% - Bloqueo total: los dados marcados abajo NUNCA saldrán en tus tiradas», «Activó lista blanca», «Ventaja», «Algoritmo».

> Esto no dice **quién** activa el `bias` en cada tirada, solo que estaba ahí. Ver [límites](./INFORME_COMPLETO.md#9-límites).

## Cómo comprobarlo tú mismo

**A. Con Node.js 18 o más nuevo** (no instala nada):

```bash
git clone https://github.com/Bronstor/auditoria-dice-blox.git
cd auditoria-dice-blox
node herramientas/verificar.mjs
```

Comprueba la firma de las 146 tiradas de `datos/tiradas-firmadas.json` con la llave pública de dice-blox y muestra el truco de cada una.

**B. En el navegador, con cualquier sala:**

1. Abre `https://dice-blox.com/es/verify/<ID de la sala>`.
2. F12 → Console. Si Chrome avisa, escribe `allow pasting` y Enter.
3. Pega `herramientas/script-consola.js`. Muestra cada tirada con sus colores y el `bias` que tenía.

**C. Ver el código:** abre `https://dice-blox.com/_next/static/chunks/36e1gniza2wdf.js` y busca `includeWhitelist`, `excludeWhitelist`, `hostEdge`, `streamer`, `e.bias`. El hash de nuestra copia está en [`SHA256SUMS.txt`](./SHA256SUMS.txt).

## Contenido

| Archivo | Qué es |
|---|---|
| [`INFORME_COMPLETO.md`](./INFORME_COMPLETO.md) | Informe con el código citado, el método y las tablas por sala |
| [`datos/tiradas-firmadas.json`](./datos/tiradas-firmadas.json) | Las 146 tiradas tal cual las dio su API (con firma), más el `bias` recuperado |
| [`datos/estadisticas.json`](./datos/estadisticas.json) | Conteos por sala y totales |
| [`herramientas/verificar.mjs`](./herramientas/verificar.mjs) | Verifica todas las firmas con su llave pública |
| [`herramientas/script-consola.js`](./herramientas/script-consola.js) | Igual, pero en la consola del navegador para cualquier sala |
| [`SHA256SUMS.txt`](./SHA256SUMS.txt) | Hash de cada archivo de su sitio que revisamos |

Los códigos de sala se cambiaron por letras (A, B, C, D, P) para no señalar a nadie. Las firmas no dependen del código de sala, así que se pueden comprobar igual.

---

## English summary

dice-blox.com claims that «nobody — us included — can steer a roll». Its own public JavaScript (`36e1gniza2wdf.js`) contains a `bias` object that changes the dice **after** they are drawn from the seed: forced colours (`includeWhitelist`), blocked colours (`excludeWhitelist`), `hostEdge` and a `streamer` profile. Every roll is signed (ECDSA P-256) **with that `bias` inside**, so with their public key anyone can prove which `bias` each roll carried.

In 146 real rolls from 5 rooms (5–9 Nov 2026): a forced colour came up in **21/21** rolls (fair odds ≈ 1e-6) and a blocked colour never came up in **38/38** rolls (fair odds ≈ 6.5e-13). Only 1 of 146 rolls had no bias. On 8 Nov 2026 they removed `bias` from their API but kept signing it, so their own verifier now shows «❌ seal INVALID». Run `node herramientas/verificar.mjs` to check every signature yourself. This shows the bias was there; it does not show who set it.
