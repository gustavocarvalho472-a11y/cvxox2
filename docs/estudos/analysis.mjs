// Bateria de estudos E1–E5 sobre PAXG-USD (proxy XAUUSD) — 1 ano de 15m → 30m
import { readFileSync } from 'fs'

const raw = JSON.parse(readFileSync('all15m.json', 'utf8')) // [[t,l,h,o,c,v]] asc
// resample 30m
const byB = new Map()
for (const [t, l, h, o, c, v] of raw) {
  const b = Math.floor(t / 1800) * 1800
  const cur = byB.get(b)
  if (!cur) byB.set(b, { t: b, o, h, l, c, v })
  else { cur.h = Math.max(cur.h, h); cur.l = Math.min(cur.l, l); cur.c = c; cur.v += v }
}
const C = [...byB.values()].sort((a, b) => a.t - b.t)
const N = C.length
console.log(`buckets 30m: ${N}\n`)

const pct = (x, y) => (y > 0 ? ((100 * x) / y).toFixed(1) + '%' : '—')
const bps = x => (x * 1e4).toFixed(1)

// ── agressão: vol ≥ K × média dos 20 anteriores, direção definida ──
function aggression(K) {
  const ev = []
  let sum = 0
  for (let i = 0; i < N; i++) {
    if (i >= 20) {
      const avg = sum / 20
      if (avg > 0 && C[i].v / avg >= K && C[i].c !== C[i].o)
        ev.push({ i, side: C[i].c > C[i].o ? 'buy' : 'sell', ratio: C[i].v / avg })
      sum -= C[i - 20].v
    }
    sum += C[i].v
  }
  return ev
}
const aggSetByI = K => new Set(aggression(K).filter(e => e.side === 'buy').map(e => e.i))

// ══ E1: retorno após bolha, por localização no range de 24h ══
console.log('══ E1 — O que a bolha de agressão prevê? (retorno em bps)')
for (const K of [1.8, 3.0]) {
  const ev = aggression(K)
  const stats = {}
  const base = { n: 0, s4: 0, s8: 0, s16: 0 }
  for (let i = 48; i < N - 16; i++) {
    base.n++
    base.s4 += C[i + 4].c / C[i].c - 1
    base.s8 += C[i + 8].c / C[i].c - 1
    base.s16 += C[i + 16].c / C[i].c - 1
  }
  for (const e of ev) {
    const { i, side } = e
    if (i < 48 || i >= N - 16) continue
    let lo = Infinity, hi = -Infinity
    for (let j = i - 47; j <= i; j++) { lo = Math.min(lo, C[j].l); hi = Math.max(hi, C[j].h) }
    const pos = hi > lo ? (C[i].c - lo) / (hi - lo) : 0.5
    const loc = pos < 0.25 ? 'fundo' : pos > 0.75 ? 'topo' : 'meio'
    const key = `${side}@${loc}`
    stats[key] ??= { n: 0, s4: 0, s8: 0, s16: 0, pos8: 0 }
    const s = stats[key]
    s.n++
    s.s4 += C[i + 4].c / C[i].c - 1
    s.s8 += C[i + 8].c / C[i].c - 1
    s.s16 += C[i + 16].c / C[i].c - 1
    if (C[i + 8].c > C[i].c) s.pos8++
  }
  console.log(` K=${K}× (${ev.length} bolhas) | baseline: 2h ${bps(base.s4 / base.n)} · 4h ${bps(base.s8 / base.n)} · 8h ${bps(base.s16 / base.n)}`)
  for (const k of Object.keys(stats).sort()) {
    const s = stats[k]
    console.log(`   ${k.padEnd(11)} n=${String(s.n).padStart(4)} | 2h ${bps(s.s4 / s.n).padStart(6)} · 4h ${bps(s.s8 / s.n).padStart(6)} · 8h ${bps(s.s16 / s.n).padStart(6)} | %sobe4h ${pct(s.pos8, s.n)}`)
  }
}

