import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Metric,
  ProgressBar,
  SectionHeader,
  Select,
  TextArea,
} from './components/ui'
import { useAppContext } from './context/AppContext'
import type { ApplicationStatus, CallType, CompensationModel, MediaType, Project } from './types/domain'
import { calculateProfileStrength, calculateReputationSnapshot } from './utils/scoring'

const joinClassNames = (...tokens: Array<string | false | undefined>) => tokens.filter(Boolean).join(' ')

const AGENT_NAV = [
  { label: 'Overview', to: '/agent' },
  { label: 'Project Marketplace', to: '/agent/marketplace' },
  { label: 'Applications', to: '/agent/applications' },
  { label: 'Reputation', to: '/agent/reputation' },
  { label: 'Resource Library', to: '/agent/resources' },
  { label: 'Settings', to: '/agent/settings' },
]

const ADMIN_NAV = [
  { label: 'Overview', to: '/admin' },
  { label: 'Companies', to: '/admin/companies' },
  { label: 'Projects', to: '/admin/projects' },
  { label: 'Agent Directory', to: '/admin/agents' },
  { label: 'Hiring Pipeline', to: '/admin/pipeline' },
]

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const statusOrder: ApplicationStatus[] = [
  'Applied',
  'Under review',
  'Interview',
  'Accepted',
  'Rejected',
]

const statusBadgeClass: Record<ApplicationStatus, string> = {
  Applied: 'status-neutral',
  'Under review': 'status-info',
  Interview: 'status-warning',
  Accepted: 'status-success',
  Rejected: 'status-danger',
}

const INDUSTRY_OPTIONS = [
  'SaaS',
  'FinTech',
  'Healthcare',
  'E-commerce',
  'Education',
  'Telecom',
  'Professional Services',
]

const CALL_TYPE_OPTIONS: CallType[] = ['cold', 'warm', 'closing', 'inbound']

const COMPENSATION_OPTIONS: CompensationModel[] = [
  'hourly',
  'base+commission',
  'commission-only',
  'hybrid',
]

const MEDIA_CATEGORIES: Array<{ type: MediaType; title: string; hint: string; accept: string }> = [
  {
    type: 'profilePhoto',
    title: 'Profile Photo',
    hint: 'Professional portrait used in your public talent profile.',
    accept: 'image/*',
  },
  {
    type: 'introVideo',
    title: 'Intro Video',
    hint: '60-90 second positioning video.',
    accept: 'video/*',
  },
  {
    type: 'voiceSample',
    title: 'Voice Samples',
    hint: 'Call snippets demonstrating clarity and cadence.',
    accept: 'audio/*',
  },
  {
    type: 'cv',
    title: 'CV / Resume',
    hint: 'Structured work history and achievements.',
    accept: '.pdf,.doc,.docx',
  },
  {
    type: 'certificate',
    title: 'Certificates',
    hint: 'Sales certifications and training credentials.',
    accept: '.pdf,image/*',
  },
  {
    type: 'reference',
    title: 'References',
    hint: 'Reference letters or recommendation files.',
    accept: '.pdf,.doc,.docx',
  },
  {
    type: 'pdf',
    title: 'Additional PDFs',
    hint: 'Any supporting documentation for quality control.',
    accept: '.pdf',
  },
  {
    type: 'salesStatistics',
    title: 'Sales Statistics',
    hint: 'Performance snapshots, scorecards, or quota reports.',
    accept: '.pdf,.xlsx,.csv,image/*',
  },
]

