import { useEffect, useRef } from 'react';

export default function PromptPanel({
    aiCtx,
    modelCtx,
    models,
    isCollapsed,
    onToggle,
    onSuggest
}) {
    const responseRef = useRef(null);

    const { 
      aiPrompt, setAiPrompt, 
      aiResponse, isSuggesting, 
      feedbackType, feedbackOptions, setFeedbackType 
    } = aiCtx;
    
    const { selectedModel, setModel, isModelPulling, modelPullStatus } = modelCtx;

    useEffect(() => {
      if (!responseRef.current || isCollapsed) return;
      const node = responseRef.current;
      requestAnimationFrame(() => {
        node.scrollTop = node.scrollHeight;
      });
    }, [aiResponse, isSuggesting, isCollapsed]);

    return (
        <aside className={`spatial-sidebar ${isCollapsed ? 'spatial-sidebar--collapsed' : ''}`}>
          
            {/* Header */}
            <div className="spatial-sidebar__header">
                <button 
                    className="btn btn--glass btn--icon sidebar-toggle" 
                    onClick={onToggle}
                    title={isCollapsed ? 'Expand AI Panel' : 'Collapse AI Panel'}
                >
                  {isCollapsed ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  )}
                </button>
                {!isCollapsed && (
                  <div className="spatial-sidebar__title-group" style={{ textAlign: 'right' }}>
                      <h3 className="text-heading" style={{fontSize: '1rem'}}>AI Copilot</h3>
                      <span className="text-muted" style={{fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end'}}>
                          {isModelPulling ? modelPullStatus : selectedModel.split(':')[0]}
                          <div style={{width: '6px', height: '6px', borderRadius: '50%', background: isModelPulling ? 'var(--muted)' : 'var(--terracotta)'}} />
                      </span>
                  </div>
                )}
            </div>

            {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              
              {/* Top Settings (Compact) */}
              <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <select className="spatial-select spatial-select--small" style={{flex: 1}} value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                  {feedbackOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select className="spatial-select spatial-select--small" style={{flex: 1}} value={selectedModel} onChange={(e) => setModel(e.target.value)}>
                  {models.flatMap(g => g.options).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {/* Center Output */}
              <div className={`ai-message-well ${isSuggesting ? 'ai-card--thinking' : ''}`} ref={responseRef}>
                {/* Empty State */}
                {!aiResponse && !isSuggesting && (
                    <div style={{textAlign: 'center', margin: 'auto', color: 'var(--muted)', fontSize: '0.9rem'}}>
                      <p>What should we focus on?</p>
                    </div>
                )}
                
                {/* AI Response Bubble */}
                {(aiResponse || isSuggesting) && (
                    <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', background: 'var(--panel)', border: isSuggesting ? '1px solid var(--terracotta)' : '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: aiResponse ? 'var(--ink)' : 'var(--muted)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {isSuggesting && !aiResponse ? 'Analyzing structure...' : aiResponse}
                      </div>
                    </div>
                )}
              </div>

              {/* Bottom Input: Anchored to the user */}
              <div className="ai-input-anchor">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSuggest(); } }}
                  placeholder="Ask for feedback (⌘+Enter)"
                  rows={2}
                  style={{
                    width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-subtle)', color: 'var(--ink)', resize: 'none', marginBottom: '0.5rem'
                  }}
                />
                <button
                  className={`btn ${isSuggesting ? 'btn--danger' : 'btn--primary'}`}
                  onClick={onSuggest}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isSuggesting ? '⏹ Stop Generation' : 'Analyze Current Chapter'}
                </button>
              </div>

            </div>
          )}
        </aside>
    );
}