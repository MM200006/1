import type {
  AIQualificationSummary,
  AgentProfile,
  Application,
  MediaAsset,
  Project,
  ReputationSnapshot,
} from '../types/domain'

const ENVIRONMENT_HINTS: Record<string, string> = {
  SaaS: 'structured outbound and recurring-revenue pipelines',
  FinTech: 'trust-driven consultative conversations with CFO stakeholders',
  Healthcare: 'compliance-aware consultative selling',
  'E-commerce': 'high-volume transactional sales motions',
}

const PROJECT_TYPE_HINTS: Record<string, string> = {
  cold: 'net-new outbound hunting',
  warm: 'pipeline acceleration and follow-up',
  closing: 'full-cycle closing mandates',
  inbound: 'inbound qualification and conversion',
}

export const calculateProfileStrength = (profile: AgentProfile, mediaAssets: MediaAsset[]) => {
  let score = 30

  if (profile.yearsExperience >= 2) score += 10
  if (profile.yearsExperience >= 5) score += 8
  if (profile.industries.length > 0) score += 8
  if (profile.callTypes.length > 1) score += 8
  if (profile.languages.length > 1) score += 6
  if (profile.strengths.trim().length >= 20) score += 8
  if (profile.achievements.trim().length >= 20) score += 8
  if (profile.technicalSetup.trim().length >= 20) score += 6
  if (profile.references.trim().length >= 10) score += 4
  if (mediaAssets.length > 0) score += Math.min(14, mediaAssets.length * 2)

  return Math.min(100, score)
}

const estimateSeniority = (profile: AgentProfile, profileStrength: number) => {
  if (profile.yearsExperience >= 8 || profileStrength >= 90) return 'Elite' as const
  if (profile.yearsExperience >= 5 || profileStrength >= 80) return 'Senior' as const
  if (profile.yearsExperience >= 2 || profileStrength >= 65) return 'Mid-Level' as const
  return 'Junior' as const
}

export const buildAiQualificationSummary = (
  profile: AgentProfile,
  mediaAssets: MediaAsset[],
): AIQualificationSummary => {
  const profileStrength = calculateProfileStrength(profile, mediaAssets)
  const seniority = estimateSeniority(profile, profileStrength)

  const strongestEnvironments =
    profile.industries.length > 0
      ? profile.industries.map((industry) => ENVIRONMENT_HINTS[industry] ?? `${industry} sales environments`)
      : ['multi-industry remote sales teams']

  const idealProjectTypes =
    profile.callTypes.length > 0
      ? profile.callTypes.map((callType) => PROJECT_TYPE_HINTS[callType] ?? 'specialized sales assignments')
      : ['general sales support projects']

  const recommendedPositioning =
    seniority === 'Elite'
      ? 'Position as strategic revenue lead for high-value accounts and complex cycles.'
      : seniority === 'Senior'
        ? 'Position as dependable project-ready closer with predictable pipeline output.'
        : seniority === 'Mid-Level'
          ? 'Position as structured operator in coached performance environments.'
          : 'Position as growth-focused sales professional with strong coaching capacity.'

  const narrative = `${profile.fullName} demonstrates ${seniority.toLowerCase()} commercial potential across ${profile.industries.join(', ') || 'multiple'} sectors. Best fit includes ${idealProjectTypes.slice(0, 2).join(' and ')}, with positioning focused on ${recommendedPositioning.toLowerCase()}`

  return {
    strongestEnvironments,
    idealProjectTypes,
    estimatedSeniority: seniority,
    recommendedPositioning,
    narrative,
  }
}

export const projectMatchScore = (profile: AgentProfile, project: Project) => {
  let score = 0

  if (profile.industries.includes(project.industry)) score += 35
  if (profile.preferredProjectTypes.some((item) => project.title.toLowerCase().includes(item.toLowerCase())))
    score += 20
  if (
    profile.callTypes.some((callType) => {
      if (callType === 'cold') return project.title.toLowerCase().includes('outbound')
      if (callType === 'warm') return project.title.toLowerCase().includes('reactivation')
      if (callType === 'closing') return project.title.toLowerCase().includes('closing')
      if (callType === 'inbound') return project.title.toLowerCase().includes('inbound')
      return false
    })
  ) {
    score += 20
  }
  if (profile.languages.some((language) => project.requirements.join(' ').includes(language))) score += 15
  if (project.verified) score += 10

  return Math.min(100, score)
}

export const rankProjectsForAgent = (profile: AgentProfile, projects: Project[]) =>
  [...projects]
    .filter((project) => project.open)
    .map((project) => ({
      project,
      score: projectMatchScore(profile, project),
    }))
    .sort((a, b) => b.score - a.score)

export const calculateReputationSnapshot = (
  profileStrength: number,
  applications: Application[],
): ReputationSnapshot => {
  const accepted = applications.filter((application) => application.status === 'Accepted').length
  const interviews = applications.filter((application) => application.status === 'Interview').length
  const active = applications.filter((application) => application.status !== 'Rejected').length

  const responsiveness = Math.min(100, 55 + applications.length * 8)
  const reliability = Math.min(100, 60 + accepted * 18 + interviews * 8)

  return {
    profileStrength,
    responsiveness,
    reliability,
    completedProjects: accepted,
  }
}
