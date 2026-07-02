# 🥇 Gold Desk — Cockpit XAUUSD para o FTMO Challenge

Plataforma pessoal de trading focada em **passar as duas fases do FTMO** operando ouro (XAUUSD).
O app não é um dashboard de informação — é um cockpit organizado pela **rotina do dia de trade**,
com gestão de risco na frente de tudo (o que reprova traders não é análise, é violação de risco).

## As 3 telas da rotina

| Tela | O que faz |
| --- | --- |
| **Pré-Sessão** | Checklist macro obrigatório (DXY, US10Y, VIX, petróleo, geopolítica) → calcula o viés do dia; calendário econômico e notícias (TradingView); mini-charts dos drivers |
| **Sala de Trade** | Gráfico XAUUSD (TradingView) + **validador de trade**: calcula lote correto, R:R e dispara guard-rails (risco excessivo, notícia em <30 min, contra o viés, overtrading, revenge) + mapa de níveis de liquidez |
| **Pós-Sessão** | Diário de trades com estatística por setup e por sessão, export CSV/JSON e review do dia feito pelo agente |

**Header fixo**: perda diária restante (5%), drawdown total (10%), progresso da meta da fase e
quantos trades cabem no risco — sempre visível.

**Agente copiloto** (drawer lateral): Claude com prompt de *risk manager de mesa* — analisa prints
do gráfico (SMC/Wyckoff/supply & demand), busca notícias em tempo real (web search) e recebe em
toda mensagem o estado real da conta, o viés do dia e os níveis marcados. Ele valida disciplina;
não dá sinal.

## Rodando

```bash
pnpm install
pnpm dev
```

Para o agente: cole sua chave da API Anthropic em **Configurações** (fica só no `localStorage` do
seu navegador). Todos os dados (conta, trades, níveis, checklist) também ficam apenas no navegador.

## Stack

React 19 · Vite · TypeScript · Tailwind 4 · shadcn/ui · widgets TradingView (gratuitos) ·
`@anthropic-ai/sdk` (browser-side, modelo `claude-sonnet-5` com vision + web search)

## Deploy

Push na `main` → GitHub Actions → GitHub Pages (`vite.config.ts` usa base `/cvxox2/`).
