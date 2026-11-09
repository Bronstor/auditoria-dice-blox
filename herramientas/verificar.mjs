// Verifica, con la llave pública de dice-blox, la firma de cada tirada de datos/tiradas-firmadas.json.
// Uso: node herramientas/verificar.mjs        (Node 18 o más nuevo; no instala nada)
//
// Para cada tirada comprueba:
//   1. que la firma NO cuadra con bias = null (es decir, el servidor firmó la tirada CON un bias);
//   2. que la firma SÍ cuadra con el bias publicado por su API (antes del 8 nov) o con el recuperado.
// Si alguien cambiara un solo dado, un color del bias o la hora, la firma dejaría de cuadrar.
import { readFileSync } from 'node:fs';
const { subtle } = globalThis.crypto;
// ROLL_PUBKEY: tal cual aparece en https://dice-blox.com/_next/static/chunks/36e1gniza2wdf.js (módulo 27748)
const PUB = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBgEMRAU8CHQQcZ9l/dk8Br3mVl5OZ9WzNJBcjWdJXE/YWzHG0svNXe9i70b6XM2gujmOc0xoK7yTqfjMA0qfeg==';
const b64 = s => Uint8Array.from(Buffer.from(s, 'base64'));
const key = await subtle.importKey('spki', b64(PUB), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
// Igual que su función rollMessage (módulo 24710).
const norm = t => Array.isArray(t) ? t.map(norm) : t && typeof t === 'object' ? Object.fromEntries(Object.keys(t).sort().filter(k => t[k] !== undefined).map(k => [k, norm(t[k])])) : t;
const rollMessage = (e, bias) => { const m = ['v1', e.id, e.serverSeedId, e.clientSeed, e.nonce, e.type, e.count, e.faces, e.raw, norm(bias ?? null), new Date(e.createdAt).getTime()]; if (e.labels) m.push(e.labels); return JSON.stringify(m); };
const ok = (e, bias) => subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64(e.sig), new TextEncoder().encode(rollMessage(e, bias)));

const COL = ['', 'Rojo', 'Naranja', 'Amarillo', 'Verde', 'Azul', 'Morado'];
const rolls = JSON.parse(readFileSync(new URL('../datos/tiradas-firmadas.json', import.meta.url), 'utf8'));
let firmaOk = 0, conNull = 0, sinRecuperar = 0;
let pForz = 1, nForz = 0, okForz = 0, pBloq = 1, nBloq = 0, okBloq = 0;
for (const r of rolls) {
  const bias = r.biasEnApi ? r.bias : r.biasRecuperado;
  if (await ok(r, null)) conNull++;
  if (bias === 'NO_RECUPERADO') { sinRecuperar++; continue; }
  if (!(await ok(r, bias))) { console.log('FIRMA NO CUADRA:', r.sala, r.nonce); continue; }
  firmaOk++;
  if (bias?.includeWhitelist?.length) { nForz++; const c = bias.includeWhitelist; if (r.raw.some(v => c.includes(v))) okForz++; pForz *= 1 - ((6 - c.length) / 6) ** r.count; }
  if (bias?.excludeWhitelist?.length) { nBloq++; const c = bias.excludeWhitelist; if (!r.raw.some(v => c.includes(v))) okBloq++; pBloq *= ((6 - c.length) / 6) ** r.count; }
}
console.log(`Tiradas: ${rolls.length}`);
console.log(`Firma válida con su bias: ${firmaOk} · válida con bias = null: ${conNull} · bias sin recuperar: ${sinRecuperar}`);
console.log(`Color forzado: salió en ${okForz} de ${nForz}. Con dados justos, que pase en todas: ${pForz.toExponential(1)}`);
console.log(`Color bloqueado: no salió en ${okBloq} de ${nBloq}. Con dados justos, que pase en todas: ${pBloq.toExponential(1)}`);
console.log('\nSala | nonce | fecha (UTC) | dados | truco');
for (const r of rolls) {
  const b = r.biasEnApi ? r.bias : r.biasRecuperado;
  const t = b === 'NO_RECUPERADO' ? '¿? no recuperado' : !b ? 'sin bias' : b.includeWhitelist?.length ? `FUERZA ${b.includeWhitelist.map(c => COL[c])} ${b.includePercentage}%` : b.excludeWhitelist?.length ? `BLOQUEA ${b.excludeWhitelist.map(c => COL[c]).join('+')} ${b.excludePercentage}%` : 'solo perfil streamer';
  console.log([r.sala, r.nonce, r.createdAt.slice(0, 19), r.raw.map(c => COL[c]).join('-'), t + (r.biasEnApi ? ' (visible en su API)' : ' (recuperado por firma)')].join(' | '));
}
