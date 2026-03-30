import { useState } from 'react'
import { SegmentSelect } from './pages/SegmentSelect'
import { PersonaSelect } from './pages/PersonaSelect'
import { Interview } from './pages/Interview'
import { ConfigPanel } from './pages/ConfigPanel'
import { Dashboard } from './pages/Dashboard'
import type { SegmentId, Persona } from './data/personas'

type AppView = 'segments' | 'personas' | 'interview' | 'config' | 'dashboard'

export default function App() {
  const [view, setView] = useState<AppView>('segments')
  const [selectedSegment, setSelectedSegment] = useState<SegmentId | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined)

  const handleReset = () => {
    setSelectedPersona(null)
    setSelectedSegment(null)
    setSelectedProduct(undefined)
    setView('segments')
  }

  return (
    <div className="min-h-screen bg-white">
      {view === 'segments' && (
        <SegmentSelect
          onSelect={segmentId => {
            setSelectedSegment(segmentId)
            setView('personas')
          }}
          onOpenConfig={() => setView('config')}
          onOpenDashboard={() => setView('dashboard')}
        />
      )}
      {view === 'personas' && selectedSegment && (
        <PersonaSelect
          segmentId={selectedSegment}
          onSelect={(persona, product) => {
            setSelectedPersona(persona)
            setSelectedProduct(product)
            setView('interview')
          }}
          onBack={() => setView('segments')}
        />
      )}
      {view === 'interview' && selectedPersona && (
        <Interview
          persona={selectedPersona}
          productFocus={selectedProduct}
          onBack={() => setView('personas')}
          onReset={handleReset}
        />
      )}
      {view === 'config' && (
        <ConfigPanel onBack={() => setView('segments')} />
      )}
      {view === 'dashboard' && (
        <Dashboard onBack={() => setView('segments')} />
      )}
    </div>
  )
}
