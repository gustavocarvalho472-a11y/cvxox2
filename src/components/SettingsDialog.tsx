import { useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AccountConfig, Phase } from '../types/trading'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AccountConfig
  setAccount: (a: AccountConfig) => void
  apiKey: string
  setApiKey: (k: string) => void
  tdKey: string
  setTdKey: (k: string) => void
}

const inputCls =
  'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500'
const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400'

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok' }
  | { status: 'fail'; message: string }

export function SettingsDialog({
  open,
  onOpenChange,
  account,
  setAccount,
  apiKey,
  setApiKey,
  tdKey,
  setTdKey,
}: Props) {
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setTest({ status: 'fail', message: 'Cole a chave primeiro.' })
      return
    }
    setTest({ status: 'testing' })
    try {
      const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true })
      // models.retrieve valida a chave sem gastar tokens
      await client.models.retrieve('claude-sonnet-5')
      setTest({ status: 'ok' })
    } catch (err) {
      let message = 'Falha na conexão.'
      if (err instanceof Anthropic.AuthenticationError) message = 'Chave inválida ou revogada.'
      else if (err instanceof Anthropic.APIError) message = `Erro da API (${err.status}).`
      else if (err instanceof Error) message = err.message
      setTest({ status: 'fail', message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Parâmetros da conta FTMO e chave do agente. Tudo fica salvo apenas no seu navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tamanho da conta ($)</label>
              <input
                type="number"
                className={inputCls}
                value={account.size}
                onChange={e => setAccount({ ...account, size: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelCls}>Fase</label>
              <select
                className={inputCls}
                value={account.phase}
                onChange={e => setAccount({ ...account, phase: e.target.value as Phase })}
              >
                <option value="challenge">Fase 1 — Challenge (+10%)</option>
                <option value="verification">Fase 2 — Verification (+5%)</option>
                <option value="funded">Financiada</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Risco por trade (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className={inputCls}
                value={account.riskPerTradePct}
                onChange={e =>
                  setAccount({ ...account, riskPerTradePct: Number(e.target.value) || 0.5 })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Máx. trades/dia</label>
              <input
                type="number"
                min="1"
                className={inputCls}
                value={account.maxTradesPerDay}
                onChange={e =>
                  setAccount({ ...account, maxTradesPerDay: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Início da fase</label>
              <input
                type="date"
                className={inputCls}
                value={account.phaseStart}
                onChange={e => setAccount({ ...account, phaseStart: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Trades a partir desta data contam para o saldo e a meta da fase.
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Chave da API Anthropic (agente IA)</label>
            <div className="flex gap-2">
              <input
                type="password"
                className={inputCls}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value)
                  setTest({ status: 'idle' })
                }}
              />
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={test.status === 'testing'}
                className="shrink-0 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                {test.status === 'testing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Testar conexão'
                )}
              </Button>
            </div>
            {test.status === 'ok' && (
              <p className="mt-1 text-[11px] text-emerald-400">✅ Conectado — o agente está pronto.</p>
            )}
            {test.status === 'fail' && (
              <p className="mt-1 text-[11px] text-red-400">❌ {test.message}</p>
            )}
            <p className="mt-1 text-[11px] text-zinc-500">
              Necessária para o agente. Crie em console.anthropic.com → API Keys. A chave é usada
              direto do seu navegador e salva só aqui.
            </p>
          </div>

          <div>
            <label className={labelCls}>Chave Twelve Data (níveis automáticos)</label>
            <input
              type="password"
              className={inputCls}
              placeholder="chave gratuita do twelvedata.com"
              value={tdKey}
              onChange={e => setTdKey(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Opcional — habilita o botão "Puxar níveis automáticos" na Sala de Trade (PDH/PDL e
              máx/mín de Ásia/Londres/NY calculados dos candles). Grátis:{' '}
              <a
                href="https://twelvedata.com/pricing"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline"
              >
                twelvedata.com
              </a>{' '}
              → Get free API key → copie do dashboard (800 req/dia).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
