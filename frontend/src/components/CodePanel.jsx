import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { FileCode, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { useStore } from '../stores/useStore';

const FILE_ICONS = {
  '.jsx': { icon: '⚛', color: '#61dafb' },
  '.js': { icon: 'JS', color: '#f7df1e' },
  '.css': { icon: 'CSS', color: '#1572b6' },
  '.html': { icon: 'HTML', color: '#e34f26' },
  '.json': { icon: '{}', color: '#a0a0a0' },
};

function getFileIcon(filename) {
  const ext = Object.keys(FILE_ICONS).find(e => filename.endsWith(e));
  return FILE_ICONS[ext] || { icon: '📄', color: '#a0a0a0' };
}

function getLanguage(filename) {
  if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'javascript';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.json')) return 'json';
  return 'plaintext';
}

function buildFileTree(files) {
  const tree = {};
  for (const path of Object.keys(files)) {
    const parts = path.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = { _isFile: true, _path: path };
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }
  return tree;
}

function FileTreeNode({ name, node, depth = 0 }) {
  const { activeFile, setActiveFile } = useStore();
  const [open, setOpen] = useState(true);
  const isFile = node._isFile;
  const { icon, color } = isFile ? getFileIcon(name) : { icon: null, color: null };
  const isActive = isFile && node._path === activeFile;

  if (isFile) {
    return (
      <button
        onClick={() => setActiveFile(node._path)}
        className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-all duration-100 ${
          isActive
            ? 'bg-bg-active text-text-primary'
            : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        <span className="text-[10px] font-mono shrink-0" style={{ color }}>{icon}</span>
        <span className="truncate">{name}</span>
      </button>
    );
  }

  const children = Object.entries(node).filter(([k]) => !k.startsWith('_'));

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-hover rounded transition-all duration-100"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight
          size={10}
          className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
        {open ? (
          <FolderOpen size={12} className="text-yellow-500/70 shrink-0" />
        ) : (
          <Folder size={12} className="text-yellow-500/70 shrink-0" />
        )}
        <span>{name}</span>
      </button>
      {open && children.map(([childName, childNode]) => (
        <FileTreeNode key={childName} name={childName} node={childNode} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CodePanel() {
  const { files, activeFile, updateFile } = useStore();
  const fileTree = buildFileTree(files);
  const currentContent = files[activeFile] || '';
  const language = getLanguage(activeFile);

  const handleChange = useCallback((value) => {
    updateFile(activeFile, value || '');
  }, [activeFile, updateFile]);

  return (
    <div className="h-full flex overflow-hidden">
      {/* File tree sidebar */}
      <div className="w-48 shrink-0 border-r border-bg-border bg-bg-panel overflow-y-auto">
        <div className="px-3 py-2 border-b border-bg-border">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Explorer</span>
        </div>
        <div className="py-1">
          {Object.entries(fileTree).map(([name, node]) => (
            <FileTreeNode key={name} name={name} node={node} depth={0} />
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="shrink-0 flex items-center border-b border-bg-border bg-bg-panel overflow-x-auto">
          {activeFile && (
            <div className="flex items-center gap-1.5 px-4 py-2 border-r border-bg-border border-t-2 border-t-accent-primary bg-bg-primary text-text-primary">
              <span className="text-[10px]" style={{ color: getFileIcon(activeFile).color }}>
                {getFileIcon(activeFile).icon}
              </span>
              <span className="text-xs font-mono">{activeFile.split('/').pop()}</span>
            </div>
          )}
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={language}
            value={currentContent}
            onChange={handleChange}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineHeight: 1.7,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: 'gutter',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
