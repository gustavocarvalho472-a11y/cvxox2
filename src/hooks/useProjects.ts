import { useState, useCallback } from 'react'
import type { Persona, SegmentId } from '../data/personas'
import type { InsightReport, Message } from './useChat'

export interface SavedProject {
  id: string
  personaId: string
  personaName: string
  personaRole: string
  personaPhoto: string
  personaInitials: string
  segment: SegmentId
  productFocus?: string
  messageCount: number
  insights: InsightReport
  createdAt: string
}

const KEY = 'cxvox_projects'

function load(): SavedProject[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedProject[]) : []
  } catch {
    return []
  }
}

export function useProjects() {
  const [projects, setProjects] = useState<SavedProject[]>(load)

  const saveProject = useCallback((
    persona: Persona,
    messages: Message[],
    insights: InsightReport,
    productFocus?: string,
  ): string => {
    const project: SavedProject = {
      id: `proj_${Date.now()}`,
      personaId: persona.id,
      personaName: persona.name,
      personaRole: persona.role,
      personaPhoto: persona.photo,
      personaInitials: persona.initials,
      segment: persona.segment,
      productFocus,
      messageCount: messages.length,
      insights,
      createdAt: new Date().toISOString(),
    }
    setProjects(prev => {
      const updated = [project, ...prev]
      localStorage.setItem(KEY, JSON.stringify(updated))
      return updated
    })
    return project.id
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id)
      localStorage.setItem(KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return { projects, saveProject, deleteProject }
}
