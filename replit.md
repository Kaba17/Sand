# Sanad - Claims Management System

A Minimum Viable Product (MVP) for managing compensation claims for flight and delivery services.

## Architecture
- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express, Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: Replit Auth
- **AI**: OpenAI GPT-4o via Replit AI Integrations

## Features
- **Public**: Submit claims, track status (timeline), AI agent chat
- **Admin**: Dashboard, claim management, status updates, settlements
- **RTL Support**: Full Arabic interface
- **AI Agent**: Specialized flight claims representative with streaming chat

## AI Agent (Sanad Agent)
The AI agent acts as a professional flight claims representative:
- Handles flight disruptions only (delays, cancellations, denied boarding, lost baggage)
- Collects case information, analyzes eligibility, and drafts claim communications
- Uses SSE streaming for real-time responses
- Routes: `/api/agent/conversations` (CRUD), `/api/agent/conversations/:id/messages` (streaming)

## Database Tables
- `claims`: Main claims data
- `attachments`: File uploads linked to claims
- `timeline_events`: Status change history
- `communications`: Email/SMS/phone logs
- `settlements`: Compensation records
- `conversations`: AI chat sessions
- `messages`: Chat messages (user/assistant)

## Recent Changes
- Added AI-powered claims agent with OpenAI integration
- Created chat UI with modern design, RTL support, and streaming messages
- Added agent navigation link with Bot icon
- Implemented error handling and input validation for agent routes
