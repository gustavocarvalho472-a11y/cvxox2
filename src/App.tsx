import { useCallback, useState } from 'react'
import { CalendarCheck, CandlestickChart, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppState } from './hooks/useAppState'
import { useAgent } from './hooks/useAgent'
import { useGoldPrice } from './hooks/useGoldPrice'
import { buildContextBlock } from './lib/agentPrompt'
import { AccountBar } from './components/AccountBar'
import { SettingsDialog } from './components/SettingsDialog'
import { AgentDrawer } from './components/AgentDrawer'
import { TickerTape } from './components/tradingview/widgets'
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

  const { account, state, checklist, biasInfo, levels, trades, apiKey } = app
  const { gold } = useGoldPrice()

  const buildContext = useCallback(
    () =>
      buildContextBlock({
        account,
        state,
        checklist,
        bias: biasInfo.bias,
        biasFilled: biasInfo.filled,
        levels,
        trades,
        goldPrice: gold,
        econEvents: app.calendar.next24h,
      }),
    [account, state, checklist, biasInfo, levels, trades, gold, app.calendar.next24h],
  )

  const agent = useAgent(apiKey, buildContext)

  const askAgent = useCallback((prompt: string) => {
    setDraft(prompt)
    setDrawerOpen(true)
  }, [])

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <AccountBar
        account={account}
        state={state}
        gold={gold}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAgent={() => setDrawerOpen(o => !o)}
      />

      <div className="border-b border-zinc-800/60">
        <TickerTape />
      </div>

      <nav className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 px-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition',
                tab === id
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </nav>

      <main className={cn('pb-10 transition-[padding]', drawerOpen && 'lg:pr-[28rem]')}>
        {tab === 'pre' && <PreSessao app={app} onAskAgent={askAgent} />}
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
