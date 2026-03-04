import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import archiver from 'archiver';
import fetch from 'node-fetch';
import { WEBSITE_SYSTEM_PROMPT, buildUserPrompt } from './systemPrompt.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many generation requests. Please wait a moment.' }
});

const deployLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many deploy requests. Please wait a moment.' }
});

// ─── Groq Client ──────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Helper: Robust JSON extraction from LLM response ─────────────────────────
function extractJSON(text) {
  let cleaned = text.trim();

  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  // 2. Find outermost { ... } by bracket matching (handles nested objects)
  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error('Unbalanced JSON braces in response');

  const jsonStr = cleaned.slice(start, end + 1);

  // 3. Attempt direct parse
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // 4. Attempt to repair common LLM JSON mistakes
    const repaired = jsonStr
      // Remove trailing commas before } or ]
      .replace(/,\s*([}\]])/g, '$1')
      // Replace single quotes used as string delimiters (simple cases)
      .replace(/:\s*'([^']*?)'/g, ': "$1"')
      // Remove control characters inside strings that break JSON
      .replace(/[\x00-\x1F\x7F]/g, (c) => {
        const safe = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };
        return safe[c] || '';
      });
    try {
      return JSON.parse(repaired);
    } catch (e2) {
      throw new Error(`JSON parse failed: ${e2.message}. Raw start: ${jsonStr.slice(0, 200)}`);
    }
  }
}

// ─── GET /api/debug-prompt — see the exact prompt being sent ─────────────────
app.get('/api/debug-prompt', (req, res) => {
  res.json({
    systemPromptLength: WEBSITE_SYSTEM_PROMPT.length,
    systemPromptPreview: WEBSITE_SYSTEM_PROMPT.slice(0, 500),
    model: 'llama-3.3-70b-versatile',
    maxTokens: 32000,
  });
});

// ─── POST /api/generate ───────────────────────────────────────────────────────
app.post('/api/generate', generateLimiter, async (req, res) => {
  const { messages, existingFiles } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  // Build conversation history for Groq
  // messages = [{ role: 'user'|'assistant', content: string }]
  const lastUserMessage = messages[messages.length - 1].content;
  const userPrompt = buildUserPrompt(lastUserMessage, existingFiles);

  // Replace last user message content with enriched prompt
  const groqMessages = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === 'user') {
      return { role: 'user', content: userPrompt };
    }
    // For assistant messages, include only text summary to save tokens
    if (m.role === 'assistant') {
      return { role: 'assistant', content: m.summary || 'I generated the website as requested.' };
    }
    return m;
  });

  try {
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: WEBSITE_SYSTEM_PROMPT },
        ...groqMessages
      ],
      max_tokens: 32000,
      temperature: 0.6,
      stream: true,
    });

    let fullContent = '';
    let charCount = 0;
    let finishReason = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      finishReason = chunk.choices[0]?.finish_reason || finishReason;
      if (delta) {
        fullContent += delta;
        charCount += delta.length;
        if (charCount % 300 === 0 || charCount < 50) {
          res.write(`data: ${JSON.stringify({ type: 'progress', chars: charCount })}\n\n`);
        }
      }
    }

    console.log(`[generate] Stream done. chars=${charCount}, finish_reason=${finishReason}`);
    console.log(`[generate] First 300: ${fullContent.slice(0, 300)}`);
    console.log(`[generate] Last 200: ${fullContent.slice(-200)}`);

    // Parse the complete JSON once streaming is done
    try {
      const parsed = extractJSON(fullContent);
      if (!parsed.files || typeof parsed.files !== 'object') {
        throw new Error('Response missing "files" object');
      }
      if (!parsed.files['src/App.jsx']) {
        throw new Error('Response missing src/App.jsx');
      }

      const fileList = Object.keys(parsed.files);
      console.log(`[generate] Parsed OK. Files: ${fileList.join(', ')}`);

      res.write(`data: ${JSON.stringify({ type: 'complete', data: parsed })}\n\n`);
    } catch (parseError) {
      console.error('[generate] JSON parse FAILED:', parseError.message);
      console.error('[generate] Raw (first 1000):', fullContent.slice(0, 1000));
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: `Generation failed (${finishReason === 'length' ? 'response was cut off — try a simpler request' : parseError.message})`
      })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Groq API error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Generation failed' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// ─── POST /api/download ───────────────────────────────────────────────────────