const ShellFrame = ({
  navItems,
  userName,
  title,
}: {
  navItems: Array<{ label: string; to: string }>
  userName: string
  title: string
}) => {
  const { signOut } = useAppContext()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <p>Revenue Talent Infrastructure</p>
          <h1>Sales Guild</h1>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => joinClassNames('nav-link', isActive && 'active')}
              to={item.to}
              end={item.to === '/agent' || item.to === '/admin'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>{userName}</p>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>

      <main className="shell-main">
        <header className="shell-header">
          <h2>{title}</h2>
          <Badge>Verified projects only</Badge>
        </header>
        <div className="shell-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export const LandingPage = () => (
  <div className="landing">
    <section className="landing-hero">
      <div>
        <p className="eyebrow">Professional career infrastructure for sales talent</p>
        <h1>The place where professional sales people get real projects.</h1>
        <p>
          Sales Guild brings structure to sales recruiting: verified opportunities for serious
          telesales and call center professionals, transparent quality standards for companies.
        </p>
        <div className="row gap">
          <Link className="btn btn-primary" to="/auth">
            Create Account
          </Link>
          <a className="btn btn-secondary" href="#how-it-works">
            How it Works
          </a>
        </div>
      </div>
      <Card title="Built for high-performance revenue teams" subtitle="Not a freelancer marketplace">
        <ul className="list">
          <li>Professional profiles with proof of performance</li>
          <li>AI-supported qualification and matching</li>
          <li>Transparent application pipeline for both sides</li>
          <li>Reputation system built around reliability</li>
        </ul>
      </Card>
    </section>

    <section id="how-it-works" className="landing-section">
      <SectionHeader
        title="How it works in 3 steps"
        subtitle="A premium process from profile setup to project acceptance."
      />
      <div className="grid three-col">
        <Card title="1. Build your professional profile">
          <p>Complete a conversational wizard once. Upload proof, achievements, references.</p>
        </Card>
        <Card title="2. Receive intelligent project matches">
          <p>AI-generated qualification summary and verified recommendations.</p>
        </Card>
        <Card title="3. Apply in one click and track status">
          <p>Monitor every application stage: Applied, Review, Interview, Accepted, Rejected.</p>
        </Card>
      </div>
    </section>

    <section className="landing-section">
      <SectionHeader title="Trust, professionalism, quality control" />
      <div className="grid two-col">
        <Card title="For Agents">
          <ul className="list">
            <li>Showcase verified experience and proof assets</li>
            <li>Receive project invitations that match your strengths</li>
            <li>Build long-term credibility through reputation metrics</li>
          </ul>
        </Card>
        <Card title="For Companies">
          <ul className="list">
            <li>Filter qualified talent by sales capability and industries</li>
            <li>Manage invitations and hiring pipeline in one workflow</li>
            <li>Reduce recruiting noise and increase hiring confidence</li>
          </ul>
        </Card>
      </div>
    </section>

    <section className="landing-cta">
      <h2>Serious place. Serious projects. Serious professionals.</h2>
      <Link className="btn btn-primary" to="/auth">
        Start your profile
      </Link>
    </section>
  </div>
)