// ── swings fractais (k=2) nos 30m ──
function swings() {
  const lows = [], highs = []
  for (let i = 2; i < N - 2; i++) {
    let isL = true, isH = true
    for (let j = 1; j <= 2; j++) {
      if (C[i].l > C[i - j].l || C[i].l > C[i + j].l) isL = false
      if (C[i].h < C[i - j].h || C[i].h < C[i + j].h) isH = false
    }
    if (isL) lows.push({ i, p: C[i].l })
    if (isH) highs.push({ i, p: C[i].h })
  }
  return { lows, highs }
}
const { lows, highs } = swings()
const buyAgg = aggSetByI(1.8)
const sellAggSet = new Set(aggression(1.8).filter(e => e.side === 'sell').map(e => e.i))
const anyAgg = new Set(aggression(1.8).map(e => e.i))
const nearAgg = (set, i, r = 2) => { for (let d = -r; d <= r; d++) if (set.has(i + d)) return true; return false }

// ══ E2: zona formada COM agressão segura mais no reteste? ══
console.log('\n══ E2 — Agressão valida a região? (reteste de fundos)')
{
  const res = { com: { hold: 0, n: 0 }, sem: { hold: 0, n: 0 } }
  for (const sw of lows) {
    const tol = sw.p * 0.0008
    // reteste: primeira volta à zona depois de sair ≥0.3%
    let away = false, touch = -1
    for (let j = sw.i + 3; j < Math.min(N - 16, sw.i + 300); j++) {
      if (!away && C[j].c > sw.p * 1.003) away = true
      else if (away && C[j].l <= sw.p + tol) { touch = j; break }
    }
    if (touch < 0) continue
    // segurou: nos 16 buckets seguintes sobe +0.2% antes de perder a zona por 2×tol
    let hold = null
    for (let k = touch; k < Math.min(N, touch + 16); k++) {
      if (C[k].l < sw.p - 2 * tol) { hold = false; break }
      if (C[k].c > sw.p * 1.002) { hold = true; break }
    }
    if (hold === null) continue
    const key = nearAgg(anyAgg, sw.i) ? 'com' : 'sem'
    res[key].n++
    if (hold) res[key].hold++
  }
  console.log(`   zona COM bolha na formação: segura ${pct(res.com.hold, res.com.n)} (n=${res.com.n})`)
  console.log(`   zona SEM bolha na formação: segura ${pct(res.sem.hold, res.sem.n)} (n=${res.sem.n})`)
}

// ══ E3: liquidez abaixo dos fundos — sweeps e o que acontece ══
console.log('\n══ E3 — Fundos são varridos? Pavio vs rompimento')
const sweeps = []
{
  let swept = 0, wick = 0, fast = 0, broke = 0, untouched = 0
  const ret = { pavio: { s: 0, n: 0, pos: 0 }, rapido: { s: 0, n: 0, pos: 0 }, rompeu: { s: 0, n: 0, pos: 0 } }
  for (const sw of lows) {
    const tol = sw.p * 0.0008
    let j = -1
    for (let k = sw.i + 3; k < Math.min(N - 24, sw.i + 96); k++)
      if (C[k].l < sw.p - tol) { j = k; break }
    if (j < 0) { untouched++; continue }
    swept++
    let type
    if (C[j].c > sw.p) { type = 'pavio'; wick++ }
    else {
      let rec = false
      for (let k = j + 1; k <= Math.min(N - 1, j + 8); k++) if (C[k].c > sw.p) { rec = true; break }
      if (rec) { type = 'rapido'; fast++ } else { type = 'rompeu'; broke++ }
    }
    const r = C[Math.min(N - 1, j + 16)].c / C[j].c - 1
    ret[type].s += r; ret[type].n++; if (r > 0) ret[type].pos++
    sweeps.push({ sw, j, type, depth: (sw.p - C[j].l) / sw.p })
  }
  const tot = swept + untouched
  console.log(`   fundos analisados: ${tot} | varridos em até 2 dias: ${pct(swept, tot)}`)
  console.log(`   do total de sweeps → pavio (fecha acima no candle): ${pct(wick, swept)} | recupera ≤4h: ${pct(fast, swept)} | rompe de vez: ${pct(broke, swept)}`)
  for (const t of ['pavio', 'rapido', 'rompeu'])
    console.log(`   pós-${t.padEnd(6)}: retorno 8h médio ${bps(ret[t].s / ret[t].n).padStart(6)} bps | %positivo ${pct(ret[t].pos, ret[t].n)} (n=${ret[t].n})`)
}

