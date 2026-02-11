import { Navigate, Route, Routes } from 'react-router-dom'
import {
  AdminAgentsPage,
  AdminCompaniesPage,
  AdminLayout,
  AdminOverviewPage,
  AdminPipelinePage,
  AdminProjectsPage,
  AgentLayout,
  AgentOverviewPage,
  AISummaryPage,
  ApplicationDashboardPage,
  AuthPage,
  LandingPage,
  MediaUploadPage,
  OnboardingProfilePage,
  ProjectMarketplacePage,
  ReputationPage,
  ResourceLibraryPage,
  SettingsPage,
} from './pages'

const App = () => (
  <Routes>
    <Route element={<LandingPage />} path="/" />
    <Route element={<AuthPage />} path="/auth" />
    <Route element={<OnboardingProfilePage />} path="/onboarding/profile" />
    <Route element={<MediaUploadPage />} path="/onboarding/media" />
    <Route element={<AISummaryPage />} path="/onboarding/summary" />

    <Route element={<AgentLayout />} path="/agent">
      <Route element={<AgentOverviewPage />} index />
      <Route element={<ProjectMarketplacePage />} path="marketplace" />
      <Route element={<ApplicationDashboardPage />} path="applications" />
      <Route element={<ReputationPage />} path="reputation" />
      <Route element={<ResourceLibraryPage />} path="resources" />
      <Route element={<SettingsPage />} path="settings" />
    </Route>

    <Route element={<AdminLayout />} path="/admin">
      <Route element={<AdminOverviewPage />} index />
      <Route element={<AdminCompaniesPage />} path="companies" />
      <Route element={<AdminProjectsPage />} path="projects" />
      <Route element={<AdminAgentsPage />} path="agents" />
      <Route element={<AdminPipelinePage />} path="pipeline" />
    </Route>

    <Route element={<Navigate replace to="/" />} path="*" />
  </Routes>
)

export default App
