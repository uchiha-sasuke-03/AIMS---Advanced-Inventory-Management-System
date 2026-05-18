import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Code, Table } from 'lucide-react';
import api from '../../utils/api';
import './AIChatPanel.css';

export default function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your AI Data Agent. Ask me anything about your inventory in plain English.\n\nExamples:\n• "Show all laptops in stock in Bengaluru"\n• "How many assets are allocated?"\n• "List employees in Engineering department"', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', text: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai-agent', { prompt: userMsg.text });
      const { generatedQuery, result } = res.data;

      let responseText = '';
      let tableData = null;

      if (result.type === 'select') {
        responseText = `Found ${result.rowCount} result(s):`;
        if (result.data && result.data.length > 0) {
          tableData = result.data;
        }
      } else {
        responseText = result.message || 'Query executed successfully.';
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: responseText,
        query: generatedQuery,
        tableData,
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Error: ${err.response?.data?.error || err.message}`,
        isError: true,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button className="ai-chat-fab" onClick={() => setIsOpen(true)} title="AI Data Agent">
        <Bot size={24} />
        <span className="fab-pulse" />
      </button>
    );
  }

  return (
    <div className={`ai-chat-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="ai-chat-header">
        <div className="ai-chat-header-info">
          <Bot size={18} />
          <span>AI Data Agent</span>
          <span className="ai-badge">NL2SQL</span>
        </div>
        <div className="ai-chat-header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)} className="btn-ghost">
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="btn-ghost">
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                <div className="message-bubble">
                  <p className="message-text">{msg.text}</p>
                  
                  {msg.query && (
                    <details className="query-details">
                      <summary><Code size={12} /> SQL Query</summary>
                      <pre className="query-code">{msg.query}</pre>
                    </details>
                  )}

                  {msg.tableData && msg.tableData.length > 0 && (
                    <div className="chat-table-wrapper">
                      <table className="chat-table">
                        <thead>
                          <tr>
                            {Object.keys(msg.tableData[0]).map(key => (
                              <th key={key}>{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.tableData.slice(0, 20).map((row, i) => (
                            <tr key={i}>
                              {Object.values(row).map((val, j) => (
                                <td key={j}>{val === null ? '—' : String(val)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {msg.tableData.length > 20 && (
                        <p className="text-xs text-secondary" style={{ marginTop: '0.5rem' }}>
                          Showing 20 of {msg.tableData.length} results
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your inventory..."
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
