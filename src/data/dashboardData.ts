export type BusinessUnit = 'todos' | 'seguros' | 'consorcios' | 'cielo' | 'outros'
export type Period = 'month' | 'quarter' | 'semester' | 'year'

export interface Product { id: string; label: string }

export interface KPIData {
  nps: number; npsDelta: number; npsMeta: number
  clientsActive: number; clientsDelta: number
  churnPct: number; churnDelta: number; churnRevRisk: number
  revenue: number; revenueMeta: number; revenueDelta: number
  manifestacoes: number; manifestacoesDelta: number
  renewalRate: number; renewalDelta: number
}

export interface FunnelStage { label: string; value: number; delta: number; convRate?: number }
export interface LTVSegment { label: string; atual: number; meta: number }
export interface NPSJornada { label: string; nps: number; meta: number }
export interface SLAItem { label: string; avg: number; meta: number; unit: string }
export interface ChurnByTenure { label: string; churnPct: number; churnR: number }
export interface MonthlyRevenue { month: string; nova: number; expandida: number; recuperada: number }
export interface NPSRenewal { month: string; nps: number; renewal: number }
export interface SegmentRevenue { label: string; value: number; pct: number; delta: number }
export interface ChannelPenetration { label: string; pct: number; clients: number; delta: number }

export interface DashboardData {
  kpi: KPIData
  funnelStages: FunnelStage[]
  ltvSegmentos: LTVSegment[]
  npsJornada: NPSJornada[]
  sla: SLAItem[]
  churnByTenure: ChurnByTenure[]
  monthlyRevenue: MonthlyRevenue[]
  npsRenewal: NPSRenewal[]
  segmentRevenue: SegmentRevenue[]
  channelPenetration: ChannelPenetration[]
}

export const businessLabels: Record<BusinessUnit, string> = {
  todos: 'Todos',
  seguros: 'Seguros',
  consorcios: 'Consórcios',
  cielo: 'Cielo',
  outros: 'Outros',
}

export const businessUnits: BusinessUnit[] = ['todos', 'seguros', 'consorcios', 'cielo', 'outros']

export const periodLabels: Record<Period, string> = {
  month: 'Mês atual',
  quarter: 'Trimestre',
  semester: 'Semestre',
  year: 'Ano',
}

export const periods: Period[] = ['month', 'quarter', 'semester', 'year']

export const productsByBusiness: Record<Exclude<BusinessUnit, 'todos'>, Product[]> = {
  seguros: [
    { id: 'todos', label: 'Todos' },
    { id: 'vida-pj', label: 'Vida PJ' },
    { id: 'auto-frota', label: 'Auto Frota' },
    { id: 'residencial-pj', label: 'Residencial PJ' },
    { id: 'empresarial', label: 'Empresarial' },
    { id: 'resp-civil', label: 'Resp. Civil' },
  ],
  consorcios: [
    { id: 'todos', label: 'Todos' },
    { id: 'imovel-pj', label: 'Imóvel PJ' },
    { id: 'veiculo-frota', label: 'Veículo Frota' },
    { id: 'maquinas-equip', label: 'Máquinas/Equip.' },
    { id: 'outros-pj', label: 'Outros PJ' },
  ],
  cielo: [
    { id: 'todos', label: 'Todos' },
    { id: 'maquininha-pj', label: 'Maquininha PJ' },
    { id: 'gateway', label: 'Gateway' },
    { id: 'link-pagamento', label: 'Link de Pagamento' },
  ],
  outros: [
    { id: 'todos', label: 'Todos' },
    { id: 'produto-a', label: 'Produto A' },
    { id: 'produto-b', label: 'Produto B' },
  ],
}