// ══ E4: o que torna o fundo varrido-e-revertido relevante? ══
console.log('\n══ E4 — Fatores de reversão nos sweeps por pavio/recuperação (race +0.30% × −0.30%)')
{
  const race = j => {
    const e = C[j].c
    for (let k = j + 1; k < Math.min(N, j + 64); k++) {
      const hitUp = C[k].h >= e * 1.003
      const hitDn = C[k].l <= e * 0.997
      if (hitUp && hitDn) return false // conservador
      if (hitUp) return true
      if (hitDn) return false
    }
    return false
  }
  const groups = {}
  const add = (g, win) => { groups[g] ??= { w: 0, n: 0 }; groups[g].n++; if (win) groups[g].w++ }
  for (const s of sweeps) {
    if (s.type === 'rompeu') continue
    const win = race(s.j)
    add('TODOS (base)', win)
    add(nearAgg(buyAgg, s.j, 1) ? 'com bolha compradora' : 'sem bolha compradora', win)
    add(s.depth < 0.0012 ? 'sweep raso (<0.12%)' : s.depth > 0.0025 ? 'sweep fundo (>0.25%)' : 'sweep médio', win)
    const dbl = lows.some(o => o.i < s.sw.i && s.sw.i - o.i <= 32 && Math.abs(o.p - s.sw.p) <= s.sw.p * 0.0008)
    add(dbl ? 'fundo duplo' : 'fundo simples', win)
    const hBrt = (new Date((C[s.j].t - 3 * 3600) * 1000)).getUTCHours()
    add(hBrt >= 4 && hBrt < 9 ? 'sessão Londres' : hBrt >= 9 && hBrt < 17 ? 'sessão NY' : 'sessão Ásia', win)
  }
  for (const g of Object.keys(groups)) console.log(`   ${g.padEnd(24)} ${pct(groups[g].w, groups[g].n)} (n=${groups[g].n})`)
}

// ══ E5: playbook — sweep + validação + stop na captura + alvo 3R ══
console.log('\n══ E5 — Playbook (long pós-sweep de fundo): 3R vs stop')
{
  const results = {}
  const add = (g, r) => { results[g] ??= { w: 0, l: 0, u: 0 }; results[g][r]++ }
  for (const s of sweeps) {
    if (s.type === 'rompeu') continue
    // validação: fechar acima da máxima das 3 anteriores, em até 12 buckets do sweep
    let v = -1
    for (let k = s.j + 1; k <= Math.min(N - 2, s.j + 12); k++) {
      const hh = Math.max(C[k - 1].h, C[k - 2].h, C[k - 3].h)
      if (C[k].c > hh) { v = k; break }
    }
    if (v < 0) continue
    const entry = C[v].c
    const stop = C[s.j].l
    const R = entry - stop
    if (R <= 0 || R / entry > 0.006) continue // risco >0.6% = estrutura larga demais, fora
    const tgt = entry + 3 * R
    let out = 'u'
    for (let k = v + 1; k < Math.min(N, v + 192); k++) {
      const dn = C[k].l <= stop
      const up = C[k].h >= tgt
      if (dn) { out = 'l'; break } // conservador: stop checa primeiro
      if (up) { out = 'w'; break }
    }
    add('GERAL', out)
    add(nearAgg(buyAgg, s.j, 1) ? 'com bolha' : 'sem bolha', out)
    const hBrt = (new Date((C[s.j].t - 3 * 3600) * 1000)).getUTCHours()
    add(hBrt >= 4 && hBrt < 9 ? 'Londres' : hBrt >= 9 && hBrt < 17 ? 'NY' : 'Ásia', out)
    add(s.type === 'pavio' ? 'sweep-pavio' : 'sweep-recupera', out)
  }
  for (const g of Object.keys(results)) {
    const { w, l, u } = results[g]
    const n = w + l
    const wr = n > 0 ? w / n : 0
    const exp = (wr * 3 - (1 - wr)).toFixed(2)
    console.log(`   ${g.padEnd(16)} win ${pct(w, n)} de n=${n} (indef=${u}) | expectativa ${exp}R/trade`)
  }
}
