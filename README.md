# ReviewAI — Instant Google Reviews

> Customer scans QR → picks stars → AI writes review → posts to Google. Done in 30 seconds.

## Stack
- **Frontend**: Next.js 15, Tailwind CSS, ShadcnUI
- **AI**: Claude (Anthropic) via `@anthropic-ai/sdk`
- **Auth & DB**: Firebase Auth + Firestore
- **Reviews**: Google Business Profile API (Phase 2)
- **QR**: `qrcode` npm package

## Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   └── register/page.tsx       # Register page
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar layout (auth-protected)
│   │   └── dashboard/
│   │       ├── page.tsx            # Overview + stats
│   │       ├── reviews/page.tsx    # Review history
│   │       ├── qr-generator/page.tsx  # QR code maker
│   │       ├── analytics/page.tsx  # Charts + trends
│   │       └── settings/page.tsx   # Business profile + Google connect
│   ├── review/[businessId]/page.tsx  # Customer-facing review flow
│   ├── api/
│   │   ├── generate-review/route.ts  # Claude API → review text
│   │   ├── post-review/route.ts      # Google Business API (Phase 2 stub)
│   │   └── business/route.ts         # Business info endpoint
│   ├── layout.tsx                  # Root layout + AuthProvider
│   └── page.tsx                    # Landing page
├── lib/
│   ├── firebase.ts                 # Firebase client init
│   ├── api.ts                      # Axios client (auto-injects Firebase token)
│   └── utils.ts                    # cn(), formatDate(), getToneFromRating()
├── hooks/
│   └── useAuth.ts                  # Auth hook
├── context/
│   └── AuthProvider.tsx            # Firebase auth state context
├── types/
│   └── index.ts                    # TypeScript types (User, Business, Review, etc.)
└── styles/
    └── globals.css                 # Tailwind + CSS variables (ShadcnUI)
```

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY, Firebase keys

# 3. Run dev server
npm run dev
```

## Build Phases

| Phase | Weeks | What gets built |
|-------|-------|-----------------|
| 1 — MVP | 1–2 | Star UI + Claude AI review generation |
| 2 — Google | 3–4 | Google Business Profile OAuth + auto-post |
| 3 — Dashboard | 5–6 | Analytics, QR generator, customization, paid plans |

## Key API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/generate-review` | POST | Send rating + business info → get AI review |
| `/api/post-review` | POST | Post review to Google Business Profile |
| `/api/business?id=` | GET | Fetch public business info for customer page |

## Customer Flow (Public URL)
`/review/[businessId]` — No login required. Customer:
1. Picks 1–5 stars
2. AI generates review matching sentiment
3. Edits if wanted
4. Taps "Post to Google"