const MONTHS = ['Mar/24', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan/25', 'Fev']

const periodMultiplier: Record<Period, number> = { month: 1, quarter: 3, semester: 6, year: 12 }

// ── BASE DATA PER BUSINESS ─────────────────────────────────────────────────

const baseDataMap: Record<BusinessUnit, DashboardData> = {
  todos: {
    kpi: {
      nps: 62, npsDelta: 3, npsMeta: 70,
      clientsActive: 18640, clientsDelta: 4.2,
      churnPct: 3.8, churnDelta: -0.4, churnRevRisk: 159200,
      revenue: 4200000, revenueMeta: 4500000, revenueDelta: 6.8,
      manifestacoes: 1247, manifestacoesDelta: -8.4,
      renewalRate: 78, renewalDelta: 1.2,
    },
    funnelStages: [
      { label: 'Qt de simulação', value: 8400, delta: 12.5 },
      { label: 'Propostas enviadas', value: 3200, delta: 8.2, convRate: 38 },
      { label: 'Contratos novos', value: 1840, delta: 5.4, convRate: 58 },
      { label: 'Renovações / Perm.', value: 1380, delta: 3.1, convRate: 75 },
      { label: 'Receita total gerada', value: 42000000, delta: 9.3 },
    ],
    ltvSegmentos: [
      { label: 'MEI', atual: 28, meta: 35 },
      { label: 'Negócios', atual: 84, meta: 95 },
      { label: 'Empresas', atual: 218, meta: 250 },
    ],
    npsJornada: [
      { label: 'Prospecção', nps: 74, meta: 70 },
      { label: 'Onboarding', nps: 68, meta: 72 },
      { label: 'Uso regular', nps: 62, meta: 70 },
      { label: 'Renovação', nps: 55, meta: 70 },
      { label: 'Pós-suporte', nps: 42, meta: 65 },
    ],
    sla: [
      { label: 'Abertura de conta', avg: 2.4, meta: 2.0, unit: 'dias' },
      { label: '1ª resposta suporte', avg: 4.2, meta: 2.0, unit: 'h' },
      { label: 'Resolução sinistro', avg: 38, meta: 28, unit: 'h' },
      { label: 'Análise de crédito', avg: 18, meta: 12, unit: 'h' },
      { label: 'Atualização cadastral', avg: 1.8, meta: 1.0, unit: 'dias' },
    ],
    churnByTenure: [
      { label: '0–6 meses', churnPct: 8.4, churnR: 42000 },
      { label: '7–12 meses', churnPct: 5.2, churnR: 31000 },
      { label: '1–2 anos', churnPct: 3.8, churnR: 28000 },
      { label: '2–4 anos', churnPct: 2.1, churnR: 18000 },
      { label: '4+ anos', churnPct: 1.2, churnR: 12000 },
    ],
    monthlyRevenue: MONTHS.map((m, i) => ({
      month: m,
      nova: Math.round(820000 + i * 18000 + Math.sin(i) * 40000),
      expandida: Math.round(2100000 + i * 22000 + Math.cos(i * 0.8) * 55000),
      recuperada: Math.round(380000 + i * 8000 + Math.sin(i * 1.5) * 20000),
    })),
    npsRenewal: MONTHS.map((m, i) => ({
      month: m,
      nps: Math.round(58 + i * 0.5 + Math.sin(i * 0.7) * 2),
      renewal: Math.round(73 + i * 0.4 + Math.cos(i * 0.5) * 1.5),
    })),
    segmentRevenue: [
      { label: 'MEI',      value: 840000,  pct: 20, delta: 8.2 },
      { label: 'Negócios', value: 2100000, pct: 50, delta: 7.1 },
      { label: 'Empresas', value: 1260000, pct: 30, delta: 5.4 },
    ],
    channelPenetration: [
      { label: 'PDPJ',        pct: 68, clients: 12675, delta: 4.2 },
      { label: 'PGS',         pct: 45, clients: 8388,  delta: 2.8 },
      { label: 'Rede',        pct: 38, clients: 7083,  delta: -1.2 },
      { label: 'Consultores', pct: 22, clients: 4101,  delta: 8.4 },
    ],
  },

  seguros: {
    kpi: {
      nps: 66, npsDelta: 4, npsMeta: 72,
      clientsActive: 8200, clientsDelta: 3.1,
      churnPct: 1.8, churnDelta: -0.3, churnRevRisk: 58400,
      revenue: 1800000, revenueMeta: 2000000, revenueDelta: 5.2,
      manifestacoes: 420, manifestacoesDelta: -6.1,
      renewalRate: 82, renewalDelta: 0.8,
    },
    funnelStages: [
      { label: 'Qt de simulação', value: 3100, delta: 10.2 },
      { label: 'Propostas enviadas', value: 1240, delta: 7.8, convRate: 40 },
      { label: 'Contratos novos', value: 740, delta: 4.8, convRate: 60 },
      { label: 'Renovações / Perm.', value: 610, delta: 3.4, convRate: 82 },
      { label: 'Receita total gerada', value: 18000000, delta: 5.2 },
    ],
    ltvSegmentos: [
      { label: 'MEI', atual: 32, meta: 40 },
      { label: 'Negócios', atual: 96, meta: 110 },
      { label: 'Empresas', atual: 240, meta: 280 },
    ],
    npsJornada: [
      { label: 'Prospecção', nps: 76, meta: 72 },
      { label: 'Onboarding', nps: 70, meta: 74 },
      { label: 'Uso regular', nps: 65, meta: 72 },
      { label: 'Renovação', nps: 60, meta: 72 },
      { label: 'Pós-sinistro', nps: 48, meta: 65 },
    ],
    sla: [
      { label: 'Emissão de apólice', avg: 1.8, meta: 1.5, unit: 'dias' },
      { label: '1ª resposta suporte', avg: 3.6, meta: 2.0, unit: 'h' },
      { label: 'Resolução sinistro', avg: 32, meta: 24, unit: 'h' },
      { label: 'Análise de risco', avg: 14, meta: 10, unit: 'h' },
      { label: 'Renovação automática', avg: 0.8, meta: 0.5, unit: 'dias' },
    ],
    churnByTenure: [
      { label: '0–6 meses', churnPct: 5.2, churnR: 18000 },
      { label: '7–12 meses', churnPct: 3.1, churnR: 12000 },
      { label: '1–2 anos', churnPct: 1.8, churnR: 9000 },
      { label: '2–4 anos', churnPct: 0.9, churnR: 6000 },
      { label: '4+ anos', churnPct: 0.5, churnR: 4000 },
    ],
    monthlyRevenue: MONTHS.map((m, i) => ({
      month: m,
      nova: Math.round(340000 + i * 8000 + Math.sin(i) * 18000),
      expandida: Math.round(920000 + i * 10000 + Math.cos(i * 0.8) * 24000),
      recuperada: Math.round(160000 + i * 3500 + Math.sin(i * 1.5) * 8000),
    })),
    npsRenewal: MONTHS.map((m, i) => ({
      month: m,
      nps: Math.round(62 + i * 0.5 + Math.sin(i * 0.7) * 2),
      renewal: Math.round(79 + i * 0.3 + Math.cos(i * 0.5) * 1.2),
    })),
    segmentRevenue: [
      { label: 'MEI',      value: 360000, pct: 20, delta: 6.1 },
      { label: 'Negócios', value: 900000, pct: 50, delta: 5.8 },
      { label: 'Empresas', value: 540000, pct: 30, delta: 3.4 },
    ],
    channelPenetration: [
      { label: 'PDPJ',        pct: 72, clients: 5904, delta: 5.1 },
      { label: 'PGS',         pct: 48, clients: 3936, delta: 3.2 },
      { label: 'Rede',        pct: 35, clients: 2870, delta: -0.8 },
      { label: 'Consultores', pct: 28, clients: 2296, delta: 9.2 },
    ],
  },

  consorcios: {
    kpi: {
      nps: 56, npsDelta: 2, npsMeta: 65,
      clientsActive: 5890, clientsDelta: 2.8,
      churnPct: 3.6, churnDelta: -0.2, churnRevRisk: 42100,
      revenue: 1100000, revenueMeta: 1300000, revenueDelta: 4.1,
      manifestacoes: 380, manifestacoesDelta: -4.2,
      renewalRate: 66, renewalDelta: 0.9,
    },
    funnelStages: [
      { label: 'Qt de simulação', value: 2200, delta: 8.4 },
      { label: 'Propostas enviadas', value: 820, delta: 6.1, convRate: 37 },
      { label: 'Contratos novos', value: 460, delta: 4.2, convRate: 56 },
      { label: 'Renovações / Perm.', value: 300, delta: 2.8, convRate: 66 },
      { label: 'Receita total gerada', value: 11000000, delta: 4.1 },
    ],
    ltvSegmentos: [
      { label: 'MEI', atual: 22, meta: 30 },
      { label: 'Negócios', atual: 68, meta: 85 },
      { label: 'Empresas', atual: 186, meta: 220 },
    ],
    npsJornada: [
      { label: 'Prospecção', nps: 70, meta: 65 },
      { label: 'Contratação', nps: 62, meta: 67 },
      { label: 'Parcelas ativas', nps: 55, meta: 65 },
      { label: 'Contemplação', nps: 48, meta: 65 },
      { label: 'Pós-contemplação', nps: 38, meta: 60 },
    ],
    sla: [
      { label: 'Cadastro consórcio', avg: 3.2, meta: 2.5, unit: 'dias' },
      { label: '1ª resposta suporte', avg: 5.1, meta: 2.0, unit: 'h' },
      { label: 'Análise contemplação', avg: 48, meta: 36, unit: 'h' },
      { label: 'Transferência cota', avg: 22, meta: 16, unit: 'h' },
      { label: 'Cancelamento cota', avg: 2.4, meta: 1.5, unit: 'dias' },
    ],
    churnByTenure: [
      { label: '0–6 meses', churnPct: 9.8, churnR: 14000 },
      { label: '7–12 meses', churnPct: 6.4, churnR: 10000 },
      { label: '1–2 anos', churnPct: 4.2, churnR: 8000 },
      { label: '2–4 anos', churnPct: 2.8, churnR: 6000 },
      { label: '4+ anos', churnPct: 1.6, churnR: 4100 },
    ],
    monthlyRevenue: MONTHS.map((m, i) => ({
      month: m,
      nova: Math.round(210000 + i * 5000 + Math.sin(i) * 12000),
      expandida: Math.round(580000 + i * 6500 + Math.cos(i * 0.8) * 15000),
      recuperada: Math.round(110000 + i * 2500 + Math.sin(i * 1.5) * 6000),
    })),
    npsRenewal: MONTHS.map((m, i) => ({
      month: m,
      nps: Math.round(52 + i * 0.4 + Math.sin(i * 0.7) * 2),
      renewal: Math.round(63 + i * 0.35 + Math.cos(i * 0.5) * 1.2),
    })),
    segmentRevenue: [
      { label: 'MEI',      value: 220000, pct: 20, delta: 4.1 },
      { label: 'Negócios', value: 550000, pct: 50, delta: 3.8 },
      { label: 'Empresas', value: 330000, pct: 30, delta: 2.9 },
    ],
    channelPenetration: [
      { label: 'PDPJ',        pct: 58, clients: 3417, delta: 3.4 },
      { label: 'PGS',         pct: 42, clients: 2474, delta: 1.9 },
      { label: 'Rede',        pct: 45, clients: 2651, delta: 0.6 },
      { label: 'Consultores', pct: 32, clients: 1885, delta: 5.8 },
    ],
  },

  cielo: {
    kpi: {
      nps: 61, npsDelta: 3, npsMeta: 68,
      clientsActive: 16490, clientsDelta: 5.8,
      churnPct: 2.8, churnDelta: -0.5, churnRevRisk: 46200,
      revenue: 1100000, revenueMeta: 1200000, revenueDelta: 8.4,
      manifestacoes: 380, manifestacoesDelta: -10.2,
      renewalRate: 76, renewalDelta: 1.8,
    },
    funnelStages: [
      { label: 'Qt de simulação', value: 6400, delta: 14.8 },
      { label: 'Propostas enviadas', value: 2400, delta: 10.2, convRate: 38 },
      { label: 'Contratos novos', value: 1380, delta: 7.1, convRate: 58 },
      { label: 'Renovações / Perm.', value: 1050, delta: 4.4, convRate: 76 },
      { label: 'Receita total gerada', value: 11000000, delta: 8.4 },
    ],
    ltvSegmentos: [
      { label: 'MEI', atual: 18, meta: 24 },
      { label: 'Negócios', atual: 62, meta: 75 },
      { label: 'Empresas', atual: 148, meta: 180 },
    ],
    npsJornada: [
      { label: 'Prospecção', nps: 78, meta: 68 },
      { label: 'Ativação', nps: 72, meta: 70 },
      { label: 'Uso regular', nps: 65, meta: 68 },
      { label: 'Upgrade', nps: 60, meta: 68 },
      { label: 'Suporte', nps: 52, meta: 65 },
    ],
    sla: [
      { label: 'Ativação maquininha', avg: 1.4, meta: 1.0, unit: 'dias' },
      { label: '1ª resposta suporte', avg: 3.2, meta: 2.0, unit: 'h' },
      { label: 'Resolução técnica', avg: 14, meta: 8, unit: 'h' },
      { label: 'Antecipação recebíveis', avg: 6, meta: 4, unit: 'h' },
      { label: 'Troca de terminal', avg: 1.2, meta: 0.8, unit: 'dias' },
    ],
    churnByTenure: [
      { label: '0–6 meses', churnPct: 7.2, churnR: 14000 },
      { label: '7–12 meses', churnPct: 4.4, churnR: 10000 },
      { label: '1–2 anos', churnPct: 3.1, churnR: 9000 },
      { label: '2–4 anos', churnPct: 1.8, churnR: 7000 },
      { label: '4+ anos', churnPct: 0.9, churnR: 6200 },
    ],
    monthlyRevenue: MONTHS.map((m, i) => ({
      month: m,
      nova: Math.round(210000 + i * 6000 + Math.sin(i) * 14000),
      expandida: Math.round(580000 + i * 8000 + Math.cos(i * 0.8) * 20000),
      recuperada: Math.round(110000 + i * 3000 + Math.sin(i * 1.5) * 7000),
    })),
    npsRenewal: MONTHS.map((m, i) => ({
      month: m,
      nps: Math.round(57 + i * 0.5 + Math.sin(i * 0.7) * 2),
      renewal: Math.round(72 + i * 0.45 + Math.cos(i * 0.5) * 1.4),
    })),
    segmentRevenue: [
      { label: 'MEI',      value: 220000, pct: 20, delta: 8.4 },
      { label: 'Negócios', value: 550000, pct: 50, delta: 7.8 },
      { label: 'Empresas', value: 330000, pct: 30, delta: 6.1 },
    ],
    channelPenetration: [
      { label: 'PDPJ',        pct: 75, clients: 12368, delta: 6.2 },
      { label: 'PGS',         pct: 38, clients: 6266,  delta: 2.1 },
      { label: 'Rede',        pct: 42, clients: 6926,  delta: -2.4 },
      { label: 'Consultores', pct: 18, clients: 2968,  delta: 11.2 },
    ],
  },

  outros: {
    kpi: {
      nps: 58, npsDelta: 1, npsMeta: 65,
      clientsActive: 2100, clientsDelta: 1.8,
      churnPct: 4.2, churnDelta: 0.1, churnRevRisk: 12500,
      revenue: 200000, revenueMeta: 240000, revenueDelta: 3.2,
      manifestacoes: 67, manifestacoesDelta: -2.4,
      renewalRate: 71, renewalDelta: 0.5,
    },
    funnelStages: [
      { label: 'Qt de simulação', value: 820, delta: 5.2 },
      { label: 'Propostas enviadas', value: 310, delta: 3.8, convRate: 38 },
      { label: 'Contratos novos', value: 180, delta: 2.8, convRate: 58 },
      { label: 'Renovações / Perm.', value: 128, delta: 1.6, convRate: 71 },
      { label: 'Receita total gerada', value: 2000000, delta: 3.2 },
    ],
    ltvSegmentos: [
      { label: 'MEI', atual: 20, meta: 28 },
      { label: 'Negócios', atual: 58, meta: 72 },
      { label: 'Empresas', atual: 142, meta: 180 },
    ],
    npsJornada: [
      { label: 'Prospecção', nps: 68, meta: 65 },
      { label: 'Onboarding', nps: 62, meta: 67 },
      { label: 'Uso regular', nps: 58, meta: 65 },
      { label: 'Renovação', nps: 52, meta: 65 },
      { label: 'Pós-suporte', nps: 44, meta: 60 },
    ],
    sla: [
      { label: 'Cadastro', avg: 2.8, meta: 2.0, unit: 'dias' },
      { label: '1ª resposta suporte', avg: 4.8, meta: 2.0, unit: 'h' },
      { label: 'Resolução demanda', avg: 28, meta: 20, unit: 'h' },
      { label: 'Análise', avg: 16, meta: 10, unit: 'h' },
      { label: 'Atualização cadastral', avg: 2.2, meta: 1.5, unit: 'dias' },
    ],
    churnByTenure: [
      { label: '0–6 meses', churnPct: 10.2, churnR: 4200 },
      { label: '7–12 meses', churnPct: 7.1, churnR: 3100 },
      { label: '1–2 anos', churnPct: 4.8, churnR: 2400 },
      { label: '2–4 anos', churnPct: 2.6, churnR: 1600 },
      { label: '4+ anos', churnPct: 1.4, churnR: 1200 },
    ],
    monthlyRevenue: MONTHS.map((m, i) => ({
      month: m,
      nova: Math.round(38000 + i * 1200 + Math.sin(i) * 4000),
      expandida: Math.round(102000 + i * 1500 + Math.cos(i * 0.8) * 6000),
      recuperada: Math.round(22000 + i * 600 + Math.sin(i * 1.5) * 2000),
    })),
    npsRenewal: MONTHS.map((m, i) => ({
      month: m,
      nps: Math.round(54 + i * 0.4 + Math.sin(i * 0.7) * 2),
      renewal: Math.round(68 + i * 0.3 + Math.cos(i * 0.5) * 1.2),
    })),
    segmentRevenue: [
      { label: 'MEI',      value: 40000,  pct: 20, delta: 3.2 },
      { label: 'Negócios', value: 100000, pct: 50, delta: 2.8 },
      { label: 'Empresas', value: 60000,  pct: 30, delta: 1.9 },
    ],
    channelPenetration: [
      { label: 'PDPJ',        pct: 52, clients: 1092, delta: 2.8 },
      { label: 'PGS',         pct: 38, clients: 798,  delta: 1.4 },
      { label: 'Rede',        pct: 30, clients: 630,  delta: -0.6 },
      { label: 'Consultores', pct: 28, clients: 588,  delta: 6.2 },
    ],
  },
}

// ── PRODUCT-LEVEL KPI OVERRIDES ────────────────────────────────────────────

const productOverrides: Record<string, Partial<KPIData>> = {
  'vida-pj': { nps: 68, churnPct: 1.5, renewalRate: 85, clientsActive: 2840, revenue: 480000 },
  'auto-frota': { nps: 54, churnPct: 1.8, renewalRate: 78, clientsActive: 2200, revenue: 560000 },
  'residencial-pj': { nps: 61, churnPct: 1.2, renewalRate: 88, clientsActive: 1480, revenue: 210000 },
  'empresarial': { nps: 72, churnPct: 1.0, renewalRate: 91, clientsActive: 920, revenue: 480000 },
  'resp-civil': { nps: 58, churnPct: 1.6, renewalRate: 80, clientsActive: 760, revenue: 70000 },
  'imovel-pj': { nps: 62, churnPct: 2.8, renewalRate: 71, clientsActive: 1840, revenue: 520000 },
  'veiculo-frota': { nps: 48, churnPct: 4.8, renewalRate: 58, clientsActive: 2480, revenue: 340000 },
  'maquinas-equip': { nps: 55, churnPct: 3.8, renewalRate: 64, clientsActive: 1570, revenue: 240000 },
  'outros-pj': { nps: 51, churnPct: 5.2, renewalRate: 55, clientsActive: 860, revenue: 90000 },
  'maquininha-pj': { nps: 61, churnPct: 3.2, renewalRate: 76, clientsActive: 12400, revenue: 600000 },
  'gateway': { nps: 58, churnPct: 1.8, renewalRate: 84, clientsActive: 890, revenue: 320000 },
  'link-pagamento': { nps: 65, churnPct: 2.4, renewalRate: 72, clientsActive: 3200, revenue: 180000 },
}

// ── MAIN EXPORT FUNCTION ───────────────────────────────────────────────────

export function getDashboardData(business: BusinessUnit, product: string, period: Period): DashboardData {
  const base = baseDataMap[business]
  const mult = periodMultiplier[period]

  let kpi: KPIData = { ...base.kpi }

  // Apply product override
  if (product !== 'todos' && productOverrides[product]) {
    kpi = { ...kpi, ...productOverrides[product] }
  }

  // Scale period-sensitive fields
  kpi = {
    ...kpi,
    revenue: kpi.revenue * mult,
    revenueMeta: kpi.revenueMeta * mult,
    churnRevRisk: kpi.churnRevRisk * mult,
    manifestacoes: Math.round(kpi.manifestacoes * mult),
  }

  // Scale funnel volumes by period
  const funnelStages = base.funnelStages.map((s, i) => {
    // Last stage is revenue — scale it
    if (i === base.funnelStages.length - 1) {
      return { ...s, value: Math.round(s.value * mult) }
    }
    return s
  })

  return {
    ...base,
    kpi,
    funnelStages,
  }
}

// ── UTILITY FUNCTIONS ──────────────────────────────────────────────────────

export function getFilterLabel(business: BusinessUnit, product: string): string {
  if (business === 'todos') return 'Portfólio PJ'
  if (product === 'todos') return businessLabels[business]
  const products = productsByBusiness[business]
  const prod = products.find(p => p.id === product)
  return `${businessLabels[business]} · ${prod?.label ?? product}`
}

export function computeRevPreserved(kpi: KPIData, _period: Period): number {
  const annualRevenue = kpi.revenue * 12
  return Math.round(annualRevenue * 0.02)
}
