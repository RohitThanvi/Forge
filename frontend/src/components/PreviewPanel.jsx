import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../stores/useStore';
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import * as ReactLib from 'react';

// ── Strip imports/exports so code can run in Function() scope ─────────────────
function transformCode(code) {
  return code
    // Remove all import statements (single and multiline)
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]*['"]\s*;?\s*$/gm, '')
    // Handle default exports first
    .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
    .replace(/export\s+default\s+class\s+(\w+)/g, 'class $1')
    // Handle named exports
    .replace(/export\s+function\s+(\w+)/g, 'function $1')
    .replace(/export\s+(const|let|var)\s+/g, '$1 ')
    // Remove re-export forms
    .replace(/^\s*export\s+\*\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '')
    .replace(/^\s*export\s+\{[\s\S]*?\}\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '')
    .replace(/^\s*export\s+\{[\s\S]*?\}\s*;?\s*$/gm, '')
    // Finally strip any remaining export prefixes
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .trim();
}

// ── Compile JSX via Babel standalone (loaded once as a global) ────────────────
function compileJSX(code) {
  if (!window.Babel) throw new Error('Babel not loaded yet');
  const result = window.Babel.transform(code, {
    presets: ['react'],
    filename: 'preview.jsx',
  });
  return result.code;
}

// ── Build and return the App component from generated files ───────────────────
function buildComponent(files) {
  const appCode = files['src/App.jsx'] || '';

  const siblings = Object.entries(files).filter(([p]) =>
    p.startsWith('src/') &&
    !['src/App.jsx','src/main.jsx','src/index.css'].includes(p) &&
    (p.endsWith('.jsx') || p.endsWith('.js'))
  );

  // Transform each file individually
  const transformedSiblings = siblings
    .map(([, code]) => transformCode(code))
    .join('\n\n');

  const transformedApp = transformCode(appCode);

  const combined = transformedSiblings + '\n\n' + transformedApp;

  // Compile JSX → JS
  const compiled = compileJSX(combined);

  // Detect default-exported component name from ORIGINAL source
  let fnName = 'App';
  const defaultExportPatterns = [
    /export\s+default\s+function\s+(\w+)/,
    /export\s+default\s+class\s+(\w+)/,
    /export\s+default\s+(\w+)\s*;?/,
  ];
  for (const p of defaultExportPatterns) {
    const m = appCode.match(p);
    if (m) {
      fnName = m[1];
      break;
    }
  }

  if (fnName === 'App') {
    const fallbackPatterns = [
      /function\s+(\w+)\s*\(/,
      /const\s+(\w+)\s*=/,
      /class\s+(\w+)\s+/,
    ];
    for (const p of fallbackPatterns) {
      const m = appCode.match(p);
      if (m) {
        fnName = m[1];
        break;
      }
    }
  }

  const scope = {
    React: ReactLib,
    ...ReactLib,
    ...LucideIcons,
  };

  const keys = Object.keys(scope);
  const vals = Object.values(scope);

  // eslint-disable-next-line no-new-func
  const factory = new Function(...keys, `
    ${compiled}
    return typeof ${fnName} !== 'undefined' ? ${fnName} : null;
  `);

  const Component = factory(...vals);
  if (!Component) throw new Error(`Could not find component "${fnName}". Check the generated code.`);
  return Component;
}

// ── Wrapper that catches render errors ───────────────────────────────────────
class ErrorBoundary extends ReactLib.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, color: '#ef4444', background: '#1a0a0a', minHeight: '100%' }}>
          <strong>Runtime error:</strong>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PreviewPanel() {
  const { files, isGenerating, viewMode } = useStore();
  const [PreviewComponent, setPreviewComponent] = useState(null);
  const [error, setError] = useState(null);
  const [babelReady, setBabelReady] = useState(!!window.Babel);
  const containerRef = useRef(null);

  // Load Babel standalone once
  useEffect(() => {
    if (window.Babel) { setBabelReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
    script.onload = () => setBabelReady(true);
    script.onerror = () => setError('Failed to load Babel. Check internet connection.');
    document.head.appendChild(script);
  }, []);

  const appCode = files['src/App.jsx'] || '';
  const isGenerated = appCode.length > 100 && !appCode.includes('Welcome to Forge');

  // Rebuild component whenever files change
  useEffect(() => {
    if (!babelReady || !isGenerated) {
      setPreviewComponent(null);
      return;
    }

    setError(null);
    try {
      const Comp = buildComponent(files);
      // Wrap in a function so useState works fresh each rebuild
      setPreviewComponent(() => Comp);
      console.log('[Preview] Component built successfully');
    } catch (e) {
      console.error('[Preview] Build error:', e);
      setError(e.message);
    }
  }, [files, appCode, babelReady, isGenerated]);

  const handleRefresh = useCallback(() => {
    if (!babelReady || !isGenerated) return;
    setError(null);
    try {
      const Comp = buildComponent(files);
      setPreviewComponent(() => Comp);
    } catch (e) {
      setError(e.message);
    }
  }, [files, babelReady, isGenerated]);

  return (
    <div className="relative h-full flex flex-col bg-bg-primary">
      {/* Generating overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-20 bg-bg-primary/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center animate-pulse">
            <Sparkles size={28} className="text-accent-primary" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-text-primary font-medium text-sm">Building your website...</p>
            <p className="text-text-muted text-xs">Usually takes 5–15 seconds</p>
          </div>
          <div className="flex gap-2 mt-2">
            {['Designing','Coding','Styling'].map((s,i) => (
              <div key={s} className="px-3 py-1 rounded-full text-xs border border-bg-border text-text-muted animate-pulse"
                style={{animationDelay:`${i*0.3}s`}}>{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      {PreviewComponent && !isGenerating && (
        <div className="absolute top-3 right-3 z-10">
          <button onClick={handleRefresh}
            className="p-1.5 rounded-lg bg-bg-tertiary/80 border border-bg-border hover:bg-bg-active text-text-muted hover:text-text-primary transition-all backdrop-blur-sm">
            <RefreshCw size={13}/>
          </button>
        </div>
      )}

      {/* Main preview area */}
      <div className={`flex-1 flex items-center justify-center overflow-hidden ${viewMode==='mobile'?'bg-bg-secondary p-6':''}`}>
        <div className={`bg-white overflow-auto transition-all duration-300 ${
          viewMode==='mobile'
            ?'w-[375px] h-[812px] rounded-3xl shadow-2xl border-4 border-bg-border max-h-full'
            :'w-full h-full'
        }`}>
          {error ? (
            <div className="p-6 font-mono text-sm text-red-400 bg-[#1a0a0a] min-h-full">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-400" />
                <strong>Preview Error</strong>
              </div>
              <pre className="whitespace-pre-wrap break-words text-xs">{error}</pre>
            </div>
          ) : PreviewComponent ? (
            <ErrorBoundary key={appCode.slice(0,50)}>
              <PreviewComponent />
            </ErrorBoundary>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0d0d0d] min-h-screen">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-bg-tertiary border border-bg-border flex items-center justify-center mx-auto">
                  <Sparkles size={24} className="text-text-muted"/>
                </div>
                <p className="text-text-muted text-sm">Your website preview will appear here</p>
                <p className="text-text-disabled text-xs">Describe a website in the chat to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewMode==='mobile' && (
        <div className="shrink-0 flex justify-center pb-2">
          <span className="text-text-muted text-xs">375px · iPhone frame</span>
        </div>
      )}
    </div>
  );
}
