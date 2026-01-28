# Codepik Project Startup Guide

Welcome to **Codepik** - an optimization-first coding IDE built with Opik. This guide will help you get the project up and running on your local machine.

## 📋 Prerequisites

Before starting, make sure you have the following installed:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
# If you haven't cloned the repository yet
git clone <repository-url>
cd Codepik-1

# Install dependencies
npm install
```

### 2. Environment Setup

The project requires several environment variables to be configured. You'll need to set up the following services:

#### Required Environment Files

1. **`.env.local`** - Main environment configuration (already exists)
2. **`.env.sentry-build-plugin`** - Sentry configuration for build process (already exists)

#### Key Services to Configure

**Convex Database:**
- The project uses Convex as the backend database
- Current deployment: `dev:cautious-wolf-622`
- Convex URL: `https://cautious-wolf-622.convex.cloud`

**Auth0 Authentication:**
- Domain: `dev-tmbxg3k1dp3a0fsf.us.auth0.com`
- The authentication credentials are already configured in `.env.local`
- Auth0 handles user authentication, login, and logout flows

**Firecrawl API:**
- Used for web scraping functionality
- API key is already configured

**Sentry Monitoring:**
- Error tracking and performance monitoring
- Tokens are already configured

### 3. Start the Development Server

```bash
# Start the Next.js development server
npm run dev
```

The application will be available at: **http://localhost:3000**

### 4. Start Convex Backend (if needed)

If you need to work with the Convex backend locally:

```bash
# Install Convex CLI globally (if not already installed)
npm install -g convex

# Start Convex development server
npx convex dev
```

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## 🏗️ Project Architecture

### Tech Stack

- **Frontend:** Next.js 16.1.1 with React 19.2.3
- **Styling:** Tailwind CSS 4.0
- **UI Components:** Radix UI primitives with shadcn/ui
- **Backend:** Convex (serverless backend)
- **Authentication:** Auth0
- **AI Integration:** Anthropic & Google AI SDK
- **Code Editor:** CodeMirror 6
- **Terminal:** xterm.js
- **Monitoring:** Sentry
- **Task Processing:** Inngest

### Key Features

- **AI-Powered IDE:** Built-in AI assistance for coding
- **Real-time Collaboration:** Convex-powered real-time features
- **Code Execution:** WebContainer API for running code
- **File Management:** Complete file system with import/export
- **Terminal Integration:** Built-in terminal functionality
- **GitHub Integration:** Import/export projects from/to GitHub

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── projects/          # Project-specific pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   └── ai-elements/       # AI-specific UI components
└── inngest/              # Background task processing

convex/                    # Convex backend
├── schema.ts             # Database schema
├── conversations.ts      # Conversation functions
├── files.ts             # File management functions
└── system.ts            # System functions
```

## 🔧 Configuration Files

- **`next.config.ts`** - Next.js configuration with Sentry integration
- **`convex/schema.ts`** - Database schema definitions
- **`components.json`** - shadcn/ui configuration
- **`eslint.config.mjs`** - ESLint configuration
- **`tsconfig.json`** - TypeScript configuration

## 🚨 Troubleshooting

### Common Issues

1. **Port 3000 already in use:**
   ```bash
   # Use a different port
   npm run dev -- -p 3001
   ```

2. **Convex connection issues:**
   - Ensure you have the correct `CONVEX_DEPLOYMENT` in `.env.local`
   - Check if Convex dev server is running

3. **Authentication issues:**
   - Verify Auth0 configuration in `.env.local`
   - Check if `APP_BASE_URL` matches your local development URL
   - Ensure Auth0 application is configured with correct callback URLs:
     - Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
     - Allowed Logout URLs: `http://localhost:3000`

4. **Build errors:**
   - Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
   - Check for TypeScript errors: `npx tsc --noEmit`

### Environment Variables Checklist

Make sure these are set in your `.env.local`:

- ✅ `CONVEX_DEPLOYMENT`
- ✅ `NEXT_PUBLIC_CONVEX_URL`
- ✅ `AUTH0_DOMAIN`
- ✅ `AUTH0_CLIENT_ID`
- ✅ `AUTH0_CLIENT_SECRET`
- ✅ `AUTH0_SECRET`
- ✅ `APP_BASE_URL`
- ✅ `FIRECRAWL_API_KEY`
- ✅ `SENTRY_AUTH_TOKEN`

## 🔄 Recent Changes: Clerk to Auth0 Migration

This project has been migrated from Clerk to Auth0 for authentication. Here are the key changes:

### What Changed:
- **Authentication Provider**: Switched from Clerk to Auth0
- **Dependencies**: Removed `@clerk/nextjs` and `@clerk/themes`, added `@auth0/nextjs-auth0`
- **API Routes**: All API routes now use Auth0 session management
- **Middleware**: Updated to use Auth0 middleware for route protection
- **Components**: New Auth0-compatible login/logout components

### Auth0 Setup Requirements:
1. **Auth0 Application Configuration**:
   - Application Type: Regular Web Application
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`

2. **GitHub Integration** (Optional):
   - For GitHub import/export features, you'll need to set up GitHub OAuth in Auth0
   - Add GitHub as a social connection in your Auth0 dashboard
   - Configure the GitHub access token in user metadata

### Authentication Flow:
- **Login**: Visit `/api/auth/login` or use the LoginButton component
- **Logout**: Visit `/api/auth/logout` or use the logout link in LoginButton
- **Protected Routes**: Projects and API routes are automatically protected by middleware

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs)

## 📞 Getting Help

If you encounter any issues:

1. Check the console for error messages
2. Review the environment variable configuration
3. Ensure all services (Convex, Auth0) are properly configured
4. Check the project's issue tracker or documentation

---

**Happy coding with Codepik! 🎉**