export const AuthPage = () => {
  const navigate = useNavigate()
  const { signIn, isAuthenticated, data } = useAppContext()
  const [fullName, setFullName] = useState('Jordan Riley')
  const [email, setEmail] = useState('jordan.riley@salespro.io')
  const [role, setRole] = useState<'agent' | 'admin'>('agent')

  const handleSignIn = (provider: 'email' | 'google' | 'linkedin') => {
    signIn({ fullName, email, role, provider })

    if (role === 'agent') {
      navigate('/onboarding/profile')
      return
    }
    navigate('/admin')
  }

  if (isAuthenticated) {
    return (
      <div className="auth-page">
        <Card title="You are already signed in">
          <p>
            Continue as <strong>{data.authUser?.fullName}</strong>.
          </p>
          <div className="row gap">
            <Link className="btn btn-primary" to={data.authUser?.role === 'admin' ? '/admin' : '/agent'}>
              Open Dashboard
            </Link>
            <Link className="btn btn-secondary" to="/">
              Return to Landing
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const onEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleSignIn('email')
  }

  return (
    <div className="auth-page">
      <Card title="Sign up / Login" subtitle="Choose access method and role">
        <form className="stack" onSubmit={onEmailSubmit}>
          <Field label="Account Type">
            <Select value={role} onChange={(event) => setRole(event.target.value as 'agent' | 'admin')}>
              <option value="agent">Agent</option>
              <option value="admin">Company / Admin</option>
            </Select>
          </Field>

          <Field label="Full Name">
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </Field>

          <Field label="Email">
            <Input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </Field>

          <Button type="submit">Continue with Email</Button>
        </form>

        <div className="divider">or</div>

        <div className="row wrap gap">
          <Button variant="secondary" onClick={() => handleSignIn('google')}>
            Continue with Google
          </Button>
          <Button variant="secondary" onClick={() => handleSignIn('linkedin')}>
            Continue with LinkedIn
          </Button>
        </div>
      </Card>
    </div>
  )
}

export const AgentLayout = () => {
  const { isAuthenticated, isAgent, data } = useAppContext()
  if (!isAuthenticated || !isAgent) return <Navigate replace to="/auth" />

  return <ShellFrame navItems={AGENT_NAV} userName={data.authUser?.fullName ?? 'Agent'} title="Agent Workspace" />
}

export const AdminLayout = () => {
  const { isAuthenticated, isAdmin, data } = useAppContext()
  if (!isAuthenticated || !isAdmin) return <Navigate replace to="/auth" />

  return <ShellFrame navItems={ADMIN_NAV} userName={data.authUser?.fullName ?? 'Admin'} title="Admin Workspace" />
}

export const OnboardingProfilePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isAgent, data, updateAgentProfile } = useAppContext()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(data.agentProfile)

  if (!isAuthenticated || !isAgent) return <Navigate replace to="/auth" />

  const updateArray = (field: 'industries' | 'languages' | 'preferredProjectTypes', value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }))
  }

  const toggleArrayItem = (
    field: 'industries' | 'callTypes',
    value: string,
    checked: boolean,
  ) => {
    setDraft((prev) => {
      const source = prev[field]
      const next = checked ? [...source, value] : source.filter((item) => item !== value)
      return { ...prev, [field]: next }
    })
  }

  const steps: Array<{
    question: string
    detail: string
    content: ReactNode
    valid: boolean
  }> = [
    {
      question: 'How many years of sales experience do you have?',
      detail: 'Use this to estimate seniority and ideal project level.',
      content: (
        <Field label="Years of experience">
          <Input
            min={0}
            type="number"
            value={draft.yearsExperience}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, yearsExperience: Number(event.target.value) }))
            }
          />
        </Field>
      ),
      valid: draft.yearsExperience >= 0,
    },
    {
      question: 'Which industries have you sold in?',
      detail: 'Select all relevant sectors.',
      content: (
        <div className="checkbox-grid">
          {INDUSTRY_OPTIONS.map((industry) => (
            <label key={industry} className="checkbox-row">
              <input
                checked={draft.industries.includes(industry)}
                onChange={(event) => toggleArrayItem('industries', industry, event.target.checked)}
                type="checkbox"
              />
              <span>{industry}</span>
            </label>
          ))}
        </div>
      ),
      valid: draft.industries.length > 0,
    },
    {
      question: 'What call environments are your strength?',
      detail: 'Cold, warm, closing, and inbound performance context.',
      content: (
        <div className="checkbox-grid">
          {CALL_TYPE_OPTIONS.map((callType) => (
            <label key={callType} className="checkbox-row">
              <input
                checked={draft.callTypes.includes(callType)}
                onChange={(event) => toggleArrayItem('callTypes', callType, event.target.checked)}
                type="checkbox"
              />
              <span>{callType}</span>
            </label>
          ))}
        </div>
      ),
      valid: draft.callTypes.length > 0,
    },
    {
      question: 'Which languages do you actively sell in?',
      detail: 'Comma-separated list. Example: English, German.',
      content: (
        <Field label="Languages">
          <Input
            value={draft.languages.join(', ')}
            onChange={(event) => updateArray('languages', event.target.value)}
          />
        </Field>
      ),
      valid: draft.languages.length > 0,
    },
    {
      question: 'What is your availability?',
      detail: 'Share hours/week and earliest start date.',
      content: (
        <Field label="Availability">
          <Input
            value={draft.availability}
            onChange={(event) => setDraft((prev) => ({ ...prev, availability: event.target.value }))}
          />
        </Field>
      ),
      valid: draft.availability.trim().length > 0,
    },
    {
      question: 'Preferred compensation model?',
      detail: 'Choose the model that fits your project preferences.',
      content: (
        <Field label="Compensation model">
          <Select
            value={draft.compensationModel}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, compensationModel: event.target.value as CompensationModel }))
            }
          >
            {COMPENSATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
      ),
      valid: draft.compensationModel.length > 0,
    },
    {
      question: 'What are your strongest sales capabilities?',
      detail: 'Describe concrete strengths for qualification and matching.',
      content: (
        <Field label="Strengths">
          <TextArea
            rows={4}
            value={draft.strengths}
            onChange={(event) => setDraft((prev) => ({ ...prev, strengths: event.target.value }))}
          />
        </Field>
      ),
      valid: draft.strengths.trim().length > 20,
    },
    {
      question: 'Share your key achievements.',
      detail: 'Numbers improve credibility and ranking.',
      content: (
        <Field label="Achievements">
          <TextArea
            rows={4}
            value={draft.achievements}
            onChange={(event) => setDraft((prev) => ({ ...prev, achievements: event.target.value }))}
          />
        </Field>
      ),
      valid: draft.achievements.trim().length > 20,
    },
    {
      question: 'Describe your technical setup.',
      detail: 'Quality control for remote execution standards.',
      content: (
        <Field label="Technical setup">
          <TextArea
            rows={3}
            value={draft.technicalSetup}
            onChange={(event) => setDraft((prev) => ({ ...prev, technicalSetup: event.target.value }))}
          />
        </Field>
      ),
      valid: draft.technicalSetup.trim().length > 10,
    },
    {
      question: 'Add references and ideal project types.',
      detail: 'This strengthens trust and recommendation quality.',
      content: (
        <div className="stack">
          <Field label="References">
            <TextArea
              rows={3}
              value={draft.references}
              onChange={(event) => setDraft((prev) => ({ ...prev, references: event.target.value }))}
            />
          </Field>
          <Field label="Preferred project types (comma-separated)">
            <Input
              value={draft.preferredProjectTypes.join(', ')}
              onChange={(event) => updateArray('preferredProjectTypes', event.target.value)}
            />
          </Field>
        </div>
      ),
      valid: draft.references.trim().length > 5 && draft.preferredProjectTypes.length > 0,
    },
  ]

  const current = steps[step]
  const progress = Math.round(((step + 1) / steps.length) * 100)

  const goNext = () => {
    if (!current.valid) return
    if (step === steps.length - 1) {
      updateAgentProfile(draft)
      navigate('/onboarding/media')
      return
    }
    setStep((prev) => prev + 1)
  }

  return (
    <div className="onboarding">
      <Card title="Sales Profile Builder" subtitle="Conversational setup, one question at a time">
        <ProgressBar label={`Step ${step + 1} of ${steps.length}`} value={progress} />
        <div className="wizard-question">
          <h3>{current.question}</h3>
          <p>{current.detail}</p>
        </div>
        {current.content}
        <div className="row gap spread">
          <Button disabled={step === 0} variant="secondary" onClick={() => setStep((prev) => prev - 1)}>
            Back
          </Button>
          <Button onClick={goNext}>{step === steps.length - 1 ? 'Continue to uploads' : 'Next'}</Button>
        </div>
      </Card>
    </div>
  )
}

