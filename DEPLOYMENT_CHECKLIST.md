# ReviewAI — Production Deployment Checklist
### Option A: Vercel (Managed Frontend Platform)

---

## Part 1 — Push Your Local Project to GitHub

### Prerequisites
- [Git](https://git-scm.com/downloads) installed (`git --version` to verify)
- A [GitHub](https://github.com) account

### Steps

```bash
# 1. Navigate to the project directory
cd "c:\Users\Hitansh\Desktop\Downloads\reviewai\reviewai"

# 2. Initialise a new Git repository
git init

# 3. Stage all files (the .gitignore will automatically exclude .env, .env.local, node_modules, .next)
git add .

# 4. Confirm what will be committed — verify .env and .env.local are NOT in the list
git status

# 5. Create the first commit
git commit -m "feat: initial commit — ReviewAI production build"

# 6. Rename branch to main (GitHub default)
git branch -M main
```

### Create the GitHub Repository

1. Go to **https://github.com/new**
2. Repository name: `reviewai` (or your preferred name)
3. Visibility: **Private** ← important, you have real API keys in history if you forgot to gitignore
4. Do **NOT** initialise with README, .gitignore, or license (you already have them)
5. Click **Create repository**

### Push to GitHub

```bash
# 7. Add GitHub as the remote origin (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/reviewai.git

# 8. Push to GitHub
git push -u origin main
```

> **Verify**: Visit `https://github.com/YOUR_USERNAME/reviewai` and confirm:
> - `.env` and `.env.local` are **NOT** listed in the file tree
> - `.gitignore` **IS** visible in the file tree
> - `.env.example` IS committed but contains only placeholders

---

## Part 2 — Connect GitHub Repo to Vercel

### Steps

1. Go to **https://vercel.com/new**
2. Sign in with GitHub (authorise Vercel to access your repos)
3. Click **"Import Git Repository"** → find `reviewai` → click **Import**
4. In the **Configure Project** screen:
   - **Framework Preset**: `Next.js` ← Vercel should auto-detect this
   - **Root Directory**: Leave as `./` (or set to `reviewai` if you pushed from the parent folder)
   - **Build Command**: `npm run build` ← already in `package.json`
   - **Output Directory**: `.next` ← Vercel sets this automatically for Next.js
   - **Install Command**: `npm install` ← `postinstall` will auto-run `prisma generate`
5. **Do NOT click Deploy yet** — scroll down to **Environment Variables** first

> ⚠️ **Add ALL environment variables (Part 3 below) BEFORE clicking Deploy**, or the first build will fail.

6. After adding all variables, click **Deploy**
7. Wait ~2–3 minutes for the build to complete
8. Visit your deployment URL (e.g., `https://reviewai-xyz.vercel.app`) to verify

### Post-Deploy: Set Production URL Variables

After the first deploy, Vercel assigns your production URL. Go back to:
**Vercel Dashboard → Your Project → Settings → Environment Variables**

Update these two variables with your real Vercel URL:

| Variable | Update To |
|----------|-----------|
| `NEXT_PUBLIC_APP_URL` | `https://reviewai-xyz.vercel.app` |
| `GOOGLE_REDIRECT_URI` | `https://reviewai-xyz.vercel.app/api/auth/google/callback` |

Then trigger a **Redeploy** from the Vercel dashboard.

---

## Part 3 — Environment Variables Master Inventory

Copy-paste each key into **Vercel Dashboard → Settings → Environment Variables**.
Set **Environment** to `Production, Preview, Development` for all unless noted.

---

### 🤖 AI / LLM

| Key | Where to get it | Notes |
|-----|----------------|-------|
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) | Server-only |
| `HF_API_KEY` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | Voice sentiment analysis |

---

### 🔥 Firebase (Client-Side — Public)

> These are prefixed `NEXT_PUBLIC_` and are safe to expose to the browser.

| Key | Where to get it |
|-----|----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your apps → SDK config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same location |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same location |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same location |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same location |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same location |

---

### 🔐 Firebase Admin (Server-Side — Secret)

> **Critical formatting note for `FIREBASE_ADMIN_PRIVATE_KEY`:**
> Vercel's env console does NOT preserve real newlines.
> Paste the key as a **single line** with literal `\n` characters (backslash-n, not actual newlines).
> Wrap the entire value in double quotes.
>
> **Correct format:**
> ```
> "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
> ```
> The code in `firebaseStorageAdmin.ts` already handles this with `.replace(/\\n/g, '\n')`.

| Key | Where to get it |
|-----|----------------|
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Console → Project Settings → Service accounts |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Console → Project Settings → Service accounts → Generate new private key |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Same JSON file — copy `private_key` field value, format as single line |

---

### 🔑 Google Business Profile API (OAuth 2.0)

> After setting `GOOGLE_REDIRECT_URI` to your Vercel URL, also add it to the **Authorised redirect URIs** list in Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client.

| Key | Where to get it | Production Value |
|-----|----------------|-----------------|
| `GOOGLE_CLIENT_ID` | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials | Same value |
| `GOOGLE_CLIENT_SECRET` | Same location | Same value |
| `GOOGLE_REDIRECT_URI` | — | `https://YOUR-APP.vercel.app/api/auth/google/callback` |

---

### 🗄️ PostgreSQL / Neon Database

| Key | Where to get it | Notes |
|-----|----------------|-------|
| `DATABASE_URL` | [console.neon.tech](https://console.neon.tech) → your project → Connection string | Use the **pooled** connection string (includes `-pooler`) for Vercel serverless |

> **After deploy**: Run `npx prisma db push` or `npx prisma migrate deploy` from your local machine pointing at the production `DATABASE_URL` to ensure schema is synced.

---

### 🔐 Clerk Authentication

| Key | Where to get it |
|-----|----------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) → your app → API Keys |
| `CLERK_SECRET_KEY` | Same location |

> After deploy, go to Clerk Dashboard → your app → **Domains** and add your Vercel production URL as an allowed origin.

---

### 📧 Resend (Email — Weekly Reports)

| Key | Value | Notes |
|-----|-------|-------|
| `RESEND_API_KEY` | From [resend.com/api-keys](https://resend.com/api-keys) | Use a production key, not the test key |
| `RESEND_FROM_EMAIL` | e.g. `reports@yourdomain.com` | Must be a verified domain in Resend for production |

---

### ⏱️ Cron Job Security

| Key | Value | Notes |
|-----|-------|-------|
| `CRON_SECRET` | Random 32-char hex string | Generate: `openssl rand -hex 32` |

> Vercel automatically injects `CRON_SECRET` as the `Authorization: Bearer <secret>` header when it triggers `/api/cron/weekly-reports`. Your `vercel.json` is already configured for `0 0 * * 1` (every Monday midnight UTC).

---

### 🌐 App URL

| Key | Production Value | Notes |
|-----|-----------------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` | No trailing slash. Update AFTER first deploy. |

---

## Part 4 — Post-Deploy Smoke Tests

After the deploy goes live, verify these endpoints:

```
✅ https://YOUR-APP.vercel.app/                    → Landing page loads
✅ https://YOUR-APP.vercel.app/sign-in             → Clerk auth page loads
✅ https://YOUR-APP.vercel.app/dashboard           → Redirects to sign-in (auth guard works)
✅ https://YOUR-APP.vercel.app/api/business?id=xx  → Returns JSON (database live)
✅ https://YOUR-APP.vercel.app/api/cron/weekly-reports?dry=true
   (with header: Authorization: Bearer <CRON_SECRET>)
   → Returns { success: true, dryRun: true, ... } (cron pipeline live)
```

---

## Quick Reference — All 21 Environment Keys

```
GROQ_API_KEY
HF_API_KEY
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
NEXT_PUBLIC_APP_URL
DATABASE_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
CRON_SECRET
```
