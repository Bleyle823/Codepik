# 🤖 AI Chat API Keys Setup Guide

## 🔑 **Required API Keys**

Based on your codebase analysis, here are the API keys you need to add for the AI chat functionality to work:

### **1. Anthropic API Key (REQUIRED)**
The main AI chat functionality uses Anthropic's Claude models.

**Where to get it:**
- Go to [console.anthropic.com](https://console.anthropic.com)
- Sign up/login to your account
- Navigate to "API Keys" section
- Create a new API key

**Models used in your app:**
- `claude-3-5-haiku-20241022` (for title generation)
- `claude-3-5-sonnet-20241022` (for main chat)
- `claude-3-7-sonnet-20250219` (for suggestions and quick edits)

### **2. Google AI API Key (OPTIONAL)**
Your app has Google AI SDK installed but it's currently commented out.

**Where to get it:**
- Go to [ai.google.dev](https://ai.google.dev)
- Get API access for Gemini models

## 📁 **Where to Add API Keys**

### **Option 1: Add to `.env.local` (RECOMMENDED)**

Open your `.env.local` file and add these lines:

```bash
# Anthropic API Key (REQUIRED for AI chat)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI API Key (OPTIONAL)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

### **Option 2: Add to `.env` file**

Alternatively, you can add them to your `.env` file:

```bash
# Anthropic API Key (REQUIRED for AI chat)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI API Key (OPTIONAL)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

## 🎯 **Current API Keys Status**

Here's what's currently configured in your `.env.local`:

✅ **Working:**
- `CLERK_SECRET_KEY` - Authentication (working)
- `FIRECRAWL_API_KEY` - Web scraping (working)
- `POLARIS_CONVEX_INTERNAL_KEY` - Database operations (working)
- `INNGEST_EVENT_KEY` - Background jobs (working)

❌ **Missing for AI Chat:**
- `ANTHROPIC_API_KEY` - **REQUIRED** for AI chat functionality
- `GOOGLE_GENERATIVE_AI_API_KEY` - Optional for Google AI models

## 🔧 **AI Features That Need These Keys**

### **Features using Anthropic API:**
1. **Main AI Chat** - The primary conversation interface
2. **Code Suggestions** - Autocomplete suggestions while typing
3. **Quick Edit** - AI-powered code editing
4. **Title Generation** - Auto-generating conversation titles
5. **Message Processing** - Background AI message processing

### **Features using Firecrawl (already configured):**
1. **Web Scraping** - When you reference URLs in chat
2. **Documentation Context** - Fetching external docs for context

## 🚀 **How to Apply the Changes**

1. **Add the API key to your environment file:**
   ```bash
   # Add this line to .env.local
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
   ```

2. **Restart your development server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

3. **Test the AI chat:**
   - Navigate to a project
   - Try sending a message in the chat
   - The AI should respond properly

## 🛠️ **Troubleshooting**

### **If AI chat still doesn't work:**

1. **Check the browser console** for error messages
2. **Check the server terminal** for API key errors
3. **Verify your API key** is valid and has sufficient credits
4. **Make sure** you restarted the server after adding the key

### **Common Error Messages:**

- `"API key not provided"` → Add `ANTHROPIC_API_KEY` to your env file
- `"Invalid API key"` → Check your API key is correct
- `"Rate limit exceeded"` → You've hit API usage limits
- `"Insufficient credits"` → Add credits to your Anthropic account

## 💡 **API Key Security**

- ✅ **DO**: Keep API keys in `.env.local` (not committed to git)
- ✅ **DO**: Use environment variables for production
- ❌ **DON'T**: Put API keys directly in code
- ❌ **DON'T**: Commit API keys to version control

## 📊 **Cost Considerations**

**Anthropic Pricing (approximate):**
- Claude 3.5 Haiku: ~$0.25 per 1M input tokens
- Claude 3.5 Sonnet: ~$3.00 per 1M input tokens
- Most chat interactions cost $0.01-$0.10

**Free tiers:**
- Anthropic offers $5 free credits for new accounts
- Google AI has generous free quotas

## ✅ **Next Steps**

1. Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Add `ANTHROPIC_API_KEY=your_key_here` to `.env.local`
3. Restart your development server
4. Test the AI chat functionality
5. Optionally add Google AI key for additional models

Once you add the Anthropic API key, all AI chat features should work perfectly!