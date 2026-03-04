import { useStore } from '../stores/useStore';

const API_BASE = '/api';

export function useGenerate() {
  const {
    files,
    chatMessages,
    setFiles,
    setProjectMeta,
    setIsGenerating,
    addChatMessage,
    updateLastAssistantMessage,
  } = useStore();

  const generate = async (userMessage) => {
    addChatMessage({ role: 'user', content: userMessage });
    addChatMessage({ role: 'assistant', content: '⏳ Starting generation...', isStreaming: true });
    setIsGenerating(true);

    // Only pass existingFiles when user is REFINING (has a real generated site already)
    const hasGeneratedSite = files['src/App.jsx'] &&
      !files['src/App.jsx'].includes('Welcome to Forge') &&
      files['src/App.jsx'].length > 200;

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          existingFiles: hasGeneratedSite ? files : null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || 'Generation failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            continue; // incomplete JSON chunk, skip
          }

          if (parsed.type === 'progress') {
            const kb = (parsed.chars / 1000).toFixed(1);
            updateLastAssistantMessage(`⏳ Writing code... ${kb}kb`);

          } else if (parsed.type === 'complete') {
            gotComplete = true;
            const { files: newFiles, title, description } = parsed.data;

            // Log what we got for debugging
            console.log('[Forge] Generation complete:', {
              title,
              fileCount: Object.keys(newFiles).length,
              files: Object.entries(newFiles).map(([k, v]) => `${k} (${v.length} chars)`),
            });

            setFiles(newFiles);
            setProjectMeta(title || 'My Website', description || '');
            updateLastAssistantMessage(`✓ Built **${title}** — ${description}`);

          } else if (parsed.type === 'error') {
            throw new Error(parsed.error);
          }
        }
      }

      if (!gotComplete) {
        throw new Error('Generation ended without producing files. Try again.');
      }

    } catch (error) {
      console.error('[Forge] Generation error:', error);
      updateLastAssistantMessage(`❌ ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate };
}

export async function downloadProject(files, title) {
  const response = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, title }),
  });
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || 'my-website').toLowerCase().replace(/\s+/g, '-')}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deployProject(files, title) {
  const response = await fetch(`${API_BASE}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, title }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Deployment failed');
  return data;
}