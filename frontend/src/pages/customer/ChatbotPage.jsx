import { useEffect, useRef, useState } from 'react';
import { Card, Form, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
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
    }
  };

  const askBySuggestion = (suggestion) => ask(suggestion);

  const handleSubmit = (event) => {
    event.preventDefault();
    ask();
  };

  return (
    <Card>
      <Card.Body>
        <h4 className="mb-3">Trợ lý AI</h4>

        <div
          ref={listRef}
          style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}
          className="mb-3"
        >
          <ListGroup>
          {conversations.map((item, idx) => (
            <ListGroup.Item key={idx}>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div style={{ whiteSpace: 'pre-line' }}>
                  <strong>{item.type === 'user' ? 'Bạn' : 'Trợ lý'}:</strong>{' '}
                  {item.type === 'bot'
                    ? getAssistantDisplayText(item.text, item.tours)
                    : item.text}
                </div>
                {item.type === 'bot' && (
                  <Badge bg={item.source === 'openai' ? 'success' : 'secondary'}>
                    {item.source === 'openai' ? 'AI Pro' : 'AI'}
                  </Badge>
                )}
              </div>

              {item.type === 'bot' && Array.isArray(item.tours) && item.tours.length > 0 && (
                <div className="mt-2">
                  {item.tours.map((tour) => (
                    <Card key={tour.id} className="mb-2">
                      <Card.Body className="py-2">
                        <div className="fw-semibold">{tour.title}</div>
                        <div>Điểm đến: {tour.destination}</div>
                        <div>Giá: {formatMoney(tour.price)} VND</div>
                        <div>Thời gian: {formatDate(tour.startDate)} - {formatDate(tour.endDate)}</div>
                        <div>Còn chỗ: {tour.availableSlots}</div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}

              {item.type === 'bot' && Array.isArray(item.suggestions) && item.suggestions.length > 0 && (
                <div className="d-flex gap-2 flex-wrap mt-2">
                  {item.suggestions.map((suggestion) => (
                    <Button
                      key={`${idx}-${suggestion}`}
                      size="sm"
                      variant="outline-primary"
                      onClick={() => askBySuggestion(suggestion)}
                      disabled={loading}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </ListGroup.Item>
          ))}
          </ListGroup>

          {loading && (
            <div className="text-center mt-3">
              <Spinner animation="border" size="sm" className="me-2" />
              Trợ lý đang phân tích yêu cầu...
            </div>
          )}
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-2">
            <Form.Control
              placeholder="Ví dụ: Gợi ý tour Đà Nẵng dưới 5 triệu còn chỗ"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
          </Form.Group>
          <Button type="submit" disabled={loading || !message.trim()}>
            {loading ? 'Đang xử lý...' : 'Gửi'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ChatbotPage;
