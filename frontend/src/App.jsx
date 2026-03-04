import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import PreviewPanel from './components/PreviewPanel';
import CodePanel from './components/CodePanel';
import DebugPanel from './components/DebugPanel';
import { useStore } from './stores/useStore';

export default function App() {
  const { activePanel } = useStore();

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* Top navigation bar */}
      <TopBar />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Chat sidebar */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-bg-border bg-bg-panel">
          <div className="px-4 py-2.5 border-b border-bg-border">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
              <span className="text-xs font-medium text-text-secondary">AI Assistant</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        </aside>

        {/* Right: Preview or Code panel */}
        <main className="flex-1 overflow-hidden">
          {activePanel === 'preview' ? (
            <PreviewPanel />
          ) : (
            <CodePanel />
          )}
        </main>
      </div>

      {/* Status bar */}
      <footer className="h-6 flex items-center px-4 gap-4 border-t border-bg-border bg-accent-primary/10 shrink-0">
        <span className="text-[10px] text-accent-primary/80 font-medium">Forge AI</span>
        <span className="text-[10px] text-text-disabled">Powered by Groq · llama-3.3-70b-versatile</span>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-text-disabled">
          <span>React + Vite</span>
          <span>Tailwind CSS</span>
          <span>Blob URL Preview</span>
        </div>
      </footer>
      <DebugPanel />
    </div>
  );
}