export const MediaUploadPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isAgent, data, addMediaAssets, generateAiSummary } = useAppContext()

  if (!isAuthenticated || !isAgent) return <Navigate replace to="/auth" />

  const grouped = MEDIA_CATEGORIES.map((item) => ({
    ...item,
    uploads: data.mediaAssets.filter((asset) => asset.mediaType === item.type),
  }))

  return (
    <div className="onboarding">
      <Card
        title="Media & Proof Upload"
        subtitle="Upload evidence that demonstrates quality and performance."
      >
        <div className="stack lg">
          {grouped.map((entry) => (
            <Card key={entry.type} title={entry.title} subtitle={entry.hint}>
              <Input
                accept={entry.accept}
                multiple
                type="file"
                onChange={(event) => {
                  if (!event.target.files || event.target.files.length === 0) return
                  addMediaAssets(entry.type, event.target.files)
                  event.target.value = ''
                }}
              />
              {entry.uploads.length > 0 && (
                <ul className="file-list">
                  {entry.uploads.map((asset) => (
                    <li key={asset.id}>
                      <strong>{asset.fileName}</strong>
                      <span>{asset.fileSizeKb} KB</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
        <div className="row gap spread">
          <Link className="btn btn-secondary" to="/onboarding/profile">
            Back to profile
          </Link>
          <Button
            onClick={() => {
              generateAiSummary()
              navigate('/onboarding/summary')
            }}
          >
            Generate AI Summary
          </Button>
        </div>
      </Card>
    </div>
  )
}

export const AISummaryPage = () => {
  const { isAuthenticated, isAgent, data, generateAiSummary } = useAppContext()
  const profileStrength = calculateProfileStrength(data.agentProfile, data.mediaAssets)

  useEffect(() => {
    if (!data.aiSummary) generateAiSummary()
  }, [data.aiSummary, generateAiSummary])

  if (!isAuthenticated || !isAgent) return <Navigate replace to="/auth" />

  return (
    <div className="onboarding">
      <Card title="AI Qualification Summary" subtitle="Automatically generated profile positioning">
        {!data.aiSummary ? (
          <p>Generating your summary...</p>
        ) : (
          <div className="stack">
            <ProgressBar label="Profile strength" value={profileStrength} />
            <Card title="Estimated seniority" rightSlot={<Badge>{data.aiSummary.estimatedSeniority}</Badge>}>
              <p>{data.aiSummary.recommendedPositioning}</p>
            </Card>
            <Card title="Strongest sales environments">
              <ul className="list">
                {data.aiSummary.strongestEnvironments.map((environment) => (
                  <li key={environment}>{environment}</li>
                ))}
              </ul>
            </Card>
            <Card title="Ideal project types">
              <ul className="list">
                {data.aiSummary.idealProjectTypes.map((projectType) => (
                  <li key={projectType}>{projectType}</li>
                ))}
              </ul>
            </Card>
            <Card title="Public profile narrative">
              <p>{data.aiSummary.narrative}</p>
            </Card>
          </div>
        )}
        <div className="row gap end">
          <Link className="btn btn-primary" to="/agent">
            Enter Agent Workspace
          </Link>
        </div>
      </Card>
    </div>
  )
}

const ProjectCard = ({
  project,
  companyName,
  score,
  invited,
  applied,
  onApply,
  onNotInterested,
}: {
  project: Project
  companyName: string
  score?: number
  invited?: boolean
  applied: boolean
  onApply: () => void
  onNotInterested: () => void
}) => (
  <Card
    title={project.title}
    subtitle={`${companyName} • ${project.industry}`}
    rightSlot={
      <div className="row gap">
        {project.verified && <Badge>Verified</Badge>}
        {invited && <Badge>Invited</Badge>}
      </div>
    }
  >
    <p className="muted">
      <strong>Target group:</strong> {project.targetGroup}
    </p>
    <p className="muted">
      <strong>Compensation:</strong> {project.compensation}
    </p>
    <p className="muted">
      <strong>Start date:</strong> {formatDate(project.startDate)} • <strong>Workload:</strong> {project.workload}
    </p>
    {typeof score === 'number' && (
      <p className="muted">
        <strong>AI match score:</strong> {score}%
      </p>
    )}
    <p className="muted">
      <strong>Requirements:</strong> {project.requirements.join(' • ')}
    </p>
    <ul className="list compact">
      {project.responsibilities.map((responsibility) => (
        <li key={responsibility}>{responsibility}</li>
      ))}
    </ul>
    <div className="row gap">
      <Button disabled={applied} onClick={onApply}>
        {applied ? 'Applied' : 'Apply'}
      </Button>
      <Button variant="ghost" onClick={onNotInterested}>
        Not interested
      </Button>
    </div>
  </Card>
)

export const AgentOverviewPage = () => {
  const { data, rankedProjects, applyToProject, markProjectNotInterested } = useAppContext()

  const companyById = useMemo(
    () => Object.fromEntries(data.companies.map((company) => [company.id, company])),
    [data.companies],
  )

  const applications = data.applications.filter((application) => application.agentId === data.agentProfile.id)
  const pendingInvites = data.invitations.filter(
    (invitation) => invitation.agentId === data.agentProfile.id && invitation.status === 'pending',
  )

  const profileStrength = calculateProfileStrength(data.agentProfile, data.mediaAssets)
  const reputation = calculateReputationSnapshot(profileStrength, applications)

  return (
    <div className="stack lg">
      <SectionHeader
        title="Agent command center"
        subtitle="Track profile quality, invitation volume, and project momentum."
      />
      <div className="grid four-col">
        <Metric label="Profile strength" value={`${reputation.profileStrength}%`} />
        <Metric label="Pending invitations" value={pendingInvites.length} />
        <Metric label="Active applications" value={applications.length} />
        <Metric label="Reliability score" value={`${reputation.reliability}%`} />
      </div>
      <Card title="Top AI-based project suggestions">
        <div className="grid two-col">
          {rankedProjects
            .filter(({ project }) => !data.notInterestedProjectIds.includes(project.id))
            .slice(0, 4)
            .map(({ project, score }) => (
              <ProjectCard
                key={project.id}
                applied={applications.some((application) => application.projectId === project.id)}
                companyName={companyById[project.companyId]?.name ?? 'Unknown Company'}
                invited={pendingInvites.some((invite) => invite.projectId === project.id)}
                onApply={() => applyToProject(project.id)}
                onNotInterested={() => markProjectNotInterested(project.id)}
                project={project}
                score={score}
              />
            ))}
        </div>
      </Card>
    </div>
  )
}

export const ProjectMarketplacePage = () => {
  const { data, rankedProjects, applyToProject, markProjectNotInterested } = useAppContext()
  const [view, setView] = useState<'recommended' | 'open' | 'invited'>('recommended')

  const companyById = useMemo(
    () => Object.fromEntries(data.companies.map((company) => [company.id, company])),
    [data.companies],
  )
  const applications = data.applications.filter((application) => application.agentId === data.agentProfile.id)
  const applicationProjectIds = new Set(applications.map((application) => application.projectId))
  const pendingInvites = data.invitations.filter(
    (invitation) => invitation.agentId === data.agentProfile.id && invitation.status === 'pending',
  )
  const pendingInviteIds = new Set(pendingInvites.map((invite) => invite.projectId))

  const recommended = rankedProjects.filter(
    ({ project }) => !data.notInterestedProjectIds.includes(project.id),
  )
  const openProjects = data.projects.filter(
    (project) => project.open && !data.notInterestedProjectIds.includes(project.id),
  )
  const invitedProjects = data.projects.filter((project) => pendingInviteIds.has(project.id))

  const rows =
    view === 'recommended'
      ? recommended.map((entry) => ({ ...entry, invited: pendingInviteIds.has(entry.project.id) }))
      : view === 'open'
        ? openProjects.map((project) => ({ project, score: undefined, invited: pendingInviteIds.has(project.id) }))
        : invitedProjects.map((project) => ({ project, score: undefined, invited: true }))

  return (
    <div className="stack lg">
      <SectionHeader
        title="Project Marketplace"
        subtitle="Open projects, invited projects, and recommended matches."
      />
      <div className="tabs">
        <button className={joinClassNames('tab', view === 'recommended' && 'active')} onClick={() => setView('recommended')}>
          Recommended
        </button>
        <button className={joinClassNames('tab', view === 'open' && 'active')} onClick={() => setView('open')}>
          Open
        </button>
        <button className={joinClassNames('tab', view === 'invited' && 'active')} onClick={() => setView('invited')}>
          Invited
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No projects in this view"
          description="Adjust your profile details to unlock more high-quality matches."
        />
      ) : (
        <div className="stack">
          {rows.map(({ project, score, invited }) => (
            <ProjectCard
              key={project.id}
              applied={applicationProjectIds.has(project.id)}
              companyName={companyById[project.companyId]?.name ?? 'Unknown Company'}
              invited={invited}
              onApply={() => applyToProject(project.id)}
              onNotInterested={() => markProjectNotInterested(project.id)}
              project={project}
              score={score}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const ApplicationDashboardPage = () => {
  const { data } = useAppContext()
  const applications = data.applications.filter((application) => application.agentId === data.agentProfile.id)
  const projectById = useMemo(() => Object.fromEntries(data.projects.map((project) => [project.id, project])), [data.projects])

  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Apply to a verified project in the marketplace to start your hiring pipeline."
      />
    )
  }

  return (
    <div className="stack lg">
      <SectionHeader title="Application Dashboard" subtitle="Track every status from applied to decision." />
      <div className="pipeline-grid">
        {statusOrder.map((status) => (
          <Card key={status} title={status}>
            <div className="stack">
              {applications
                .filter((application) => application.status === status)
                .map((application) => (
                  <div key={application.id} className="pipeline-item">
                    <strong>{projectById[application.projectId]?.title ?? 'Project unavailable'}</strong>
                    <p>{formatDate(application.submittedAt)}</p>
                    <span className={joinClassNames('status-chip', statusBadgeClass[application.status])}>
                      {application.status}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export const ReputationPage = () => {
  const { data } = useAppContext()
  const applications = data.applications.filter((application) => application.agentId === data.agentProfile.id)
  const profileStrength = calculateProfileStrength(data.agentProfile, data.mediaAssets)
  const reputation = calculateReputationSnapshot(profileStrength, applications)

  const moduleEntries = Object.entries(data.futureModules).map(([name, enabled]) => ({
    name: name.replace(/Enabled$/, '').replace(/([A-Z])/g, ' $1'),
    enabled,
  }))

  return (
    <div className="stack lg">
      <SectionHeader
        title="Progress & Reputation"
        subtitle="Build trust with measurable quality, consistency, and execution."
      />
      <Card title="Reputation metrics">
        <ProgressBar label="Profile strength" value={reputation.profileStrength} />
        <ProgressBar label="Responsiveness" value={reputation.responsiveness} />
        <ProgressBar label="Reliability" value={reputation.reliability} />
        <Metric label="Completed projects (future)" value={reputation.completedProjects} />
      </Card>
      <Card title="Future module readiness" subtitle="Scalable architecture for roadmap features">
        <div className="row wrap gap">
          {moduleEntries.map((module) => (
            <span
              key={module.name}
              className={joinClassNames('status-chip', module.enabled ? 'status-success' : 'status-neutral')}
            >
              {module.name.trim()}: {module.enabled ? 'enabled' : 'planned'}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}

export const ResourceLibraryPage = () => {
  const { data } = useAppContext()
  const [category, setCategory] = useState<'All' | (typeof data.resources)[number]['category']>('All')

  const filtered =
    category === 'All' ? data.resources : data.resources.filter((resource) => resource.category === category)

  return (
    <div className="stack lg">
      <SectionHeader title="Resource Library" subtitle="Premium sales enablement material." />
      <Card rightSlot={<Badge>{filtered.length} resources</Badge>} title="Filter resources">
        <Field label="Category">
          <Select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
            <option value="All">All</option>
            <option value="Training">Training</option>
            <option value="Scripts">Scripts</option>
            <option value="Objection Handling">Objection Handling</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Performance">Performance</option>
          </Select>
        </Field>
      </Card>
      <div className="grid two-col">
        {filtered.map((resource) => (
          <Card
            key={resource.id}
            subtitle={`${resource.category} • ${resource.format}`}
            title={resource.title}
            rightSlot={<Badge>{resource.level}</Badge>}
          >
            <p>{resource.description}</p>
            <p className="muted">
              <strong>Duration:</strong> {resource.duration}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export const SettingsPage = () => {
  const { data, updateSettings, updateAgentProfile } = useAppContext()
  const [availability, setAvailability] = useState(data.agentProfile.availability)
  const [visibility, setVisibility] = useState(data.settings.visibility)
  const [availabilityStatus, setAvailabilityStatus] = useState(data.settings.availabilityStatus)
  const [notificationsEmail, setNotificationsEmail] = useState(data.settings.notificationsEmail)
  const [notificationsPush, setNotificationsPush] = useState(data.settings.notificationsPush)

  const save = () => {
    updateAgentProfile({ availability })
    updateSettings({
      visibility,
      availabilityStatus,
      notificationsEmail,
      notificationsPush,
    })
  }

  return (
    <div className="stack lg">
      <SectionHeader title="Settings & Profile" subtitle="Manage visibility, media, and notifications." />
      <Card title="Availability and visibility">
        <div className="grid two-col">
          <Field label="Availability details">
            <Input value={availability} onChange={(event) => setAvailability(event.target.value)} />
          </Field>
          <Field label="Availability status">
            <Select
              value={availabilityStatus}
              onChange={(event) =>
                setAvailabilityStatus(event.target.value as typeof availabilityStatus)
              }
            >
              <option value="open">Open</option>
              <option value="limited">Limited</option>
              <option value="unavailable">Unavailable</option>
            </Select>
          </Field>
          <Field label="Profile visibility">
            <Select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
              <option value="private">Private</option>
              <option value="invite-only">Invite only</option>
              <option value="public">Public</option>
            </Select>
          </Field>
          <Field label="Notification preferences">
            <label className="checkbox-row">
              <input
                checked={notificationsEmail}
                type="checkbox"
                onChange={(event) => setNotificationsEmail(event.target.checked)}
              />
              <span>Email notifications</span>
            </label>
            <label className="checkbox-row">
              <input
                checked={notificationsPush}
                type="checkbox"
                onChange={(event) => setNotificationsPush(event.target.checked)}
              />
              <span>In-app notifications</span>
            </label>
          </Field>
        </div>
        <div className="row end">
          <Button onClick={save}>Save settings</Button>
        </div>
      </Card>

      <Card title="Uploaded proof library">
        {data.mediaAssets.length === 0 ? (
          <p className="muted">No files uploaded yet.</p>
        ) : (
          <ul className="file-list">
            {data.mediaAssets.map((asset) => (
              <li key={asset.id}>
                <strong>{asset.fileName}</strong>
                <span>
                  {asset.mediaType} • {asset.fileSizeKb} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export const AdminOverviewPage = () => {
  const { data } = useAppContext()
  const openProjects = data.projects.filter((project) => project.open).length
  const pendingInvitations = data.invitations.filter((invitation) => invitation.status === 'pending').length
  const activeApplications = data.applications.filter(
    (application) => application.status !== 'Rejected' && application.status !== 'Accepted',
  ).length

  return (
    <div className="stack lg">
      <SectionHeader
        title="Company / Admin Dashboard"
        subtitle="Create projects, invite qualified agents, and manage pipeline stages."
      />
      <div className="grid four-col">
        <Metric label="Company profiles" value={data.companies.length} />
        <Metric label="Open projects" value={openProjects} />
        <Metric label="Pending invitations" value={pendingInvitations} />
        <Metric label="Active applications" value={activeApplications} />
      </div>
      <Card title="Quality control posture">
        <p>
          Every project in this workspace is marked as verified, preserving trust and reducing
          recruiting intransparency.
        </p>
      </Card>
    </div>
  )
}

export const AdminCompaniesPage = () => {
  const { data, createCompany } = useAppContext()
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('SaaS')
  const [size, setSize] = useState('')
  const [website, setWebsite] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !size.trim() || !website.trim()) return
    createCompany({ name: name.trim(), industry, size: size.trim(), website: website.trim() })
    setName('')
    setSize('')
    setWebsite('')
  }

  return (
    <div className="stack lg">
      <SectionHeader title="Company Profiles" subtitle="Create and maintain verified company entities." />
      <Card title="Create company profile">
        <form className="grid two-col" onSubmit={submit}>
          <Field label="Company name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Industry">
            <Select value={industry} onChange={(event) => setIndustry(event.target.value)}>
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Company size">
            <Input value={size} onChange={(event) => setSize(event.target.value)} placeholder="e.g. 50 employees" required />
          </Field>
          <Field label="Website">
            <Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://..." required />
          </Field>
          <div className="row end full">
            <Button type="submit">Create company</Button>
          </div>
        </form>
      </Card>
      <div className="grid two-col">
        {data.companies.map((company) => (
          <Card
            key={company.id}
            title={company.name}
            subtitle={`${company.industry} • ${company.size}`}
            rightSlot={<Badge>Quality {company.qualityScore}</Badge>}
          >
            <p>{company.website}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export const AdminProjectsPage = () => {
  const { data, createProject } = useAppContext()
  const [companyId, setCompanyId] = useState(data.companies[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [industry, setIndustry] = useState('SaaS')
  const [targetGroup, setTargetGroup] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [compensation, setCompensation] = useState('')
  const [requirements, setRequirements] = useState('')
  const [startDate, setStartDate] = useState('')
  const [workload, setWorkload] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!companyId || !title.trim() || !targetGroup.trim()) return
    createProject({
      companyId,
      title: title.trim(),
      industry,
      targetGroup: targetGroup.trim(),
      responsibilities: responsibilities
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      compensation: compensation.trim(),
      requirements: requirements
        .split(',')
        .map((line) => line.trim())
        .filter(Boolean),
      startDate: startDate || new Date().toISOString().slice(0, 10),
      workload: workload.trim(),
    })
    setTitle('')
    setTargetGroup('')
    setResponsibilities('')
    setCompensation('')
    setRequirements('')
    setStartDate('')
    setWorkload('')
  }

  const companyById = Object.fromEntries(data.companies.map((company) => [company.id, company.name]))

  return (
    <div className="stack lg">
      <SectionHeader title="Project Management" subtitle="Upload projects and define requirements clearly." />
      <Card title="Create project">
        <form className="stack" onSubmit={submit}>
          <div className="grid two-col">
            <Field label="Company">
              <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
                {data.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Industry">
              <Select value={industry} onChange={(event) => setIndustry(event.target.value)}>
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </Field>
            <Field label="Target group">
              <Input value={targetGroup} onChange={(event) => setTargetGroup(event.target.value)} required />
            </Field>
            <Field label="Compensation">
              <Input
                value={compensation}
                onChange={(event) => setCompensation(event.target.value)}
                placeholder="Base + commission, OTE..."
                required
              />
            </Field>
            <Field label="Workload">
              <Input value={workload} onChange={(event) => setWorkload(event.target.value)} required />
            </Field>
            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label="Requirements (comma-separated)">
              <Input
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                placeholder="German, 3+ years outbound"
                required
              />
            </Field>
            <Field label="Responsibilities (one per line)">
              <TextArea
                rows={4}
                value={responsibilities}
                onChange={(event) => setResponsibilities(event.target.value)}
                required
              />
            </Field>
          </div>
          <div className="row end">
            <Button type="submit">Publish verified project</Button>
          </div>
        </form>
      </Card>

      <div className="stack">
        {data.projects.map((project) => (
          <Card
            key={project.id}
            title={project.title}
            subtitle={`${companyById[project.companyId] ?? 'Unknown'} • ${project.industry}`}
            rightSlot={<Badge>{project.open ? 'Open' : 'Closed'}</Badge>}
          >
            <p className="muted">
              <strong>Compensation:</strong> {project.compensation}
            </p>
            <p className="muted">
              <strong>Workload:</strong> {project.workload}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export const AdminAgentsPage = () => {
  const { data, sendInvitation } = useAppContext()
  const [industry, setIndustry] = useState('All')
  const [language, setLanguage] = useState('All')
  const [minimumStrength, setMinimumStrength] = useState(60)
  const [projectId, setProjectId] = useState(data.projects[0]?.id ?? '')

  const filteredAgents = data.agentDirectory.filter((agent) => {
    const industryMatch = industry === 'All' || agent.industries.includes(industry)
    const languageMatch = language === 'All' || agent.languages.includes(language)
    const strengthMatch = agent.profileStrength >= minimumStrength
    return industryMatch && languageMatch && strengthMatch
  })

  const availableLanguages = Array.from(
    new Set(data.agentDirectory.flatMap((agent) => agent.languages)),
  ).sort()

  const invitedPairs = new Set(data.invitations.map((invitation) => `${invitation.agentId}:${invitation.projectId}`))

  return (
    <div className="stack lg">
      <SectionHeader title="Agent Directory & Filters" subtitle="Find qualified profiles and send invitations." />

      <Card title="Filter agents">
        <div className="grid three-col">
          <Field label="Industry">
            <Select value={industry} onChange={(event) => setIndustry(event.target.value)}>
              <option value="All">All industries</option>
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Language">
            <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="All">All languages</option>
              {availableLanguages.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Minimum profile strength: ${minimumStrength}`}>
            <Input
              max={100}
              min={0}
              type="range"
              value={minimumStrength}
              onChange={(event) => setMinimumStrength(Number(event.target.value))}
            />
          </Field>
        </div>
      </Card>

      <Card title="Invitation target project">
        <Field label="Project">
          <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <div className="grid two-col">
        {filteredAgents.map((agent) => {
          const pairKey = `${agent.id}:${projectId}`
          const alreadyInvited = projectId ? invitedPairs.has(pairKey) : false

          return (
            <Card
              key={agent.id}
              title={agent.fullName}
              subtitle={`${agent.seniority} • ${agent.industries.join(', ')}`}
              rightSlot={<Badge>{agent.profileStrength}% strength</Badge>}
            >
              <p className="muted">Languages: {agent.languages.join(', ')}</p>
              <Button
                disabled={!projectId || alreadyInvited}
                onClick={() => {
                  if (!projectId) return
                  sendInvitation(agent.id, projectId)
                }}
              >
                {alreadyInvited ? 'Invitation sent' : 'Send invitation'}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export const AdminPipelinePage = () => {
  const { data, updateApplicationStatus } = useAppContext()
  const projectById = Object.fromEntries(data.projects.map((project) => [project.id, project]))
  const agentById = Object.fromEntries(data.agentDirectory.map((agent) => [agent.id, agent]))

  if (data.applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="As soon as agents apply, this hiring pipeline will update in real time."
      />
    )
  }

  return (
    <div className="stack lg">
      <SectionHeader title="Hiring Pipeline" subtitle="Review applications and move candidates across stages." />
      <div className="stack">
        {data.applications.map((application) => (
          <Card
            key={application.id}
            title={projectById[application.projectId]?.title ?? 'Unknown project'}
            subtitle={`Agent: ${agentById[application.agentId]?.fullName ?? 'Unknown agent'}`}
            rightSlot={
              <span className={joinClassNames('status-chip', statusBadgeClass[application.status])}>
                {application.status}
              </span>
            }
          >
            <p className="muted">Submitted {formatDate(application.submittedAt)}</p>
            <Field label="Update stage">
              <Select
                value={application.status}
                onChange={(event) =>
                  updateApplicationStatus(application.id, event.target.value as ApplicationStatus)
                }
              >
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>
        ))}
      </div>
    </div>
  )
}

