import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import client from '../../api/client';

const getSharpImageUrl = (url, maxWidth = 2200) => {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) return '';

  if (!normalizedUrl.includes('res.cloudinary.com') || !normalizedUrl.includes('/upload/')) {
    return normalizedUrl;
  }

  if (normalizedUrl.includes('/upload/f_auto') || normalizedUrl.includes('/upload/q_auto')) {
    return normalizedUrl;
  }

  const transform = `f_auto,q_auto:best,dpr_auto,c_limit,w_${maxWidth}`;
  return normalizedUrl.replace('/upload/', `/upload/${transform}/`);
};

const ArticleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await client.get(`/articles/${id}`);
        setArticle(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải bài viết');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" />
        <div className="mt-2">Đang tải bài viết...</div>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mb-0">{error}</Alert>;
  }

  if (!article) {
    return <Alert variant="info" className="mb-0">Không tìm thấy bài viết.</Alert>;
  }

  const articleImageUrl = getSharpImageUrl(article.image_url, 2200);

  return (
    <Card className="border-0 shadow-sm">
      {articleImageUrl && (
        <div style={{ background: '#f3f6fb' }}>
          <img
            src={articleImageUrl}
            alt={article.title}
            loading="eager"
            decoding="async"
            style={{
              width: '100%',
              maxHeight: '72vh',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
      )}
      <Card.Body>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          {article.tour_id ? <Badge bg="primary">Tour liên quan</Badge> : <Badge bg="secondary">Cẩm nang chung</Badge>}
          <small className="text-muted">{new Date(article.created_at).toLocaleDateString('vi-VN')}</small>
          {article.tour_title && <small className="text-muted">• {article.tour_title}</small>}
        </div>

        <h3 className="mb-3">{article.title}</h3>
        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{article.content || 'Chưa có nội dung.'}</div>

        <div className="d-flex gap-2 mt-4">
          <Button variant="outline-secondary" onClick={() => navigate('/articles')}>
            Quay lại danh sách
          </Button>
          {article.tour_id && (
            <Button as={Link} to={`/tours/${article.tour_id}`} variant="outline-primary">
              Xem tour liên quan
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ArticleDetailPage;
