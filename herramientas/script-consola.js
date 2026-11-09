// Pegar en la consola (F12) estando en una página de verificación de dice-blox: https://dice-blox.com/es/verify/<ID>
// Toma el ID de la dirección. Saca el bias escondido de cada tirada probando cuál hace cuadrar la firma.
(async (ID = (location.pathname.match(/verify\/([A-Za-z0-9]{10})/) || [])[1] || prompt('ID de la sala')) => {
  const PUB = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBgEMRAU8CHQQcZ9l/dk8Br3mVl5OZ9WzNJBcjWdJXE/YWzHG0svNXe9i70b6XM2gujmOc0xoK7yTqfjMA0qfeg==';
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('spki', b64(PUB), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const norm = t => Array.isArray(t) ? t.map(norm) : t && typeof t === 'object' ? Object.fromEntries(Object.keys(t).sort().map(k => [k, norm(t[k])])) : t;
  const ok = (e, b) => { const m = ['v1', e.id, e.serverSeedId, e.clientSeed, e.nonce, e.type, e.count, e.faces, e.raw, norm(b ?? null), new Date(e.createdAt).getTime()]; if (e.labels) m.push(e.labels);
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64(e.sig), new TextEncoder().encode(JSON.stringify(m))); };
  const COL = ['', 'Rojo', 'Naranja', 'Amarillo', 'Verde', 'Azul', 'Morado'];
  const subs = [...Array(64)].map((_, m) => [1, 2, 3, 4, 5, 6].filter((_, i) => m >> i & 1));
  const rigs = [{}];
  for (let a = 1; a <= 6; a++) {
    rigs.push({ whitelist: [a], percentage: 100, maxAppearances: 1, excludeWhitelist: [], includeWhitelist: [a], excludePercentage: 100, includePercentage: 100 });
    for (let b = a; b <= 6; b++) rigs.push({ whitelist: [], percentage: 0, maxAppearances: 1, excludeWhitelist: a === b ? [a] : [a, b], includeWhitelist: [], excludePercentage: 100, includePercentage: 0 });
  }
  console.log('Revisando sala', ID, '… tarda unos segundos');
  const d = await (await fetch('/api/verify?code=' + ID)).json(), filas = [];
  if (!d.rolls) return console.log('Sin tiradas (o es tu propio ID):', d);
  for (const r of d.rolls.sort((a, b) => a.nonce - b.nonce)) {
    let fila = { Truco: '¿? no recuperado' };
    if (await ok(r, null)) fila = { Truco: 'sin bias' };
    else busca: for (let fr = 0; fr <= 3; fr++) for (const sv of subs) for (const rig of rigs) {
      const b = { streamer: { four: 90, pair: 60, streak: 80, fourRun: fr, streakValues: sv }, ...rig };
      if (await ok(r, b)) {
        fila = {
          Truco: rig.includeWhitelist?.length ? '❌ FUERZA ' + COL[rig.includeWhitelist[0]] : rig.excludeWhitelist?.length ? '❌ BLOQUEA ' + rig.excludeWhitelist.map(c => COL[c]).join('+') : '✅ solo perfil',
          includeWhitelist: (rig.includeWhitelist || []).join(','), includePercentage: rig.includePercentage ?? '',
          excludeWhitelist: (rig.excludeWhitelist || []).join(','), excludePercentage: rig.excludePercentage ?? '',
          castiga: sv.map(c => COL[c]).join('+'),
        };
        break busca;
      }
    }
    filas.push({ Tirada: r.nonce, Fecha: new Date(r.createdAt).toLocaleString(), Dados: r.raw.map(c => COL[c]).join('-'), ...fila, _raw: r.raw });
  }
  // Vista gráfica: cuadros de colores por tirada.
  const HEX = ['', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  const caja = c => `background:${HEX[c]};color:${c === 3 ? '#000' : '#fff'};border-radius:4px;padding:3px 8px;margin-right:4px;font-weight:bold`;
  const num = s => String(s || '').split(',').filter(Boolean).map(Number);
  console.log('%cSala ' + ID + ' · ' + filas.length + ' tiradas', 'font-size:16px;font-weight:bold');
  for (const f of filas) {
    let txt = `%c${f.Tirada}  ${f.Fecha}  `, st = ['color:#888'];
    for (const c of f._raw) { txt += '%c ' + COL[c][0] + ' '; st.push(caja(c)); }
    const trucado = f.Truco.startsWith('❌');
    txt += `%c  ${trucado ? f.Truco.split(' ').slice(0, 2).join(' ') : f.Truco}  `;
    st.push(trucado ? 'color:#e53935;font-weight:bold' : 'color:#43a047');
    for (const c of [...num(f.includeWhitelist), ...num(f.excludeWhitelist)]) {
      const pct = f.includeWhitelist ? f.includePercentage : f.excludePercentage;
      txt += `%c ${COL[c]} ${pct}% `; st.push(caja(c) + (f.excludeWhitelist ? ';text-decoration:line-through' : ''));
    }
    if (f.castiga) { txt += '%c  castiga '; st.push('color:#888'); for (const c of f.castiga.split('+').map(n => COL.indexOf(n))) { txt += '%c ' + COL[c][0] + ' '; st.push(caja(c) + ';opacity:.55'); } }
    console.log(txt, ...st);
  }
  console.table(filas.map(({ _raw, ...f }) => f));
})();
