# Codepik

An AI-powered, optimization-first coding IDE built with Next.js, Convex, and Opik.

## ✨ Features

- 🤖 **AI Code Assistant** - Chat with AI to generate, explain, and debug code
- ⚡ **Smart Code Suggestions** - Real-time AI-powered code completions
- ✏️ **Quick Edit** - Select code and transform it with natural language (`Cmd/Ctrl+K`)
- 📊 **Analytics Dashboard** - Track AI operations and performance with Opik
- 🔄 **Real-time Collaboration** - Powered by Convex
- 🎨 **Modern Code Editor** - Built with CodeMirror 6

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Codepik-1

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure your environment variables (see GETTING_STARTED.md)
# Then start the development servers:

# Terminal 1: Convex backend
npx convex dev

# Terminal 2: Inngest background jobs
npx --ignore-scripts=false inngest-cli@latest dev

# Terminal 3: Next.js frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 📚 Documentation

- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Complete setup guide with detailed instructions
- **[OPIK_DASHBOARD_GUIDE.md](./OPIK_DASHBOARD_GUIDE.md)** - Analytics dashboard features and benefits
- **[OPIK_SETUP.md](./OPIK_SETUP.md)** - Opik analytics integration guide
- **[OPIK_TRACKING_WALKTHROUGH.md](./OPIK_TRACKING_WALKTHROUGH.md)** - How AI tracking works
- **[AI_API_KEYS_SETUP_GUIDE.md](./AI_API_KEYS_SETUP_GUIDE.md)** - AI provider configuration

## 🔑 Required Environment Variables

Minimum required configuration:

```env
# Convex (Database)
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
POLARIS_CONVEX_INTERNAL_KEY=your_key

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Provider (choose one)
OPENROUTER_API_KEY=sk-or-v1-...  # Recommended
# OR
OPENAI_API_KEY=sk-proj-...
```

See [GETTING_STARTED.md](./GETTING_STARTED.md) for complete configuration details.

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Database**: Convex (Real-time)
- **Authentication**: Clerk
- **Editor**: CodeMirror 6
- **AI Integration**: OpenAI, Anthropic, Google AI (via OpenRouter)
- **Background Jobs**: Inngest
- **Analytics**: Opik
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI

## 🎯 Key Features Explained

### AI Chat Assistant
Open any project and click the chat icon. Ask the AI to:
- Generate new code
- Explain existing code
- Debug issues
- Refactor code
- Answer programming questions

### Code Suggestions
As you type, the AI provides intelligent code completions. Press `Tab` to accept.

### Quick Edit
1. Select any code in the editor
2. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
3. Describe what you want to change
4. AI transforms your code instantly

### Analytics Dashboard
Track all AI operations including:
- Code suggestions generated and accepted
- Quick edits performed
- Chat interactions
- Performance metrics
- Cost analysis

## 🐛 Troubleshooting

### Common Issues

**"Convex deployment not found"**
- Run `npx convex dev` first
- Check your `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`

**"OpenAI API key invalid"**
- Verify your API key is correct
- Ensure you have billing set up with your AI provider
- For OpenRouter, check https://openrouter.ai/keys

**"Port already in use"**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

See [GETTING_STARTED.md](./GETTING_STARTED.md#troubleshooting) for more solutions.

## 📖 Project Structure

```
Codepik-1/
├── src/
│   ├── app/                 # Next.js pages
│   ├── features/           # Feature modules
│   │   ├── editor/        # Code editor
│   │   ├── conversations/ # AI chat
│   │   ├── ai/           # AI services
│   │   └── analytics/    # Dashboard
│   ├── lib/               # Utilities
│   └── components/        # UI components
├── convex/                # Backend functions
└── public/                # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Convex](https://convex.dev/)
- [Opik](https://www.comet.com/opik)
- [Clerk](https://clerk.com/)
- [CodeMirror](https://codemirror.net/)
- [Inngest](https://inngest.com/)

---

**Need help?** Check out [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup instructions.