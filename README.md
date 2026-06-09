<div align="center">

<img src="public/logo.png" alt="SyndiMatch" width="72" />

# SyndiMatch

### Find your perfect co-founder with AI

**SyndiMatch uses Claude AI to match startup founders by skills, work style, and vision — not just keywords**

[![🌐 Live](https://img.shields.io/badge/🌐_Live-syndimatch.online-6366f1?style=for-the-badge&logoColor=white)](https://www.syndimatch.online/)
[![⭐ Stars](https://img.shields.io/github/stars/aiagent2046-coder/ai-co-founder-matching?style=for-the-badge&color=yellow&logo=github)](https://github.com/aiagent2046-coder/ai-co-founder-matching/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Claude AI](https://img.shields.io/badge/Claude_AI-d97706?style=for-the-badge)](https://anthropic.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

![SyndiMatch Dashboard](https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/b332ad41-0a34-409f-9196-3f782fd69aba.png)

---

## The problem

Finding the right co-founder is one of the hardest parts of building a startup. Most founders rely on random networking events or LinkedIn cold outreach — which is slow, noisy, and mostly luck.

**SyndiMatch fixes this.**

---

## How it works

```
1. Create your founder profile
   Tell us your skills, domain expertise, working style, and startup vision

2. AI builds your compatibility model
   Claude analyzes your profile and constructs a multi-dimensional vector of founder traits

3. Get matched
   Our algorithm surfaces founders who complement — not duplicate — you

4. Connect and build
   Real-time chat, no middlemen, no gatekeeping
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **AI Profile Analysis** | Claude builds a semantic model of your strengths and gaps |
| 🔍 **Complementary Matching** | Pairs you with founders who cover your blind spots |
| 💬 **Real-time Chat** | Instant messaging powered by Supabase Realtime |
| ⚡ **Fast Recommendations** | Upstash Redis keeps responses under 100ms |
| 🔐 **Secure Auth** | Supabase Auth with OAuth (GitHub, Google) |
| 📊 **Analytics** | PostHog for product insights and funnel tracking |

---

## 🛠 Tech Stack

```
Frontend    Next.js 16 (App Router) + TypeScript + Tailwind CSS
Backend     Next.js API Routes + Server Actions
Database    Supabase (PostgreSQL) — profiles, matches, messages
Cache       Upstash Redis — session management, rate limiting
AI Core     Anthropic Claude — matching engine + analysis
ML Models   Replicate API — additional AI capabilities
Auth        Supabase Auth (OAuth + magic link)
Deploy      Vercel — edge network, preview deployments
Analytics   PostHog — events, funnels, session recording
```

---

## 🏗 Architecture

```
ai-co-founder-matching/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Auth pages (login, signup)
│   ├── (dashboard)/      # Protected app routes
│   └── api/              # API endpoints
├── components/           # Shared React components
├── lib/                  # Utilities, AI clients, DB helpers
├── syndi-agents/         # AI matching agents
├── supabase/             # DB migrations & seed data
└── public/               # Static assets
```

---

## ⚡ Quick Start

**Prerequisites:** Node.js 18+, accounts on [Supabase](https://supabase.com), [Upstash](https://upstash.com), [Anthropic](https://anthropic.com)

```bash
git clone https://github.com/aiagent2046-coder/ai-co-founder-matching.git
cd ai-co-founder-matching
npm install
```

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key
REPLICATE_API_KEY=your_replicate_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
# → http://localhost:3000
```

---

## 🚢 Deploy to Vercel

The repo includes a ready `vercel.json`. One command:

```bash
vercel --prod
```

Or import directly on [vercel.com](https://vercel.com/new) — it auto-detects Next.js and deploys in ~2 minutes.

---

## 🗺 Roadmap

- [ ] Founder compatibility score visualization
- [ ] Video intro cards
- [ ] Startup idea board (post ideas, find co-founder for them)
- [ ] Verified GitHub/LinkedIn profile integration
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions welcome! Good first issues:

- 🐛 Bug fixes and edge case handling
- 💡 Improvements to matching algorithm prompts
- 🌍 i18n (EN/RU/other languages)
- ⚡ Performance optimizations

Open an [Issue](https://github.com/aiagent2046-coder/ai-co-founder-matching/issues) or submit a PR.

---

## 📄 License

MIT © [SyndiMatch](https://www.syndimatch.online/)

---

<div align="center">

If SyndiMatch helped you — drop a ⭐ star. It helps others discover the project.

[🌐 Live Demo](https://www.syndimatch.online/) · [🐛 Report Bug](https://github.com/aiagent2046-coder/ai-co-founder-matching/issues) · [💡 Request Feature](https://github.com/aiagent2046-coder/ai-co-founder-matching/issues)

</div>
