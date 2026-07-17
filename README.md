# Velvet — Premium Nail Studio Budapest

A multilingual (EN/RU/HU) booking & management platform for Velvet Manicure Studio.

## Features

- **Client booking** with real-time slot availability and overlap prevention
- **Admin panel** (protected) for managing bookings, procedures, and contacts
- **Email & Telegram** notifications on new bookings
- **Supabase** integration for production database (JSON file fallback for local dev)
- Built with React 19, Express, Vite, Luxon, and Framer Motion

## Setup

### Prerequisites

- Node.js ≥ 20
- A `.env` file — copy `.env.example` and fill in the values

### Required environment variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | **Required.** Server will refuse to start without it. Generate: `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | **Required.** Password for the `/admin` panel. |

See `.env.example` for the full list (Supabase, SMTP, Telegram, etc.).

### Run locally

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
npm start
```
