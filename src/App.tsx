import { useState } from 'react'
import { SegmentSelect } from './pages/SegmentSelect'
import { PersonaSelect } from './pages/PersonaSelect'
import { Interview } from './pages/Interview'
import { ConfigPanel } from './pages/ConfigPanel'
import { Dashboard } from './pages/Dashboard'
import { ProjectList } from './pages/ProjectList'
import { useProjects } from './hooks/useProjects'
import type { SegmentId, Persona } from './data/personas'
import type { Message, InsightReport } from './hooks/useChat'

type AppView = 'segments' | 'personas' | 'interview' | 'config' | 'dashboard' | 'projects'

export default function App() {
  const [view, setView] = useState<AppView>('segments')
  const [selectedSegment, setSelectedSegment] = useState<SegmentId | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined)
  const { projects, saveProject, deleteProject } = useProjects()

  const handleReset = () => {
    setSelectedPersona(null)
    setSelectedSegment(null)
    setSelectedProduct(undefined)
    setView('segments')
  }

  const handleSaveProject = (messages: Message[], insights: InsightReport) => {
    if (!selectedPersona) return
    saveProject(selectedPersona, messages, insights, selectedProduct)
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
          onOpenProjects={() => setView('projects')}
          projectCount={projects.length}
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
          onSaveProject={handleSaveProject}
        />
      )}
      {view === 'config' && (
        <ConfigPanel onBack={() => setView('segments')} />
      )}
      {view === 'dashboard' && (
        <Dashboard onBack={() => setView('segments')} />
      )}
      {view === 'projects' && (
        <ProjectList
          projects={projects}
          onDelete={deleteProject}
          onBack={() => setView('segments')}
        />
      )}
    </div>
  )
}
