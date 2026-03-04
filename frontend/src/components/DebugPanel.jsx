import { useState } from 'react';
import { useStore } from '../stores/useStore';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';

export default function DebugPanel() {
  const { files } = useStore();
  const [open, setOpen] = useState(false);

  const fileEntries = Object.entries(files);
  const appJsx = files['src/App.jsx'] || '';

  return (
    <div className="fixed bottom-8 right-4 z-50 w-80 font-mono text-xs">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded-lg w-full"
      >
        <Bug size={12} />
        <span>Debug Panel</span>
        {open ? <ChevronDown size={12} className="ml-auto" /> : <ChevronUp size={12} className="ml-auto" />}
      </button>

      {open && (
        <div className="mt-1 bg-bg-panel border border-bg-border rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
          <div>
            <p className="text-yellow-400 font-bold mb-1">Files in store ({fileEntries.length}):</p>
            {fileEntries.map(([path, content]) => (
              <div key={path} className="text-text-secondary">
                {path}: <span className="text-accent-success">{content.length} chars</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-yellow-400 font-bold mb-1">App.jsx preview (first 200 chars):</p>
            <pre className="text-text-muted whitespace-pre-wrap break-all bg-bg-tertiary p-2 rounded text-[10px]">
              {appJsx.slice(0, 200) || '(empty)'}
            </pre>
          </div>
          <div>
            <p className="text-yellow-400 font-bold mb-1">hasContent check:</p>
            <p className="text-text-secondary">
              App.jsx length: {appJsx.length}<br/>
              Is real content: {String(appJsx.length > 50 && !appJsx.includes('Welcome to Forge'))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