app.post('/api/download', async (req, res) => {
  const { files, title } = req.body;

  if (!files || typeof files !== 'object') {
    return res.status(400).json({ error: 'Files object is required' });
  }

  const projectName = (title || 'my-website').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(res);

  // Add package.json for the generated project
  const packageJson = {
    name: projectName,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      "lucide-react": "^0.395.0",
      "react": "^18.3.1",
      "react-dom": "^18.3.1"
    },
    devDependencies: {
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.1",
      "autoprefixer": "^10.4.19",
      "postcss": "^8.4.38",
      "tailwindcss": "^3.4.4",
      "vite": "^5.3.1"
    }
  };

  archive.append(JSON.stringify(packageJson, null, 2), { name: `${projectName}/package.json` });

  // Add postcss config
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
  archive.append(postcssConfig, { name: `${projectName}/postcss.config.js` });

  // Add README
  const readme = `# ${title || 'My Website'}

Generated with AI Website Builder.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build for Production

\`\`\`bash
npm run build
npm run preview
\`\`\`
`;
  archive.append(readme, { name: `${projectName}/README.md` });

  // Add all generated files
  for (const [filePath, content] of Object.entries(files)) {
    archive.append(content, { name: `${projectName}/${filePath}` });
  }

  await archive.finalize();
});

// ─── POST /api/deploy ─────────────────────────────────────────────────────────
app.post('/api/deploy', deployLimiter, async (req, res) => {
  const { files, title } = req.body;

  if (!files || typeof files !== 'object') {
    return res.status(400).json({ error: 'Files object is required' });
  }

  if (!process.env.NETLIFY_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'NETLIFY_ACCESS_TOKEN not configured' });
  }

  try {
    // Build a self-contained HTML file that inlines everything
    // For Netlify Drop, we need to serve a built site
    // We'll create a minimal HTML with CDN-based React + Babel transform
    const appContent = files['src/App.jsx'] || '';
    const cssContent = files['src/index.css'] || '';

    // Extract custom CSS (remove tailwind directives for CDN version)
    const customCSS = cssContent
      .replace(/@tailwind\s+\w+;/g, '')
      .trim();

    // Build a standalone deployable HTML using CDN React
    const standaloneHTML = buildStandaloneHTML(appContent, customCSS, title);

    // Deploy to Netlify using the Files API
    const netlifyFiles = {
      '/index.html': {
        content: standaloneHTML
      }
    };

    const response = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: netlifyFiles,
        functions: {}
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Netlify API error: ${err}`);
    }

    const site = await response.json();

    // Now deploy the files to the site
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: { '/index.html': hashContent(standaloneHTML) },
      })
    });

    if (!deployResponse.ok) {
      throw new Error('Deploy creation failed');
    }

    const deploy = await deployResponse.json();

    // Upload the actual file
    await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: standaloneHTML
    });

    res.json({
      success: true,
      url: `https://${site.subdomain}.netlify.app`,
      siteId: site.id,
      deployId: deploy.id
    });

  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ error: error.message || 'Deployment failed' });
  }
});

// Simple hash for Netlify file manifest
function hashContent(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function buildStandaloneHTML(appJSX, customCSS, title) {
  // Transform JSX to something Babel standalone can handle
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title || 'My Website'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    ${customCSS}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback } = React;
    const LucideIcons = window.LucideReact || {};
    
    ${appJSX
      .replace(/import\s+.*?from\s+['"].*?['"]\s*;?\n?/g, '')
      .replace(/export\s+default\s+/g, 'const _DefaultExport = ')
    }
    
    const AppComponent = typeof _DefaultExport !== 'undefined' ? _DefaultExport : () => React.createElement('div', null, 'App loaded');
    
    ReactDOM.createRoot(document.getElementById('root')).render(
      React.createElement(React.StrictMode, null,
        React.createElement(AppComponent)
      )
    );
  </script>
</body>
</html>`;
}

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    groq: !!process.env.GROQ_API_KEY,
    netlify: !!process.env.NETLIFY_ACCESS_TOKEN
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AI Website Builder Backend`);
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   Groq: ${process.env.GROQ_API_KEY ? '✓ configured' : '✗ missing key'}`);
  console.log(`   Netlify: ${process.env.NETLIFY_ACCESS_TOKEN ? '✓ configured' : '✗ missing key'}\n`);
});