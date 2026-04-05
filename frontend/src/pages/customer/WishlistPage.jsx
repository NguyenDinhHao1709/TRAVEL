import { useEffect, useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const WishlistPage = () => {
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await client.get('/wishlists/my');
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (tourId) => {
    await client.delete(`/wishlists/my/${tourId}`);
    load();
  };

  return (
    <>
      <h3 className="mb-3">Danh sách yêu thích</h3>
      {items.map((item) => (
        <Card key={item.id} className="mb-2">
          <Card.Body className="d-flex justify-content-between align-items-center">
            <div>
              <h5>{item.title}</h5>
              <p className="mb-0">{item.destination} - {Number(item.price).toLocaleString()} VND</p>
            </div>
            <div className="d-flex gap-2">
              <Button as={Link} to={`/tours/${item.tour_id}`}>Chi tiết</Button>
              <Button variant="outline-danger" onClick={() => remove(item.tour_id)}>Xóa</Button>
            </div>
          </Card.Body>
        </Card>
      ))}
    </>
  );
};

export default WishlistPage;
