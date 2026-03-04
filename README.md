# ⚡ Forge — AI Website Builder

Generate stunning, production-ready React websites from a single prompt. Powered by Groq's blazing-fast LLMs.

![Tech Stack](https://img.shields.io/badge/React-18-61dafb?logo=react) ![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite) ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js) ![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-f55036) ![Tailwind](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss)

## ✨ Features

- 🤖 **AI Generation** — Describe any website, get production-ready React code
- 🔄 **Iterative Editing** — Refine with chat-style follow-ups
- 👁️ **Live Preview** — Instant Sandpack-powered preview in the browser
- 📱 **Mobile Toggle** — Switch between desktop and 375px mobile views
- 🖥️ **Code Editor** — Monaco (VS Code) editor with full file tree
- 📦 **Download ZIP** — Export the full Vite + React project
- 🚀 **Deploy to Netlify** — One-click deployment to a live public URL
- ⚡ **Groq Speed** — Responses in ~2–5 seconds via `llama-3.3-70b-versatile`

## 🏗️ Architecture

```
forge-ai-website-builder/
├── backend/                    # Node.js + Express API
│   ├── server.js               # Main server (generate, download, deploy endpoints)
│   ├── systemPrompt.js         # AI system prompt engineering
│   └── package.json
│
├── frontend/                   # React + Vite builder UI
│   ├── src/
│   │   ├── App.jsx             # Root layout
│   │   ├── components/
│   │   │   ├── TopBar.jsx      # Header with actions
│   │   │   ├── ChatPanel.jsx   # Chat interface
│   │   │   ├── PreviewPanel.jsx # Sandpack live preview
│   │   │   └── CodePanel.jsx   # Monaco code editor
│   │   ├── hooks/
│   │   │   └── useApi.js       # API integration + streaming
│   │   └── stores/
│   │       └── useStore.js     # Zustand global state
│   └── package.json
│
└── package.json                # Root scripts
```

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <repo-url>
cd forge-ai-website-builder
npm run install:all
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
NETLIFY_ACCESS_TOKEN=your_netlify_access_token_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Get your keys:**
- **Groq API Key**: [console.groq.com](https://console.groq.com) — Free tier available
- **Netlify Token**: [app.netlify.com/user/applications](https://app.netlify.com/user/applications) → Personal access tokens

### 3. Start Development
```bash
npm run dev
```

This starts:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

Open **http://localhost:5173** and start building! 🎉

## 🌐 Production Deployment

### Deploy Backend (Railway / Render / Fly.io)
```bash
# Set environment variables on your platform:
GROQ_API_KEY=...
NETLIFY_ACCESS_TOKEN=...
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### Deploy Frontend (Vercel / Netlify)
```bash
cd frontend
npm run build
# Deploy the `dist/` folder
```

Update `frontend/vite.config.js` to point to your backend URL:
```js
server: {
  proxy: {
    '/api': { target: 'https://your-backend-url.com' }
  }
}
```

For production builds, set `VITE_API_URL` env var and update the API base URL in `src/hooks/useApi.js`.

## 🎨 How the AI Works

The system prompt engineers the LLM to:
1. Always output valid JSON with specific file structure
2. Use Tailwind CSS + lucide-react exclusively
3. Choose distinctive Google Fonts (never Arial/Inter/Roboto)
4. Follow modern design patterns (bento grids, glassmorphism, etc.)
5. Include interactive components (FAQ accordion, mobile menu, etc.)

### Supported Website Types
- SaaS / Product landing pages
- Portfolio & personal sites  
- E-commerce product pages
- Restaurant / local business
- Blog & editorial layouts
- Agency & creative studios
- Startup & tech companies

## 🔧 Configuration

### Changing the AI Model
Edit `backend/server.js`:
```js
model: 'llama-3.3-70b-versatile', // Change to any Groq-supported model
```

Available fast Groq models:
- `llama-3.3-70b-versatile` (recommended — best quality)
- `llama-3.1-8b-instant` (fastest)
- `mixtral-8x7b-32768` (large context)

### Customizing the System Prompt
Edit `backend/systemPrompt.js` to adjust design preferences, output format, or component patterns.

## 🐛 Troubleshooting

**Preview not loading?**  
→ Sandpack needs a valid `src/App.jsx`. Try regenerating.

**CORS errors?**  
→ Check `FRONTEND_URL` in backend `.env` matches exactly.

**Deploy failing?**  
→ Verify `NETLIFY_ACCESS_TOKEN` has `sites:write` permission.

**Generation too slow?**  
→ Switch to `llama-3.1-8b-instant` for faster (but simpler) output.

## 📄 License

MIT © 2024
# Forge
