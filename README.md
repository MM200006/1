# TimeTrack - Zeiterfassung & Abrechnung

Zeiterfassungs- und Abrechnungssoftware für Call-Center, gebaut mit Next.js, Prisma und PostgreSQL.

## Features

- **Benutzer-System**: Admin, Teamleiter, Agent Rollen
- **Projekte**: Verwaltung mit Kundenzuordnung und Stundensätzen
- **Zeiterfassung**: Start/Stop Timer, Pause, manuelle Einträge
- **Admin Dashboard**: Übersicht, Filter, Zeitfreigabe, Bearbeitung
- **Reports**: CSV/Excel Export, Zusammenfassung nach Projekt
- **Audit Log**: Lückenlose Protokollierung aller Änderungen
- **Live-Status**: Echtzeit-Übersicht wer gerade arbeitet
- **Responsive**: Optimiert für Desktop und Mobile

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Auth**: NextAuth.js (JWT)

## Setup

### Voraussetzungen

- Node.js 18+
- PostgreSQL Datenbank

### Installation

```bash
# Dependencies installieren
npm install

# .env Datei konfigurieren
cp .env.example .env
# DATABASE_URL und NEXTAUTH_SECRET in .env anpassen

# Datenbank erstellen und migrieren
npm run db:push

# Testdaten laden
npm run db:seed

# Entwicklungsserver starten
npm run dev
```

### Login-Daten (nach Seed)

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@timetrack.de | admin123 |
| Teamleiter | teamleiter@timetrack.de | leader123 |
| Agent | agent1@timetrack.de | agent123 |
| Agent | agent2@timetrack.de | agent123 |
| Agent | agent3@timetrack.de | agent123 |

## Deployment

### Vercel + Supabase

1. PostgreSQL Datenbank bei Supabase erstellen
2. Projekt auf Vercel deployen
3. Umgebungsvariablen setzen:
   - `DATABASE_URL` (Supabase Connection String)
   - `NEXTAUTH_SECRET` (sicherer Zufallswert)
   - `NEXTAUTH_URL` (Produktions-URL)
4. `npm run db:push` ausführen
5. `npm run db:seed` ausführen

## Sicherheitshinweise

- Agenten können Zeiten NICHT nachträglich ändern
- Nur Admins können Zeiteinträge bearbeiten/löschen
- Jede Änderung wird im Audit Log protokolliert
- Minimale Session-Dauer: 1 Minute
- Passwörter werden mit bcrypt gehasht
- JWT-basierte Session-Verwaltung
