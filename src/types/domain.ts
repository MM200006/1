export type AuthProvider = 'email' | 'google' | 'linkedin'

export type UserRole = 'agent' | 'admin'

export type CallType = 'cold' | 'warm' | 'closing' | 'inbound'

export type CompensationModel = 'hourly' | 'base+commission' | 'commission-only' | 'hybrid'

export type ApplicationStatus =
  | 'Applied'
  | 'Under review'
  | 'Interview'
  | 'Accepted'
  | 'Rejected'

export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export type MediaType =
  | 'profilePhoto'
  | 'introVideo'
  | 'voiceSample'
  | 'cv'
  | 'certificate'
  | 'reference'
  | 'pdf'
  | 'salesStatistics'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  provider: AuthProvider
}

export interface AgentProfile {
  id: string
  fullName: string
  email: string
  headline: string
  yearsExperience: number
  industries: string[]
  callTypes: CallType[]
  languages: string[]
  availability: string
  compensationModel: CompensationModel
  strengths: string
  achievements: string
  technicalSetup: string
  references: string
  preferredProjectTypes: string[]
}

export interface MediaAsset {
  id: string
  mediaType: MediaType
  fileName: string
  fileSizeKb: number
  uploadedAt: string
}

export interface AIQualificationSummary {
  strongestEnvironments: string[]
  idealProjectTypes: string[]
  estimatedSeniority: 'Junior' | 'Mid-Level' | 'Senior' | 'Elite'
  recommendedPositioning: string
  narrative: string
}

export interface CompanyProfile {
  id: string
  name: string
  industry: string
  size: string
  website: string
  qualityScore: number
}

export interface Project {
  id: string
  companyId: string
  title: string
  industry: string
  targetGroup: string
  responsibilities: string[]
  compensation: string
  requirements: string[]
  startDate: string
  workload: string
  verified: boolean
  open: boolean
}

export interface ProjectInvitation {
  id: string
  projectId: string
  agentId: string
  sentAt: string
  status: InvitationStatus
}

export interface Application {
  id: string
  projectId: string
  agentId: string
  status: ApplicationStatus
  submittedAt: string
}

export interface ReputationSnapshot {
  profileStrength: number
  responsiveness: number
  reliability: number
  completedProjects: number
}

export interface ResourceItem {
  id: string
  title: string
  category: 'Training' | 'Scripts' | 'Objection Handling' | 'Onboarding' | 'Performance'
  format: string
  level: 'Core' | 'Advanced'
  duration: string
  description: string
}

export interface AgentDirectoryEntry {
  id: string
  fullName: string
  seniority: 'Junior' | 'Mid-Level' | 'Senior' | 'Elite'
  industries: string[]
  languages: string[]
  profileStrength: number
}

export interface AgentSettings {
  visibility: 'private' | 'invite-only' | 'public'
  notificationsEmail: boolean
  notificationsPush: boolean
  availabilityStatus: 'open' | 'limited' | 'unavailable'
}

export interface FutureModules {
  ratingsEnabled: boolean
  payrollIntegrationsEnabled: boolean
  contractsEnabled: boolean
  performanceTrackingEnabled: boolean
  aiCallAnalysisEnabled: boolean
  trainingLevelsEnabled: boolean
}

export interface AppData {
  authUser: AuthUser | null
  agentProfile: AgentProfile
  mediaAssets: MediaAsset[]
  aiSummary: AIQualificationSummary | null
  companies: CompanyProfile[]
  projects: Project[]
  invitations: ProjectInvitation[]
  applications: Application[]
  resources: ResourceItem[]
  agentDirectory: AgentDirectoryEntry[]
  notInterestedProjectIds: string[]
  settings: AgentSettings
  futureModules: FutureModules
}
