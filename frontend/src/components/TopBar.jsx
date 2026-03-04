import { useState } from 'react';
import { 
  Download, Rocket, RefreshCw, Monitor, Smartphone,
  Code2, Eye, ChevronDown, ExternalLink, Check, Loader2,
  Zap
} from 'lucide-react';
import { useStore } from '../stores/useStore';
import { downloadProject, deployProject } from '../hooks/useApi';

export default function TopBar() {
  const {
    files, projectTitle,
    viewMode, setViewMode,
    activePanel, setActivePanel,
    isGenerating, isDeploying, setIsDeploying,
    deployedUrl, setDeployedUrl,
    resetToDefault
  } = useStore();

  const [downloadState, setDownloadState] = useState('idle'); // idle | loading | done
  const [deployState, setDeployState] = useState('idle');
  const [deployError, setDeployError] = useState('');
  const [showDeployMenu, setShowDeployMenu] = useState(false);

  const hasProject = projectTitle !== '';

  const handleDownload = async () => {
    if (!hasProject) return;
    setDownloadState('loading');
    try {
      await downloadProject(files, projectTitle);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
    } catch (e) {
      setDownloadState('idle');
      alert('Download failed: ' + e.message);
    }
  };

  const handleDeploy = async () => {
    if (!hasProject) return;
    setDeployState('loading');
    setIsDeploying(true);
    setDeployError('');
    try {
      const result = await deployProject(files, projectTitle);
      setDeployedUrl(result.url);
      setDeployState('done');
    } catch (e) {
      setDeployError(e.message);
      setDeployState('error');
      setTimeout(() => setDeployState('idle'), 3000);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-bg-border bg-bg-panel shrink-0 z-10">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent-primary flex items-center justify-center shadow-glow-sm">
            <Zap size={13} className="text-white" />
          </div>
          <span className="font-semibold text-text-primary text-sm tracking-tight">Forge</span>
        </div>
        
        {projectTitle && (
          <>
            <span className="text-bg-border">/</span>
            <span className="text-text-secondary text-sm truncate max-w-48">{projectTitle}</span>
          </>
        )}
      </div>

      {/* Center: Panel toggles */}
      <div className="flex items-center gap-1 bg-bg-tertiary border border-bg-border rounded-lg p-1">
        <button
          onClick={() => setActivePanel('preview')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
            activePanel === 'preview'
              ? 'bg-bg-active text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Eye size={12} />
          Preview
        </button>
        <button
          onClick={() => setActivePanel('code')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
            activePanel === 'code'
              ? 'bg-bg-active text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Code2 size={12} />
          Code
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Viewport toggle (only in preview mode) */}
        {activePanel === 'preview' && (
          <div className="flex items-center gap-1 bg-bg-tertiary border border-bg-border rounded-lg p-1 mr-1">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-1 rounded transition-all ${viewMode === 'desktop' ? 'bg-bg-active text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              title="Desktop view"
            >
              <Monitor size={13} />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-1 rounded transition-all ${viewMode === 'mobile' ? 'bg-bg-active text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              title="Mobile view"
            >
              <Smartphone size={13} />
            </button>
          </div>
        )}

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={!hasProject || downloadState === 'loading'}
          className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          title="Download project as ZIP"
        >
          {downloadState === 'loading' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : downloadState === 'done' ? (
            <Check size={13} className="text-accent-success" />
          ) : (
            <Download size={13} />
          )}
          <span>Export</span>
        </button>

        {/* Deploy */}
        <div className="relative">
          <button
            onClick={deployedUrl ? () => window.open(deployedUrl, '_blank') : handleDeploy}
            disabled={!hasProject || deployState === 'loading'}
            className={`btn-primary text-xs ${deployState === 'done' ? '!bg-accent-success' : ''} ${deployState === 'error' ? '!bg-accent-danger' : ''}`}
          >
            {deployState === 'loading' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : deployState === 'done' ? (
              <ExternalLink size={13} />
            ) : (
              <Rocket size={13} />
            )}
            {deployState === 'loading' ? 'Deploying...' 
              : deployState === 'done' ? 'View Live' 
              : deployState === 'error' ? 'Failed'
              : 'Deploy'}
          </button>
        </div>

        {/* Reset */}
        {hasProject && (
          <button
            onClick={() => {
              if (confirm('Start a new project? Current work will be lost.')) {
                resetToDefault();
                setDeployedUrl(null);
                setDeployState('idle');
              }
            }}
            className="btn-ghost text-xs"
            title="New project"
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>
    </header>
  );
}
