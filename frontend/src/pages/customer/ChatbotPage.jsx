import { useEffect, useRef, useState } from 'react';
import { Card, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const initialBotMessage = {
  type: 'bot',
  text: 'Xin chào! Mình là trợ lý du lịch của HK2 Travel. Bạn có thể hỏi về giá, điểm đến, tour còn chỗ, lịch trình hoặc cách đặt tour.',
  suggestions: ['Gợi ý tour dưới 4 triệu', 'Tour nào còn chỗ nhiều?', 'Tư vấn tour Đà Nẵng']
};

const formatMoney = (value) => Number(value || 0).toLocaleString('vi-VN');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const getAssistantDisplayText = (text, tours) => {
  const message = String(text || '').trim();
  if (!Array.isArray(tours) || tours.length === 0) {
    return message;
  }

  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
  const nonBulletLines = lines.filter((line) => !line.startsWith('-'));

  if (nonBulletLines.length === 0) {
    return 'Mình đã liệt kê các tour phù hợp bên dưới.';
  }

  return nonBulletLines.join('\n');
};

const ChatbotPage = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([initialBotMessage]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const sessionHistoryKey = user?.id ? `chatbot_session_history_${user.id}` : null;

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [conversations, loading]);

  useEffect(() => {
    if (!user || !sessionHistoryKey) {
      setConversations([initialBotMessage]);
      return;
    }

    try {
      const raw = sessionStorage.getItem(sessionHistoryKey);
      if (!raw) {
        setConversations([initialBotMessage]);
        return;
      }

      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) {
        setConversations([initialBotMessage]);
        return;
      }

      setConversations(items);
    } catch {
      setConversations([initialBotMessage]);
    }
  }, [user, sessionHistoryKey]);

  useEffect(() => {
    if (!user || !sessionHistoryKey) return;
    sessionStorage.setItem(sessionHistoryKey, JSON.stringify(conversations));
  }, [conversations, user, sessionHistoryKey]);

  const ask = async (customText) => {
    const text = String(customText ?? message).trim();
    if (!text || loading) {
      return;
    }

    const userText = text;
    setMessage('');
    setLoading(true);
    setConversations((prev) => [...prev, { type: 'user', text: userText }]);

    try {
      const { data } = await client.post('/chatbot/ask', { message: userText });
      setConversations((prev) => [
        ...prev,
        {
          type: 'bot',
          text: data.reply || 'Mình chưa có thông tin phù hợp cho câu hỏi này.',
          tours: Array.isArray(data.tours) ? data.tours : [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          source: data.source
        }
      ]);
    } catch (error) {
      setConversations((prev) => [
        ...prev,
        {
          type: 'bot',
          text: error.response?.data?.message || 'Xin lỗi, hệ thống AI đang bận. Bạn thử lại sau ít phút nhé.'
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const askBySuggestion = (suggestion) => ask(suggestion);

  const handleSubmit = (event) => {
    event.preventDefault();
    ask();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div className="text-center mb-3">
        <div style={{ fontSize: '36px', lineHeight: 1 }}>🤖</div>
        <h4 className="mb-1" style={{ fontWeight: 700 }}>Trợ lý AI — HK2 Travel</h4>
        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Hỏi bất cứ điều gì về tour du lịch</p>
      </div>

      {/* Chat Container */}
      <div style={{
        background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', height: '65vh', minHeight: 400, overflow: 'hidden'
      }}>
        {/* Messages Area */}
        <div
          ref={listRef}
          style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {conversations.map((item, idx) => (
            <div key={idx}>
              {/* Chat Bubble */}
              <div style={{
                display: 'flex',
                justifyContent: item.type === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start', gap: '10px'
              }}>
                {/* Bot Avatar */}
                {item.type === 'bot' && (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#0d6efd', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', flexShrink: 0
                  }}>
                    🤖
                  </div>
                )}

                <div style={{ maxWidth: '75%' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: item.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: item.type === 'user' ? '#0d6efd' : '#ffffff',
                    color: item.type === 'user' ? '#ffffff' : '#1e293b',
                    fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-line',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    position: 'relative'
                  }}>
                    {item.type === 'bot'
                      ? getAssistantDisplayText(item.text, item.tours)
                      : item.text}
                    {item.type === 'bot' && item.source && (
                      <Badge
                        bg={item.source === 'openai' ? 'success' : 'secondary'}
                        style={{ position: 'absolute', top: 6, right: 8, fontSize: '10px' }}
                      >
                        {item.source === 'openai' ? 'AI Pro' : 'AI'}
                      </Badge>
                    )}
                  </div>

                  {/* Tour Cards */}
                  {item.type === 'bot' && Array.isArray(item.tours) && item.tours.length > 0 && (
                    <div className="d-flex flex-column gap-2 mt-2">
                      {item.tours.map((tour) => (
                        <Card key={tour.id} className="border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                          <Card.Body className="py-2 px-3" style={{ fontSize: '13px' }}>
                            <div className="fw-bold mb-1" style={{ color: '#0d6efd' }}>
                              <Link to={`/tours/${tour.id}`} style={{ textDecoration: 'none', color: '#0d6efd' }}>
                                {tour.title}
                              </Link>
                            </div>
                            <div className="d-flex flex-wrap gap-2 text-muted" style={{ fontSize: '12px' }}>
                              <span>📍 {tour.destination}</span>
                              <span>💰 {formatMoney(tour.price)} VND</span>
                              <span>📅 {formatDate(tour.startDate)} - {formatDate(tour.endDate)}</span>
                              <span>👤 Còn {tour.availableSlots} chỗ</span>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {item.type === 'bot' && Array.isArray(item.suggestions) && item.suggestions.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap mt-2">
                      {item.suggestions.map((suggestion) => (
                        <button
                          key={`${idx}-${suggestion}`}
                          onClick={() => askBySuggestion(suggestion)}
                          disabled={loading}
                          style={{
                            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                            border: '1px solid #0d6efd', background: '#fff', color: '#0d6efd',
                            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                            opacity: loading ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => { if (!loading) { e.target.style.background = '#0d6efd'; e.target.style.color = '#fff'; } }}
                          onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.color = '#0d6efd'; }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {item.type === 'user' && (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#6366f1', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, flexShrink: 0
                  }}>
                    {(user?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#0d6efd', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0
              }}>
                🤖
              </div>
              <div style={{
                padding: '12px 20px', borderRadius: '16px 16px 16px 4px',
                background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <div className="d-flex align-items-center gap-2">
                  <Spinner animation="grow" size="sm" style={{ width: 8, height: 8, animationDelay: '0ms' }} />
                  <Spinner animation="grow" size="sm" style={{ width: 8, height: 8, animationDelay: '150ms' }} />
                  <Spinner animation="grow" size="sm" style={{ width: 8, height: 8, animationDelay: '300ms' }} />
                  <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: 4 }}>Đang phân tích...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ padding: '12px 20px 16px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <Form onSubmit={handleSubmit}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f1f5f9', borderRadius: '24px', padding: '4px 4px 4px 16px'
            }}>
              <Form.Control
                ref={inputRef}
                placeholder="Nhập câu hỏi của bạn..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                style={{
                  border: 'none', background: 'transparent', boxShadow: 'none',
                  padding: '8px 0', fontSize: '14px'
                }}
              />
              <Button
                type="submit"
                disabled={loading || !message.trim()}
                style={{
                  borderRadius: '50%', width: 40, height: 40, padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '18px', border: 'none',
                  background: message.trim() ? '#0d6efd' : '#cbd5e1',
                  transition: 'background 0.2s'
                }}
              >
                ✈
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
