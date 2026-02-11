import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_APP_DATA } from '../data/mockData'
import type {
  AppData,
  ApplicationStatus,
  AuthProvider,
  MediaType,
  Project,
  UserRole,
} from '../types/domain'
import { buildAiQualificationSummary, rankProjectsForAgent } from '../utils/scoring'

const STORAGE_KEY = 'sales-talent-platform:v1'

interface SignInPayload {
  fullName: string
  email: string
  role: UserRole
  provider: AuthProvider
}

interface CompanyInput {
  name: string
  industry: string
  size: string
  website: string
}

interface ProjectInput {
  companyId: string
  title: string
  industry: string
  targetGroup: string
  responsibilities: string[]
  compensation: string
  requirements: string[]
  startDate: string
  workload: string
}

interface AppContextValue {
  data: AppData
  isAuthenticated: boolean
  isAgent: boolean
  isAdmin: boolean
  rankedProjects: Array<{ project: Project; score: number }>
  signIn: (payload: SignInPayload) => void
  signOut: () => void
  updateAgentProfile: (next: Partial<AppData['agentProfile']>) => void
  addMediaAssets: (mediaType: MediaType, files: FileList | File[]) => void
  generateAiSummary: () => void
  applyToProject: (projectId: string) => void
  markProjectNotInterested: (projectId: string) => void
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => void
  updateSettings: (next: Partial<AppData['settings']>) => void
  createCompany: (input: CompanyInput) => void
  createProject: (input: ProjectInput) => void
  sendInvitation: (agentId: string, projectId: string) => void
}

const parseStoredData = (): AppData => {
  const rawValue = localStorage.getItem(STORAGE_KEY)
  if (!rawValue) return DEFAULT_APP_DATA

  try {
    return JSON.parse(rawValue) as AppData
  } catch {
    return DEFAULT_APP_DATA
  }
}

const toId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const AppContext = createContext<AppContextValue | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData>(() => parseStoredData())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const signIn = useCallback((payload: SignInPayload) => {
    setData((prev) => ({
      ...prev,
      authUser: {
        id: payload.role === 'admin' ? 'admin-1' : prev.agentProfile.id,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        provider: payload.provider,
      },
      agentProfile: {
        ...prev.agentProfile,
        fullName: payload.role === 'agent' ? payload.fullName : prev.agentProfile.fullName,
        email: payload.role === 'agent' ? payload.email : prev.agentProfile.email,
      },
    }))
  }, [])

  const signOut = useCallback(() => {
    setData((prev) => ({ ...prev, authUser: null }))
  }, [])

  const updateAgentProfile = useCallback((next: Partial<AppData['agentProfile']>) => {
    setData((prev) => ({
      ...prev,
      agentProfile: {
        ...prev.agentProfile,
        ...next,
      },
      agentDirectory: prev.agentDirectory.map((entry) =>
        entry.id === prev.agentProfile.id
          ? {
              ...entry,
              fullName: next.fullName ?? entry.fullName,
              industries: next.industries ?? entry.industries,
              languages: next.languages ?? entry.languages,
            }
          : entry,
      ),
    }))
  }, [])

  const addMediaAssets = useCallback((mediaType: MediaType, files: FileList | File[]) => {
    const normalized = Array.from(files).map((file) => ({
      id: toId('media'),
      mediaType,
      fileName: file.name,
      fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
      uploadedAt: new Date().toISOString(),
    }))

    setData((prev) => ({
      ...prev,
      mediaAssets: [...prev.mediaAssets, ...normalized],
    }))
  }, [])

  const generateAiSummary = useCallback(() => {
    setData((prev) => ({
      ...prev,
      aiSummary: buildAiQualificationSummary(prev.agentProfile, prev.mediaAssets),
    }))
  }, [])

  const applyToProject = useCallback((projectId: string) => {
    setData((prev) => {
      const existing = prev.applications.some(
        (application) =>
          application.projectId === projectId && application.agentId === prev.agentProfile.id,
      )
      if (existing) return prev

      return {
        ...prev,
        applications: [
          ...prev.applications,
          {
            id: toId('application'),
            projectId,
            agentId: prev.agentProfile.id,
            status: 'Applied',
            submittedAt: new Date().toISOString(),
          },
        ],
        invitations: prev.invitations.map((invitation) =>
          invitation.projectId === projectId && invitation.agentId === prev.agentProfile.id
            ? { ...invitation, status: 'accepted' }
            : invitation,
        ),
      }
    })
  }, [])

  const markProjectNotInterested = useCallback((projectId: string) => {
    setData((prev) => ({
      ...prev,
      notInterestedProjectIds: prev.notInterestedProjectIds.includes(projectId)
        ? prev.notInterestedProjectIds
        : [...prev.notInterestedProjectIds, projectId],
      invitations: prev.invitations.map((invitation) =>
        invitation.projectId === projectId && invitation.agentId === prev.agentProfile.id
          ? { ...invitation, status: 'declined' }
          : invitation,
      ),
    }))
  }, [])

  const updateApplicationStatus = useCallback(
    (applicationId: string, status: ApplicationStatus) => {
      setData((prev) => ({
        ...prev,
        applications: prev.applications.map((application) =>
          application.id === applicationId ? { ...application, status } : application,
        ),
      }))
    },
    [],
  )

  const updateSettings = useCallback((next: Partial<AppData['settings']>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...next,
      },
    }))
  }, [])

  const createCompany = useCallback((input: CompanyInput) => {
    const qualityScore = 86 + Math.floor(Math.random() * 12)
    setData((prev) => ({
      ...prev,
      companies: [
        ...prev.companies,
        {
          id: toId('company'),
          qualityScore,
          ...input,
        },
      ],
    }))
  }, [])

  const createProject = useCallback((input: ProjectInput) => {
    setData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          id: toId('project'),
          verified: true,
          open: true,
          ...input,
        },
      ],
    }))
  }, [])

  const sendInvitation = useCallback((agentId: string, projectId: string) => {
    setData((prev) => {
      const duplicate = prev.invitations.some(
        (invitation) => invitation.agentId === agentId && invitation.projectId === projectId,
      )
      if (duplicate) return prev

      return {
        ...prev,
        invitations: [
          ...prev.invitations,
          {
            id: toId('invite'),
            projectId,
            agentId,
            sentAt: new Date().toISOString(),
            status: 'pending',
          },
        ],
      }
    })
  }, [])

  const rankedProjects = useMemo(
    () => rankProjectsForAgent(data.agentProfile, data.projects),
    [data.agentProfile, data.projects],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      isAuthenticated: Boolean(data.authUser),
      isAgent: data.authUser?.role === 'agent',
      isAdmin: data.authUser?.role === 'admin',
      rankedProjects,
      signIn,
      signOut,
      updateAgentProfile,
      addMediaAssets,
      generateAiSummary,
      applyToProject,
      markProjectNotInterested,
      updateApplicationStatus,
      updateSettings,
      createCompany,
      createProject,
      sendInvitation,
    }),
    [
      addMediaAssets,
      applyToProject,
      createCompany,
      createProject,
      data,
      generateAiSummary,
      markProjectNotInterested,
      rankedProjects,
      sendInvitation,
      signIn,
      signOut,
      updateAgentProfile,
      updateApplicationStatus,
      updateSettings,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used inside AppProvider')
  return context
}

