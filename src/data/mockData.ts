import type {
  AgentDirectoryEntry,
  AgentProfile,
  AgentSettings,
  AppData,
  CompanyProfile,
  FutureModules,
  Project,
  ResourceItem,
} from '../types/domain'

export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  id: 'agent-1',
  fullName: 'Jordan Riley',
  email: 'jordan.riley@salespro.io',
  headline: 'High-performance outbound and closing specialist',
  yearsExperience: 6,
  industries: ['SaaS', 'FinTech'],
  callTypes: ['cold', 'warm', 'closing'],
  languages: ['English', 'German'],
  availability: '35 hours/week, immediate start',
  compensationModel: 'base+commission',
  strengths: 'Discovery calls, objection handling, and enterprise follow-up discipline.',
  achievements:
    'Closed 4.2M EUR annual contract value in the last 18 months with 29% close rate from SQL.',
  technicalSetup:
    'Fiber connection, dedicated home office, CRM stack: HubSpot, Salesforce, Aircall.',
  references: '2 B2B SaaS references available on request.',
  preferredProjectTypes: ['B2B SaaS', 'Outbound SDR', 'Closer roles'],
}

export const DEFAULT_SETTINGS: AgentSettings = {
  visibility: 'invite-only',
  notificationsEmail: true,
  notificationsPush: true,
  availabilityStatus: 'open',
}

export const DEFAULT_FUTURE_MODULES: FutureModules = {
  ratingsEnabled: false,
  payrollIntegrationsEnabled: false,
  contractsEnabled: false,
  performanceTrackingEnabled: false,
  aiCallAnalysisEnabled: false,
  trainingLevelsEnabled: false,
}

export const MOCK_COMPANIES: CompanyProfile[] = [
  {
    id: 'company-1',
    name: 'Northline Revenue Systems',
    industry: 'SaaS',
    size: '120 employees',
    website: 'https://northline.example',
    qualityScore: 94,
  },
  {
    id: 'company-2',
    name: 'Prime Ledger FinTech',
    industry: 'FinTech',
    size: '80 employees',
    website: 'https://primeledger.example',
    qualityScore: 91,
  },
  {
    id: 'company-3',
    name: 'HealthScale Group',
    industry: 'Healthcare',
    size: '250 employees',
    website: 'https://healthscale.example',
    qualityScore: 89,
  },
]

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'project-1',
    companyId: 'company-1',
    title: 'Enterprise Outbound SDR - DACH Market',
    industry: 'SaaS',
    targetGroup: 'VP Sales and RevOps leaders',
    responsibilities: [
      'Cold outreach with multi-channel cadence',
      'Discovery qualification and calendar conversion',
      'Weekly pipeline handoff reviews',
    ],
    compensation: 'Base + commission, expected 6.5k EUR/month OTE',
    requirements: ['3+ years B2B outbound', 'CRM discipline', 'German + English'],
    startDate: '2026-03-01',
    workload: 'Full-time',
    verified: true,
    open: true,
  },
  {
    id: 'project-2',
    companyId: 'company-2',
    title: 'FinTech Closing Specialist (Remote)',
    industry: 'FinTech',
    targetGroup: 'SMB CFOs and Finance Managers',
    responsibilities: [
      'Run high-intent demos',
      'Handle objections and negotiate pricing',
      'Close and coordinate onboarding handoff',
    ],
    compensation: 'Hybrid model, 8k EUR/month OTE',
    requirements: ['Closing experience', 'Financial product affinity'],
    startDate: '2026-03-15',
    workload: '35-40 hrs/week',
    verified: true,
    open: true,
  },
  {
    id: 'project-3',
    companyId: 'company-3',
    title: 'Inbound Sales Advisor - HealthTech',
    industry: 'Healthcare',
    targetGroup: 'Private clinics and group practices',
    responsibilities: [
      'Handle inbound leads within 15 minutes',
      'Provide consultative qualification',
      'Coordinate trial setup and follow-up',
    ],
    compensation: 'Hourly + performance bonus',
    requirements: ['Inbound experience', 'Strong empathy and process compliance'],
    startDate: '2026-04-01',
    workload: 'Part-time, 25 hrs/week',
    verified: true,
    open: true,
  },
  {
    id: 'project-4',
    companyId: 'company-1',
    title: 'SMB Reactivation Campaign Specialist',
    industry: 'SaaS',
    targetGroup: 'Dormant SMB accounts',
    responsibilities: [
      'Lead reactivation sequences',
      'Renew annual contracts',
      'Report campaign conversions',
    ],
    compensation: 'Commission-only with high upside',
    requirements: ['Retention and renewal experience'],
    startDate: '2026-03-10',
    workload: 'Flexible',
    verified: true,
    open: true,
  },
]

