import { create } from 'zustand';

const DEFAULT_FILES = {
  'src/App.jsx': `import { useState } from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">Welcome to Forge</h1>
        <p className="text-slate-400 text-xl">Describe your website in the chat to get started</p>
      </div>
    </div>
  )
}`,
  'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
  'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Website</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })`,
  'tailwind.config.js': `export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`,
};

export const useStore = create((set, get) => ({
  // ─── Files ─────────────────────────────────────────────────────────────────
  files: DEFAULT_FILES,
  activeFile: 'src/App.jsx',
  projectTitle: '',
  projectDescription: '',
  
  setFiles: (files) => set({ files }),
  setActiveFile: (file) => set({ activeFile: file }),
  updateFile: (path, content) => set((state) => ({
    files: { ...state.files, [path]: content }
  })),
  setProjectMeta: (title, description) => set({ projectTitle: title, projectDescription: description }),
  resetToDefault: () => set({ files: DEFAULT_FILES, projectTitle: '', projectDescription: '', chatMessages: [] }),

  // ─── Chat ───────────────────────────────────────────────────────────────────
  chatMessages: [],
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, { ...message, id: Date.now() + Math.random() }]
  })),
  updateLastAssistantMessage: (content) => set((state) => {
    const msgs = [...state.chatMessages];
    const lastIdx = msgs.length - 1;
    if (msgs[lastIdx]?.role === 'assistant') {
      msgs[lastIdx] = { ...msgs[lastIdx], content };
    }
    return { chatMessages: msgs };
  }),
  clearChat: () => set({ chatMessages: [] }),

  // ─── UI State ───────────────────────────────────────────────────────────────
  isGenerating: false,
  generationProgress: '',
  isDeploying: false,
  deployedUrl: null,
  viewMode: 'desktop', // 'desktop' | 'mobile'
  activePanel: 'preview', // 'preview' | 'code'

  setIsGenerating: (val) => set({ isGenerating: val }),
  setGenerationProgress: (val) => set({ generationProgress: val }),
  setIsDeploying: (val) => set({ isDeploying: val }),
  setDeployedUrl: (url) => set({ deployedUrl: url }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
