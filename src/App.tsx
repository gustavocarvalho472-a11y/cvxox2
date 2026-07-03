import { useCallback, useState } from 'react'
import { CalendarCheck, CandlestickChart, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppState } from './hooks/useAppState'
import { useAgent } from './hooks/useAgent'
import { buildContextBlock } from './lib/agentPrompt'
import { AccountBar } from './components/AccountBar'
import { SettingsDialog } from './components/SettingsDialog'
import { AgentDrawer } from './components/AgentDrawer'
import { PreSessao } from './pages/PreSessao'
import { SalaDeTrade } from './pages/SalaDeTrade'
import { PosSessao } from './pages/PosSessao'

type Tab = 'pre' | 'sala' | 'pos'

const TABS: { id: Tab; label: string; icon: typeof CalendarCheck }[] = [
  { id: 'pre', label: 'Pré-Sessão', icon: CalendarCheck },
  { id: 'sala', label: 'Sala de Trade', icon: CandlestickChart },
  { id: 'pos', label: 'Pós-Sessão', icon: NotebookPen },
]

export default function App() {
  const app = useAppState()
  const [tab, setTab] = useState<Tab>('pre')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const { account, state, checklist, biasInfo, levels, trades, apiKey, gold } = app

  const buildContext = useCallback(
    () =>
      buildContextBlock({
        account,
        state,
        checklist,
        bias: app.effectiveBias,
        biasFilled: biasInfo.filled,
        levels,
        trades,
        goldPrice: gold,
        econEvents: app.calendar.next24h,
        correlation: app.correlation,
        autoBias: app.autoBiasFresh ? app.autoBias : null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, state, checklist, biasInfo, levels, trades, gold, app.calendar.next24h, app.correlation, app.autoBias, app.autoBiasFresh, app.effectiveBias],
  )

  const agent = useAgent(apiKey, buildContext)

  const askAgent = useCallback((prompt: string) => {
    setDraft(prompt)
    setDrawerOpen(true)
  }, [])

  // Envio direto (briefing do dia): abre o drawer e já dispara a mensagem
  const sendAgent = useCallback(
    (prompt: string) => {
      setDrawerOpen(true)
      void agent.sendMessage(prompt)
    },
    [agent],
  )

  return (
    <div className="min-h-dvh text-zinc-100">
      <AccountBar
        account={account}
        state={state}
        gold={gold}
        autoBias={app.autoBiasFresh ? app.autoBias : null}
        onBiasClick={() => setTab('pre')}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAgent={() => setDrawerOpen(o => !o)}
      />

      <nav className="sticky top-2 z-30 px-3 py-2">
        <div className="mx-auto max-w-7xl">
          <div className="glass-card flex w-full gap-1 !rounded-full p-1 sm:w-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium transition sm:flex-none sm:gap-2 sm:px-4',
                  tab === id
                    ? 'bg-white/15 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate text-xs sm:text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className={cn('pb-10 transition-[padding]', drawerOpen && 'lg:pr-[28rem]')}>
        {tab === 'pre' && <PreSessao app={app} agentReady={agent.hasKey} onSendAgent={sendAgent} />}
        {tab === 'sala' && (
          <SalaDeTrade app={app} onAskAgent={askAgent} onOpenSettings={() => setSettingsOpen(true)} />
        )}
        {tab === 'pos' && <PosSessao app={app} onAskAgent={askAgent} />}
      </main>

      <AgentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        agent={agent}
        draft={draft}
        setDraft={setDraft}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        account={account}
        setAccount={app.setAccount}
        apiKey={apiKey}
        setApiKey={app.setApiKey}
        tdKey={app.tdKey}
        setTdKey={app.setTdKey}
      />
    </div>
  )
}
