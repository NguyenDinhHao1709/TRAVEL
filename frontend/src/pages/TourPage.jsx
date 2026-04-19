import React, { useEffect, useState } from 'react';
import api from '../api/client';
import ApiStatus from '../components/ApiStatus';

function TourPage() {
  const [status, setStatus] = useState('idle');
  const [tours, setTours] = useState([]);

  useEffect(() => {
    setStatus('loading');
    api.get('/tours')
      .then(res => {
        setTours(res.data);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div>
      <h2>Trang Tour</h2>
      <ApiStatus status={status} />
      <ul>
        {tours.map(tour => (
          <li key={tour.id}>{tour.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default TourPage;
