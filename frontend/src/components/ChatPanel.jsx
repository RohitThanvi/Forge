import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2, RotateCcw } from 'lucide-react';
import { useStore } from '../stores/useStore';
import { useGenerate } from '../hooks/useApi';

const EXAMPLE_PROMPTS = [
  "A SaaS landing page for an AI writing tool with dark theme",
  "Portfolio site for a freelance photographer",
  "E-commerce product page for premium headphones",
  "Startup landing page for a fintech app",
  "Restaurant website with menu and reservations",
  "Personal blog with modern editorial layout",
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  // Simple markdown-like rendering
  const renderContent = (content) => {
    if (!content && message.isStreaming) {
      return (
        <div className="flex items-center gap-1.5 text-text-muted">
          <Loader2 size={12} className="animate-spin" />
          <span className="text-xs">Generating...</span>
        </div>
      );
    }
    
    // Bold text
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`flex gap-3 animate-slide-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-accent-primary/20 border border-accent-primary/30' : 'bg-bg-tertiary border border-bg-border'
      }`}>
        {isUser ? (
          <User size={13} className="text-accent-primary" />
        ) : (
          <Sparkles size={13} className="text-text-secondary" />
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-accent-primary/15 border border-accent-primary/20 text-text-primary rounded-tr-sm'
            : 'bg-bg-tertiary border border-bg-border text-text-secondary rounded-tl-sm'
        }`}>
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const { chatMessages, isGenerating } = useStore();
  const { generate } = useGenerate();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = async () => {
    const msg = input.trim();
    if (!msg || isGenerating) return;
    setInput('');
    await generate(msg);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (prompt) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const isEmpty = chatMessages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            {/* Hero */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mx-auto mb-4 shadow-glow-sm">
                <Sparkles size={22} className="text-accent-primary" />
              </div>
              <h2 className="text-text-primary font-semibold text-base">Build anything with AI</h2>
              <p className="text-text-muted text-xs leading-relaxed max-w-52">
                Describe your website and watch it come to life in seconds.
              </p>
            </div>

            {/* Example prompts */}
            <div className="w-full space-y-1.5">
              <p className="text-text-muted text-xs font-medium px-1 mb-2">Try these examples:</p>
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(prompt)}
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-hover border border-bg-border hover:border-bg-active rounded-lg transition-all duration-150 leading-relaxed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 p-3 border-t border-bg-border">
        {isGenerating && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-text-muted">AI is generating your website...</span>
          </div>
        )}

        <div className="flex gap-2 items-end bg-bg-tertiary border border-bg-border rounded-xl p-2 focus-within:border-accent-primary/40 focus-within:ring-1 focus-within:ring-accent-primary/20 transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isEmpty ? "Describe your website..." : "Refine or request changes..."}
            disabled={isGenerating}
            rows={1}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none outline-none min-h-[32px] max-h-32 leading-relaxed disabled:opacity-50"
            style={{ 
              height: 'auto',
              overflow: input.split('\n').length > 3 ? 'auto' : 'hidden'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
            className="shrink-0 w-8 h-8 rounded-lg bg-accent-primary hover:bg-purple-500 disabled:bg-bg-active disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150 shadow-glow-sm disabled:shadow-none"
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin text-text-muted" />
            ) : (
              <Send size={14} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-text-disabled text-[10px] mt-1.5 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