export const MOCK_RESOURCES: ResourceItem[] = [
  {
    id: 'resource-1',
    title: 'Enterprise Discovery Call Blueprint',
    category: 'Scripts',
    format: 'PDF Playbook',
    level: 'Core',
    duration: '18 pages',
    description: 'Proven discovery structure for high-ticket B2B calls.',
  },
  {
    id: 'resource-2',
    title: 'Objection Handling Matrix for Price Pushback',
    category: 'Objection Handling',
    format: 'Interactive Guide',
    level: 'Advanced',
    duration: '25 min',
    description: 'Frameworks for reframing value and recovering momentum.',
  },
  {
    id: 'resource-3',
    title: 'Remote Sales Workspace Optimization',
    category: 'Performance',
    format: 'Video Module',
    level: 'Core',
    duration: '14 min',
    description: 'Audio setup, call flow ergonomics, and performance rhythm.',
  },
  {
    id: 'resource-4',
    title: 'New Project Onboarding Checklist',
    category: 'Onboarding',
    format: 'Checklist',
    level: 'Core',
    duration: '10 min',
    description: 'Standard operating sequence for first 5 production days.',
  },
  {
    id: 'resource-5',
    title: 'Advanced Multi-threading for Mid-Market Deals',
    category: 'Training',
    format: 'Workshop',
    level: 'Advanced',
    duration: '45 min',
    description: 'How top reps navigate stakeholders and shorten decision cycles.',
  },
]

export const MOCK_AGENT_DIRECTORY: AgentDirectoryEntry[] = [
  {
    id: 'agent-1',
    fullName: 'Jordan Riley',
    seniority: 'Senior',
    industries: ['SaaS', 'FinTech'],
    languages: ['English', 'German'],
    profileStrength: 82,
  },
  {
    id: 'agent-2',
    fullName: 'Maya Ortega',
    seniority: 'Elite',
    industries: ['Healthcare', 'SaaS'],
    languages: ['English', 'Spanish'],
    profileStrength: 90,
  },
  {
    id: 'agent-3',
    fullName: 'Noah Fischer',
    seniority: 'Mid-Level',
    industries: ['E-commerce', 'FinTech'],
    languages: ['German', 'English'],
    profileStrength: 74,
  },
]

export const DEFAULT_APP_DATA: AppData = {
  authUser: null,
  agentProfile: DEFAULT_AGENT_PROFILE,
  mediaAssets: [],
  aiSummary: null,
  companies: MOCK_COMPANIES,
  projects: MOCK_PROJECTS,
  invitations: [
    {
      id: 'invite-1',
      projectId: 'project-2',
      agentId: 'agent-1',
      sentAt: '2026-02-01T09:00:00.000Z',
      status: 'pending',
    },
  ],
  applications: [],
  resources: MOCK_RESOURCES,
  agentDirectory: MOCK_AGENT_DIRECTORY,
  notInterestedProjectIds: [],
  settings: DEFAULT_SETTINGS,
  futureModules: DEFAULT_FUTURE_MODULES,
}
