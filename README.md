# 🎵 Producer Copilot

**AI-powered audio analysis tool for music producers**

Get expert mixing feedback, compare your tracks with professional references, and improve your production skills with AI-driven insights.

---

## ✨ Features

- **🎧 Audio Analysis** - Upload your track and get detailed feedback on production quality, mix balance, frequency spectrum, and dynamics
- **🔄 Reference Track Comparison** - Compare your mix with a professional reference and get specific recommendations
- **💬 AI Chat Assistant** - Ask questions about mixing, mastering, music theory, DAW workflows, and production techniques
- **📊 Usage Tracking** - Flexible tier system with free and paid plans
- **🎨 Studio-Friendly UI** - Dark theme optimized for music production workflows

---

## 🚀 Quick Start

### For Users

1. Visit the live app (deployment URL coming soon)
2. Sign in with your account
3. Start a new session
4. Upload your track (MP3, WAV, or M4A)
5. Optionally upload a reference track for comparison
6. Get instant AI-powered feedback

### For Developers

**Prerequisites:**
- Node.js 22+
- pnpm
- MySQL/TiDB database
- Manus account (for LLM API and storage)

**Installation:**

```bash
# Clone the repository
git clone https://github.com/mrvonkalus/producer-copilot.git
cd producer-copilot

# Install dependencies
pnpm install

# Set up environment variables (see documentation)

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

---

## 📖 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[Handoff Documentation](HANDOFF_TO_KIMI_CURSOR.md)** - Complete technical reference
- **[Package Manifest](PACKAGE_MANIFEST.md)** - Overview of all deliverables
- **[V2 Roadmap](V2_PLAYBOOK.md)** - Future features and enhancements
- **[Architecture](PRODUCTION_ARCHITECTURE.md)** - System design and data flow

---

## 💰 Pricing

### Free Tier
- 1 audio analysis (lifetime)
- Unlimited chat (no audio)
- 30-day conversation history

### Pro Tier - $19/month
- 10 audio analyses per month
- Unlimited chat
- Unlimited history
- Reference track comparison

### Pro Plus - $39/month
- 30 audio analyses per month
- Everything in Pro
- Priority support

*Pricing is configurable in `shared/pricing-config.ts`*

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + Tailwind 4 + tRPC
- **Backend**: Express 4 + tRPC 11 + Node.js
- **Database**: MySQL/TiDB (via Drizzle ORM)
- **Storage**: S3 (via Manus)
- **Auth**: Manus OAuth
- **LLM**: Manus LLM API (GPT-4 with audio capabilities)
- **Payments**: Stripe (to be integrated)

---

## 🗂️ Project Structure

```
producer-copilot/
├── client/               # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   └── lib/         # tRPC client setup
├── server/              # Express backend
│   ├── _core/          # Framework plumbing
│   ├── routers.ts      # tRPC procedures
│   └── db.ts           # Database helpers
├── drizzle/            # Database schema & migrations
├── shared/             # Shared types & config
│   └── pricing-config.ts  # Pricing tiers (change here!)
└── docs/               # Documentation
```

---

## 🚧 Current Status

**✅ Complete:**
- Core audio analysis functionality
- Reference track comparison
- Chat interface with history
- Usage tracking and limits
- Flexible pricing system
- Database schema

**🚧 In Progress:**
- Stripe payment integration
- Upgrade modal UI
- Landing page

**📋 Planned (V2):**
- MIDI generation
- Stem separation
- Batch analysis
- Team collaboration
- Audio playback in chat

---

## 🤝 Contributing

This is currently a private project. If you're interested in contributing, please reach out.

---

## 📄 License

Proprietary - All rights reserved

---

## 🙏 Acknowledgments

- Built with [Manus](https://manus.im) platform
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

---

## 📞 Support

For questions or issues:
- Check the [documentation](HANDOFF_TO_KIMI_CURSOR.md)
- Review the [task list](todo.md)
- Open an issue on GitHub

---

**Built with ❤️ for music producers worldwide**
