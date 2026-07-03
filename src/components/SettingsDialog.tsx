import { useRef, useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { Download, Loader2, Upload } from 'lucide-react'
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
  'w-full rounded-xl glass-input px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500'
const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400'

// Tudo que o app guarda no navegador — a ordem não importa
const BACKUP_KEYS = [
  'gd_account',
  'gd_apikey',
  'gd_tdkey',
  'gd_trades',
  'gd_levels',
  'gd_checklist',
  'gd_corr',
  'gd_autobias',
  'gd_chat',
]

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
  const [backupMsg, setBackupMsg] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const exportBackup = () => {
    const data: Record<string, string> = {}
    for (const key of BACKUP_KEYS) {
      const raw = localStorage.getItem(key)
      if (raw !== null) data[key] = raw
    }
    const payload = JSON.stringify({ app: 'golddesk', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `golddesk_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupMsg('Backup exportado — guarde o arquivo em local seguro (contém suas chaves).')
  }

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as {
        app?: string
        version?: number
        data?: Record<string, string>
      }
      if (parsed.app !== 'golddesk' || !parsed.data) {
        setBackupMsg('❌ Arquivo inválido — selecione um backup exportado pelo Gold Desk.')
        return
      }
      let restored = 0
      for (const key of BACKUP_KEYS) {
        if (typeof parsed.data[key] === 'string') {
          localStorage.setItem(key, parsed.data[key])
          restored++
        }
      }
      setBackupMsg(`✅ ${restored} itens restaurados. Recarregando…`)
      setTimeout(() => window.location.reload(), 800)
    } catch {
      setBackupMsg('❌ Não consegui ler o arquivo. Confira se é o JSON do backup.')
    }
  }

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
      <DialogContent className="glass-strong text-zinc-100 sm:max-w-md">
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
              Opcional — o viés automático e os níveis já funcionam sem chave (via PAXG/Coinbase e
              BCE). Com a chave, o app usa o XAU spot real, mais preciso. Grátis:{' '}
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

          <div className="rounded-lg border glass-card p-3">
            <div className={labelCls}>Backup dos seus dados</div>
            <p className="mb-2 text-[11px] text-zinc-500">
              Trades, níveis, configurações e chaves ficam só neste navegador. Exporte um backup
              antes de trocar de aparelho ou limpar o Safari — e importe no aparelho novo.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportBackup}
                className="flex-1 gap-1.5 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => importRef.current?.click()}
                className="flex-1 gap-1.5 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                <Upload className="h-3.5 w-3.5" /> Importar
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void importBackup(file)
                  e.target.value = ''
                }}
              />
            </div>
            {backupMsg && <p className="mt-2 text-[11px] text-zinc-400">{backupMsg}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
