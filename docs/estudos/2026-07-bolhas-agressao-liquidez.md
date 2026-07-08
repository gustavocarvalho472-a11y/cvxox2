# Estudo: bolhas de agressão, liquidez sob fundos e o playbook em números

**Data:** 08/07/2026 · **Dados:** PAXG-USD (proxy XAUUSD, Coinbase), 15min → 30min,
04/07/2025 a 08/07/2026 (17.569 candles de 30m, 34.234 de 15m) · **Métodos:** ver `analysis.mjs`
(reproduzível; coleta paginada da API pública da Coinbase).

> Contexto do período: ano de tendência de ALTA do ouro (baseline de retorno positivo,
> +2,2 bps/8h). Os números são *priors* de um ano, um instrumento — mapa, não garantia.

---

## E1 — O que a bolha de agressão prevê? (3.121 bolhas ≥1,8×; 1.663 ≥3×)

Retorno médio em bps após a bolha, por localização no range de 24h:

| Padrão | n | 2h | 4h | 8h | % sobe em 4h |
|---|---|---|---|---|---|
| **VENDA agressiva no FUNDO** | 525 | **+4,6** | **+5,5** | +3,1 | **58,3%** |
| COMPRA agressiva no TOPO | 658 | +3,7 | +8,4 | +11,0 | 54,3% |
| COMPRA agressiva no FUNDO | 188 | −0,1 | −2,2 | +0,2 | **46,3%** |
| VENDA agressiva no TOPO | 289 | +1,8 | +5,9 | +12,3 | 53,6% |
| (baseline geral) | — | +0,6 | +1,1 | +2,2 | — |

**Aprendizados:**
1. **O padrão significativo é a EXAUSTÃO, não a confirmação**: venda agressiva batendo no
   fundo do range = capitulação sendo absorvida → o preço tende a SUBIR depois (58%).
2. **Bolha compradora no fundo NÃO é sinal de alta por si só** (46% — pior que moeda).
   Compra agressiva no fundo muitas vezes é faca sendo segurada, não reversão.
3. Compra agressiva no topo = continuação (rompimento com volume real).
4. Bolhas ≥3× não são melhores que ≥1,8× — tamanho da bolha não é mágico.

## E2 — Bolha na formação valida a região no reteste?

**Não.** Zonas de fundo formadas COM bolha seguram o reteste em 50,3% (n=1.085); sem bolha,
50,3% (n=979). Empate perfeito. A bolha diz algo sobre o AGORA (exaustão/rompimento), não
sobre a força futura da zona.

## E3 — Existe liquidez abaixo dos fundos? SIM — e o mercado vai buscar

De 2.648 fundos de 30m (fractais): **76,6% são varridos em até 2 dias.**

Do total de sweeps:
- 33,5% **pavio** — fecha de volta acima no MESMO candle de 30m
- 41,0% **recupera rápido** — fecha de volta em até 4h
- 25,5% **rompe de vez**

→ **74,5% dos sweeps voltam.** Varrer fundo e reverter é o caso BASE do mercado, não a exceção.
O conceito central do playbook (esperar a captura, não comprar em cima do fundo) está validado.

Retorno 8h depois do sweep:
- pós-recuperação ≤4h: **+20,9 bps, 70,1% positivo** ← o melhor sinal do estudo
- pós-pavio: +1,8 bps, 53,8%
- pós-rompimento: **−25,5 bps, só 31,9% positivo** ← fundo que não recupera em 4h = não pegue a faca

## E4 — O que torna um fundo varrido "relevante"? (race +0,30% × −0,30%)

| Fator | Taxa de reversão | n |
|---|---|---|
| Sessão de **Londres** | **66,1%** | 224 |
| Sweep **fundo** (>0,25% de profundidade) | 61,1% | 437 |
| Fundo duplo | 60,0% | 780 |
| Base (todos) | 59,7% | 1.512 |
| Fundo simples | 59,3% | 732 |
| SEM bolha compradora no sweep | 60,8% | 1.115 |
| COM bolha compradora no sweep | 56,4% | 397 |
| Sweep raso (<0,12%) | 55,6% | 468 |

**Aprendizados:** sweep profundo > raso (mais stops capturados = mais combustível);
Londres é a melhor janela de reversão; bolha compradora NO sweep não ajuda (piora um pouco —
consistente com E1).

## E5 — O playbook mecânico (sweep → validação → stop na captura → alvo 3R)

Long após sweep de fundo; validação = fechar acima da máxima das 3 barras; risco ≤0,6%.
Breakeven com alvo 3R = 25% de acerto.

| Filtro | Win | n | Expectativa |
|---|---|---|---|
| **Sweep-PAVIO** (fecha acima no mesmo candle) | **30,4%** | 263 | **+0,22R/trade** |
| NY | 27,8% | 248 | +0,11R |
| Sem bolha compradora | 27,9% | 595 | +0,12R |
| GERAL | 25,4% | 768 | +0,02R (neutro) |
| Sweep-recupera (demora) | 22,8% | 505 | −0,09R |
| Com bolha compradora | 16,8% | 173 | **−0,33R** |

**Aprendizados:** o playbook mecânico puro é neutro — o edge vem dos FILTROS: exigir o pavio
(rejeição no mesmo candle) muda a expectativa de 0 para +0,22R. Entrar depois de bolha
compradora no sweep é o pior filtro (−0,33R): quando a compra agressiva já apareceu, o pulo
já foi dado. A leitura discricionária (contexto macro + região certa) entra POR CIMA desses
números.

---

## Regras destiladas (o que o app e o agente passam a saber)

1. Fundos de 30m são varridos em 77% dos casos em ≤2 dias — espere a captura, não compre em cima do fundo.
2. Sweep que fecha de volta ≤4h: 70% segue positivo. Não recuperou em 4h: 68% continua caindo.
3. Pavio no MESMO candle é o melhor gatilho mecânico do playbook (+0,22R com 3R).
4. 🟡 Venda agressiva no fundo = capitulação → viés de reversão pra cima. Bolha azul no fundo NÃO confirma alta.
5. Sweep profundo (>0,25%) reverte melhor que raso. Londres é a melhor sessão de reversão.
6. Bolha na formação da zona não prevê se ela segura no reteste (50/50).

## Próximos estudos (para robustez)

- **E6** Validação out-of-sample: repetir em outro período/instrumento (futuros GC ou XAU spot via TD)
- **E7** Espelho completo para TOPOS (shorts) — este estudo focou fundos
- **E8** Grade fina de horários (killzones de 1h) e interação sessão × profundidade do sweep
- Reavaliar trimestralmente: regimes mudam (este foi um ano de alta)
