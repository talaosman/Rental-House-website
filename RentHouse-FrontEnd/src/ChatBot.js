import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

// ─── Menu options config ───────────────────────────────────────────────────────
const MENU_OPTIONS = [
  { num: 1, emoji: '💡', label: 'Personalized Picks',  desc: 'Based on your history' },
  { num: 2, emoji: '🔥', label: 'Trending Now',        desc: 'Most-rented properties' },
  { num: 3, emoji: '💰', label: 'Market Prices',       desc: 'Averages & ranges' },
  { num: 4, emoji: '📊', label: 'Market Health',       desc: 'Vacancy & demand' },
  { num: 5, emoji: '🗂️', label: 'My Rental History',  desc: 'Past bookings & spend' },
  { num: 6, emoji: '❤️', label: 'My Favourites',       desc: 'Your saved properties' },
];

const EXAMPLE_CHIPS = [
  '2-bed in Dubai under $1,200',
  'Cheapest villa with pool',
  'Compare Sunset Villa vs Ocean Breeze',
  'Move-in cost estimate',
];

// ─── Minimal markdown → JSX renderer ─────────────────────────────────────────
function renderMarkdown(raw) {
  if (!raw) return null;
  const lines = raw.split('\n');
  const out = [];
  let tableAcc = [];
  let i = 0;

  function flushTable() {
    if (!tableAcc.length) return;
    const [hdr, , ...body] = tableAcc;
    const cols = hdr.split('|').map(c => c.trim()).filter(Boolean);
    out.push(
      <div key={`tbl-${i}`} className="cb-table-wrap">
        <table className="cb-table">
          <thead><tr>{cols.map((c, ci) => <th key={ci}>{inlineFmt(c)}</th>)}</tr></thead>
          <tbody>
            {body.map((row, ri) => {
              const cells = row.split('|').map(c => c.trim()).filter(Boolean);
              return <tr key={ri}>{cells.map((cell, ci) => <td key={ci}>{inlineFmt(cell)}</td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
    );
    tableAcc = [];
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('|')) { tableAcc.push(line); i++; continue; }
    if (tableAcc.length) flushTable();

    const h1 = line.match(/^# (.+)/);
    if (h1) { out.push(<h2 key={i} className="cb-h1">{inlineFmt(h1[1])}</h2>); i++; continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { out.push(<h3 key={i} className="cb-h2">{inlineFmt(h2[1])}</h3>); i++; continue; }
    const h3m = line.match(/^### (.+)/);
    if (h3m) { out.push(<h4 key={i} className="cb-h3">{inlineFmt(h3m[1])}</h4>); i++; continue; }
    if (line.trim().match(/^[─━=\-]{4,}$/)) { out.push(<hr key={i} className="cb-hr" />); i++; continue; }
    const bq = line.match(/^> (.+)/);
    if (bq) { out.push(<blockquote key={i} className="cb-bq">{inlineFmt(bq[1])}</blockquote>); i++; continue; }

    if (line.match(/^[*\-] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[*\-] /)) { items.push(lines[i].replace(/^[*\-] /, '')); i++; }
      out.push(<ul key={i} className="cb-ul">{items.map((it, idx) => <li key={idx}>{inlineFmt(it)}</li>)}</ul>);
      continue;
    }
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(lines[i].replace(/^\d+\. /, '')); i++; }
      out.push(<ol key={i} className="cb-ol">{items.map((it, idx) => <li key={idx}>{inlineFmt(it)}</li>)}</ol>);
      continue;
    }
    if (!line.trim()) { out.push(<div key={i} className="cb-spacer" />); i++; continue; }
    out.push(<p key={i} className="cb-p">{inlineFmt(line)}</p>);
    i++;
  }
  if (tableAcc.length) flushTable();
  return out;
}

function inlineFmt(text) {
  if (!text) return text;
  const parts = [];
  let key = 0, last = 0;
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    if (m[2]) parts.push(<strong key={key++} style={{ fontStyle: 'italic' }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<strong key={key++}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em key={key++}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={key++} className="cb-code">{m[5]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

// ─── Collapsible answer card ──────────────────────────────────────────────────
function AnswerCard({ text, optionNum, isLatest }) {
  const [open, setOpen] = useState(isLatest);
  const opt = optionNum ? MENU_OPTIONS.find(o => o.num === optionNum) : null;

  return (
    <div className={`cb-answer-card ${open ? 'cb-answer-open' : ''}`}>
      <button className="cb-answer-header" onClick={() => setOpen(o => !o)}>
        <span className="cb-answer-icon">{opt ? opt.emoji : '💬'}</span>
        <span className="cb-answer-title">{opt ? opt.label : 'Assistant'}</span>
        <svg className={`cb-chevron ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="cb-answer-body">
          {renderMarkdown(text)}
        </div>
      )}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="cb-typing">
      <div className="cb-typing-avatar">🏠</div>
      <div className="cb-dots"><span /><span /><span /></div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
    }
  }, [chatHistory, loading, open]);

  const sendRaw = async (message, optionNum = null) => {
    if (!message.trim()) return;
    setLoading(true);
    setChatHistory(prev => [...prev, { sender: 'user', text: message, optionNum }]);

    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, username, userId }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'bot', text: data.reply, optionNum }]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setChatHistory(prev => [...prev, { sender: 'bot', text: 'Error contacting assistant.', optionNum: null }]);
    }

    setLoading(false);
    setSelectedOption(null);
  };

  const handleOptionClick = (opt) => {
    if (loading) return;
    setSelectedOption(opt.num);
    sendRaw(`option ${opt.num}`, opt.num);
  };

  const handleSend = () => {
    const msg = userMessage.trim();
    if (!msg || loading) return;
    setUserMessage('');
    sendRaw(msg, null);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* FAB */}
      <button className={`cb-fab ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Toggle chat">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!open && unread > 0 && <span className="cb-badge">{unread}</span>}
      </button>

      {/* Panel */}
      <div className={`cb-panel ${open ? 'open' : ''}`}>

        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-avatar">🏠</div>
          <div className="cb-header-info">
            <span className="cb-header-title">RentalHub Assistant</span>
            <span className="cb-header-sub"><span className="cb-status-dot" /> Online · AI-powered</span>
          </div>
          <button className="cb-header-close" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Chat window */}
        <div className="cb-window">
          {chatHistory.length === 0 && (
            <div className="cb-empty">
              <div className="cb-empty-icon">🏡</div>
              <p className="cb-empty-title">How can I help you?</p>
              <p className="cb-empty-sub">Choose an option or ask anything below</p>
            </div>
          )}
          {chatHistory.map((msg, idx) => {
            const isLast = idx === chatHistory.length - 1;
            if (msg.sender === 'user') {
              return (
                <div key={idx} className="cb-msg-wrap user">
                  <div className="cb-bubble user">{msg.text}</div>
                </div>
              );
            }
            return (
              <div key={idx} className="cb-msg-wrap bot">
                <AnswerCard text={msg.text} optionNum={msg.optionNum} isLatest={isLast} />
              </div>
            );
          })}
          {loading && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Radio options */}
        <div className="cb-options-panel">
          <span className="cb-options-label">Quick options</span>
          <div className="cb-options-grid">
            {MENU_OPTIONS.map(opt => {
              const sel = selectedOption === opt.num;
              return (
                <button
                  key={opt.num}
                  className={`cb-radio-card ${sel ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(opt)}
                  disabled={loading}
                >
                  <span className={`cb-radio-circle ${sel ? 'checked' : ''}`}>
                    {sel && <span className="cb-radio-dot" />}
                  </span>
                  <span className="cb-radio-emoji">{opt.emoji}</span>
                  <div className="cb-radio-text">
                    <span className="cb-radio-label">{opt.label}</span>
                    <span className="cb-radio-desc">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="cb-chips">
            {EXAMPLE_CHIPS.map(chip => (
              <button key={chip} className="cb-chip"
                onClick={() => { setUserMessage(chip); inputRef.current?.focus(); }}>
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="cb-input-row">
          <textarea
            ref={inputRef}
            className="cb-textarea"
            value={userMessage}
            onChange={e => setUserMessage(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything — location, price, type…"
            rows={1}
          />
          <button
            className={`cb-send-btn ${userMessage.trim() && !loading ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!userMessage.trim() || loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatBot;