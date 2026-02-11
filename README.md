# Sales Guild - Professional Sales Talent Platform

Sales Guild is a premium career infrastructure for telesales agents, call center professionals,
and high-performance sales reps. The platform solves recruiting chaos and intransparency by
combining verified projects, strong profile qualification, and structured hiring workflows.

## Product Coverage

### Agent side

- Landing page with value proposition and trust narrative
- Sign up/login (Email, Google, LinkedIn)
- Conversational multi-step sales profile builder
- Media and proof upload (photo, intro video, voice sample, CV, certificates, references, PDFs, stats)
- AI qualification summary with seniority and positioning
- Marketplace views: open, invited, recommended projects
- One-click application flow
- Application dashboard with status pipeline
- Reputation and progress metrics
- Resource library for scripts, training, onboarding, and performance
- Settings and profile controls

### Company/Admin side

- Company profile creation
- Project upload and publishing
- Agent filtering and invitation workflow
- Hiring pipeline management with status transitions

## Design System

- Header authority color: `#1B2B4B`
- CTA/highlight color: `#C9A227`
- Background: `#F4F3F0`
- Typography:
  - Body: DM Sans
  - Headings: Playfair Display

## Architecture

- React + TypeScript + Vite
- `react-router-dom` for route-based flows
- Central typed app state via React context
- Utility modules for profile scoring, AI summary generation, and project matching
- Modular page and component organization ready for future features:
  - ratings
  - payroll integrations
  - contracts
  - performance tracking
  - AI call analysis
  - training levels

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```
