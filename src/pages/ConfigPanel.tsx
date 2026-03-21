import { useState } from 'react'
import { segments, personas as initialPersonas } from '../data/personas'
import type { SegmentId, Persona } from '../data/personas'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Save,
  Briefcase, TrendingUp, Building2, Edit3
} from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'

interface Props {
  onBack: () => void
}

// Products per segment
const segmentProducts: Record<SegmentId, string[]> = {
  mei: [
    'Conta PJ', 'PIX', 'Maquininha', 'Boleto', 'Cartão Débito PJ',
    'Cartão Crédito PJ', 'Antecipação de Recebíveis', 'Empréstimo PJ',
  ],
  negocios: [
    'Capital de Giro', 'Antecipação de Recebíveis', 'Seguro Empresarial',
    'Consórcio de Veículos', 'Consórcio de Imóvel', 'Folha de Pagamento',
    'Conta Salário', 'Crédito para Equipamentos', 'Seguro de Vida Coletivo',
  ],
  empresas: [
    'Câmbio', 'Carta de Crédito', 'Hedge Cambial', 'CCB', 'FINAME',
    'Consórcio Industrial', 'Previdência Privada', 'Planejamento Patrimonial',
    'Planejamento Sucessório', 'Conta Investimento PJ',
  ],
}

const segmentIcons: Record<SegmentId, React.ReactNode> = {
  mei:      <Briefcase className="w-4 h-4" />,
  negocios: <TrendingUp className="w-4 h-4" />,
  empresas: <Building2 className="w-4 h-4" />,
}

const emptyPersona = (segment: SegmentId): Omit<Persona, 'id'> => ({
  segment,
  name: '',
  initials: '',
  age: 35,
  role: '',
  company: '',
  sector: '',
  city: '',
  faturamento: '',
  photo: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 70)}.jpg`,
  tags: [],
  bio: '',
  produtos: '',
  motivacao: '',
  dores: [],
  tom: '',
  systemPrompt: '',
})

type PanelView = 'segment-list' | 'segment-detail' | 'persona-edit'

export function ConfigPanel({ onBack }: Props) {
  const [panelView, setPanelView] = useState<PanelView>('segment-list')
  const [activeSegment, setActiveSegment] = useState<SegmentId>('mei')
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [isNewPersona, setIsNewPersona] = useState(false)
  const [localPersonas, setLocalPersonas] = useState({ ...initialPersonas })
  const [savedMsg, setSavedMsg] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'prompt'>('info')

  const segmentPersonaList = segments[activeSegment].personas
    .map(id => localPersonas[id])
    .filter(Boolean)

  const handleSelectSegment = (id: SegmentId) => {
    setActiveSegment(id)
    setPanelView('segment-detail')
  }

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona({ ...persona })
    setIsNewPersona(false)
    setActiveTab('info')
    setPanelView('persona-edit')
  }

  const handleNewPersona = () => {
    const newId = `persona_${Date.now()}`
    setEditingPersona({ id: newId, ...emptyPersona(activeSegment) })
    setIsNewPersona(true)
    setActiveTab('info')
    setPanelView('persona-edit')
  }

  const handleSavePersona = () => {
    if (!editingPersona) return
    // Update initials automatically
    const initials = editingPersona.name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase()
    const updated = { ...editingPersona, initials }
    setLocalPersonas(prev => ({ ...prev, [updated.id]: updated }))
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
    setPanelView('segment-detail')
  }

  const handleDeletePersona = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta persona?')) return
    setLocalPersonas(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setPanelView('segment-detail')
  }

  const updateField = (field: keyof Persona, value: string | number | string[]) => {
    if (!editingPersona) return
    setEditingPersona(prev => prev ? { ...prev, [field]: value } : null)
  }

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f5] overflow-hidden">
      {/* Header */}
      <header className="bradesco-header px-6 py-0 flex-shrink-0">
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={panelView === 'segment-list' ? onBack : () => setPanelView(panelView === 'persona-edit' ? 'segment-detail' : 'segment-list')}
            className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {panelView === 'segment-list' ? 'Voltar' : panelView === 'segment-detail' ? 'Segmentos' : 'Personas'}
          </button>
          <div className="h-5 w-px bg-white/30" />
          <BradescoLogo height={15} color="white" />
          <div className="h-5 w-px bg-white/30" />
          <span className="text-white font-bold text-sm">CXVox</span>
          <span className="text-white/50 text-sm ml-1">/ Configurações</span>
          {savedMsg && (
            <span className="ml-3 text-xs text-white font-medium bg-white/20 px-2.5 py-1 rounded-full">
              ✓ Salvo
            </span>
          )}
          {panelView === 'persona-edit' && editingPersona && (
            <div className="ml-auto flex items-center gap-2">
              {!isNewPersona && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePersona(editingPersona.id)}
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSavePersona}
                className="bg-white text-[#cc092f] hover:bg-white/90 h-8 gap-1.5 font-semibold shadow-none"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* === SEGMENT LIST === */}
        {panelView === 'segment-list' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Configurar Segmentos</h2>
              <p className="text-zinc-500 text-sm mb-8">
                Gerencie personas, prompts e foco de produtos por segmento.
              </p>
              <div className="space-y-3">
                {Object.values(segments).map(segment => (
                  <button
                    key={segment.id}
                    onClick={() => handleSelectSegment(segment.id)}
                    className="w-full bg-white border border-[#e8e8e8] rounded-lg px-5 py-4 flex items-center gap-4 hover:border-[#cc092f]/30 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 group-hover:bg-[#CC092F]/10 flex items-center justify-center text-zinc-500 group-hover:text-[#CC092F] transition-colors">
                      {segmentIcons[segment.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-zinc-900">{segment.label}</span>
                        <Badge variant="outline" className="text-xs border-zinc-200 text-zinc-500">
                          {segment.sublabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400">{segment.personas.length} personas · {segmentProducts[segment.id].length} produtos configurados</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-[#CC092F] transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === SEGMENT DETAIL === */}
        {panelView === 'segment-detail' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: personas list */}
            <div className="w-72 flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col">
              <div className="p-5 border-b border-zinc-100">
                <div className="flex items-center gap-2 mb-1">
                  {segmentIcons[activeSegment]}
                  <h3 className="font-semibold text-zinc-900">{segments[activeSegment].label}</h3>
                </div>
                <p className="text-xs text-zinc-400">{segmentPersonaList.length} personas</p>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-1.5">
                  {segmentPersonaList.map(persona => (
                    <button
                      key={persona.id}
                      onClick={() => handleEditPersona(persona)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f5f5f5] transition-colors text-left group border border-transparent hover:border-[#e8e8e8]"
                    >
                      <img
                        src={persona.photo}
                        alt={persona.name}
                        className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 truncate">{persona.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{persona.role}</p>
                      </div>
                      <Edit3 className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleNewPersona}
                  className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-zinc-300 hover:border-[#CC092F]/40 hover:bg-red-50/30 transition-colors text-zinc-400 hover:text-[#CC092F] text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova persona
                </button>
              </ScrollArea>
            </div>

            {/* Right: products focus */}
            <div className="flex-1 p-8 overflow-y-auto">
              <h3 className="text-lg font-bold text-zinc-900 mb-1">Foco de Produtos</h3>
              <p className="text-sm text-zinc-500 mb-6">
                Selecione os produtos que as entrevistas deste segmento podem abordar. O pesquisador poderá escolher o foco antes de cada entrevista.
              </p>

              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  Produtos disponíveis — {segments[activeSegment].label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {segmentProducts[activeSegment].map(product => (
                    <span
                      key={product}
                      className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-sm text-zinc-600 hover:border-[#CC092F]/40 hover:bg-red-50/40 hover:text-[#CC092F] cursor-pointer transition-colors"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-700 font-medium mb-1">Como funciona</p>
                <p className="text-xs text-amber-600 leading-relaxed">
                  Quando um produto é selecionado antes da entrevista, ele é adicionado ao contexto do prompt da persona. Isso direciona a conversa para experiências e necessidades relacionadas àquele produto específico.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* === PERSONA EDIT === */}
        {panelView === 'persona-edit' && editingPersona && (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar with photo */}
            <div className="w-64 flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col">
              <div className="relative">
                <img
                  src={editingPersona.photo}
                  alt={editingPersona.name}
                  className="w-full h-48 object-cover object-top"
                />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white" />
              </div>
              <div className="px-5 pb-4">
                <p className="font-semibold text-zinc-900 text-sm">{editingPersona.name || 'Nova Persona'}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{editingPersona.role || 'Cargo'}</p>
              </div>
              <div className="px-5 pb-5 mt-auto">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  URL da Foto
                </label>
                <input
                  type="text"
                  value={editingPersona.photo}
                  onChange={e => updateField('photo', e.target.value)}
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#CC092F]/30"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Main edit area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-zinc-200 bg-white px-6 gap-1 flex-shrink-0">
                {(['info', 'prompt'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab
                        ? 'border-[#CC092F] text-[#CC092F]'
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {tab === 'info' ? 'Informações' : 'Prompt do Sistema'}
                  </button>
                ))}
              </div>

              <ScrollArea className="flex-1 p-6">
                {activeTab === 'info' && (
                  <div className="max-w-2xl space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nome completo">
                        <input value={editingPersona.name} onChange={e => updateField('name', e.target.value)} placeholder="Ex: Rafael Braga" />
                      </Field>
                      <Field label="Idade">
                        <input type="number" value={editingPersona.age} onChange={e => updateField('age', parseInt(e.target.value) || 0)} placeholder="34" />
                      </Field>
                      <Field label="Cargo / Papel">
                        <input value={editingPersona.role} onChange={e => updateField('role', e.target.value)} placeholder="Ex: CEO" />
                      </Field>
                      <Field label="Cidade">
                        <input value={editingPersona.city} onChange={e => updateField('city', e.target.value)} placeholder="Ex: São Paulo / SP" />
                      </Field>
                      <Field label="Empresa">
                        <input value={editingPersona.company} onChange={e => updateField('company', e.target.value)} placeholder="Ex: Costa Embalagens" />
                      </Field>
                      <Field label="Setor">
                        <input value={editingPersona.sector} onChange={e => updateField('sector', e.target.value)} placeholder="Ex: Indústria" />
                      </Field>
                      <Field label="Faturamento" className="col-span-2">
                        <input value={editingPersona.faturamento} onChange={e => updateField('faturamento', e.target.value)} placeholder="Ex: ~R$2M/ano" />
                      </Field>
                    </div>

                    <Field label="Bio">
                      <textarea
                        rows={3}
                        value={editingPersona.bio}
                        onChange={e => updateField('bio', e.target.value)}
                        placeholder="Descrição curta da persona..."
                      />
                    </Field>

                    <Field label="Motivação">
                      <textarea
                        rows={2}
                        value={editingPersona.motivacao}
                        onChange={e => updateField('motivacao', e.target.value)}
                        placeholder="O que move esta persona..."
                      />
                    </Field>

                    <Field label="Dores principais (uma por linha)">
                      <textarea
                        rows={4}
                        value={editingPersona.dores.join('\n')}
                        onChange={e => updateField('dores', e.target.value.split('\n').filter(Boolean))}
                        placeholder="Dor 1&#10;Dor 2&#10;Dor 3"
                      />
                    </Field>

                    <Field label="Tom de voz">
                      <input
                        value={editingPersona.tom}
                        onChange={e => updateField('tom', e.target.value)}
                        placeholder="Ex: Direto, informal, usa gírias..."
                      />
                    </Field>

                    <Field label="Tags (separadas por vírgula)">
                      <input
                        value={editingPersona.tags.join(', ')}
                        onChange={e => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                        placeholder="PIX, Maquininha, App-first..."
                      />
                    </Field>
                  </div>
                )}

                {activeTab === 'prompt' && (
                  <div className="max-w-2xl space-y-4">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-zinc-500 mb-1">Dica de prompt</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        O system prompt define como a persona se comporta na entrevista. Use instruções como NUNCA saia do personagem, fale sempre em 1ª pessoa, mencione detalhes específicos do negócio, reaja com emoção quando tocar em pontos sensíveis.
                      </p>
                    </div>
                    <Field label="System Prompt">
                      <textarea
                        rows={20}
                        value={editingPersona.systemPrompt}
                        onChange={e => updateField('systemPrompt', e.target.value)}
                        className="font-mono text-xs"
                        placeholder={`Você é [Nome], [idade] anos, [ocupação] em [cidade]...\n\nFale de forma DIRETA e...\n\nSuas principais dores:...\n\nNUNCA quebre o personagem.`}
                      />
                    </Field>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <div className="[&_input]:w-full [&_input]:bg-white [&_input]:border [&_input]:border-zinc-200 [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-zinc-800 [&_input]:placeholder:text-zinc-300 [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-[#CC092F]/20 [&_input]:focus:border-[#CC092F]/40 [&_textarea]:w-full [&_textarea]:bg-white [&_textarea]:border [&_textarea]:border-zinc-200 [&_textarea]:rounded-lg [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:text-zinc-800 [&_textarea]:placeholder:text-zinc-300 [&_textarea]:focus:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#CC092F]/20 [&_textarea]:focus:border-[#CC092F]/40 [&_textarea]:resize-none [&_textarea]:leading-relaxed">
        {children}
      </div>
    </div>
  )
}
