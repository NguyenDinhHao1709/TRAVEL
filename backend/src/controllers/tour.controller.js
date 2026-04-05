const pool = require('../config/db');

const parseImageUrls = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(trimmedValue);
    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [trimmedValue];
  } catch {
    return [trimmedValue];
  }
};

const serializeImageUrls = (imageUrls, imageUrl) => {
  const normalizedImages = parseImageUrls(imageUrls && imageUrls.length !== undefined ? imageUrls : imageUrl);
  return normalizedImages.length ? JSON.stringify(normalizedImages) : null;
};

const normalizeTour = (tour) => {
  const imageUrls = parseImageUrls(tour.image_url);

  return {
    ...tour,
    image_url: imageUrls[0] || '',
    image_urls: imageUrls
  };
};

const getTours = async (req, res) => {
  try {
    const { search = '', title = '', destination = '', minPrice = 0, maxPrice = 999999999 } = req.query;
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedDestination = typeof destination === 'string' ? destination.trim() : '';

    const parsedMinPrice = minPrice === '' || minPrice === undefined ? 0 : Number(minPrice);
    const parsedMaxPrice = maxPrice === '' || maxPrice === undefined ? 999999999 : Number(maxPrice);

    const safeMinPrice = Number.isNaN(parsedMinPrice) ? 0 : parsedMinPrice;
    const safeMaxPrice = Number.isNaN(parsedMaxPrice) ? 999999999 : parsedMaxPrice;

    const [rows] = await pool.query(
      `SELECT * FROM tours
       WHERE title LIKE ?
         AND destination LIKE ?
         AND price BETWEEN ? AND ?
       ORDER BY created_at DESC`,
      [
        `%${normalizedTitle || normalizedSearch}%`,
        `%${normalizedDestination || normalizedSearch}%`,
        safeMinPrice,
        safeMaxPrice
      ]
    );

    return res.json(rows.map(normalizeTour));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getFeaturedTours = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, COUNT(b.id) AS booking_count
       FROM tours t
       LEFT JOIN bookings b
         ON b.tour_id = t.id
         AND b.booking_status <> 'cancelled'
       GROUP BY t.id
       ORDER BY booking_count DESC, t.created_at DESC
       LIMIT 3`
    );

    return res.json(rows.map((tour) => ({ ...normalizeTour(tour), booking_count: Number(tour.booking_count || 0) })));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTourById = async (req, res) => {
  try {
    const { id } = req.params;
    const [tourRows] = await pool.query('SELECT * FROM tours WHERE id = ?', [id]);

    if (!tourRows.length) {
      return res.status(404).json({ message: 'Tour not found' });
    }

    const [reviewRows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              r.staff_reply, r.staff_reply_at,
              u.full_name,
              ru.full_name AS reply_staff_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN users ru ON ru.id = r.staff_reply_by
       WHERE r.tour_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    return res.json({ ...normalizeTour(tourRows[0]), reviews: reviewRows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createTour = async (req, res) => {
  try {
    const { title, destination, itinerary, price, startDate, endDate, slots, imageUrl, imageUrls, latitude, longitude } = req.body;
    const serializedImages = serializeImageUrls(imageUrls, imageUrl);
    const [result] = await pool.query(
      `INSERT INTO tours (title, destination, itinerary, price, start_date, end_date, slots, image_url, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, destination, itinerary, price, startDate, endDate, slots, serializedImages, latitude, longitude]
    );

    return res.status(201).json({ id: result.insertId, message: 'Tour created' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateTour = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, destination, itinerary, price, startDate, endDate, slots, imageUrl, imageUrls, latitude, longitude } = req.body;
    const serializedImages = serializeImageUrls(imageUrls, imageUrl);

    await pool.query(
      `UPDATE tours
       SET title = ?, destination = ?, itinerary = ?, price = ?, start_date = ?, end_date = ?, slots = ?, image_url = ?, latitude = ?, longitude = ?
       WHERE id = ?`,
      [title, destination, itinerary, price, startDate, endDate, slots, serializedImages, latitude, longitude, id]
    );

    return res.json({ message: 'Tour updated' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteTour = async (req, res) => {
  try {
    await pool.query('DELETE FROM tours WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Tour deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getTours, getFeaturedTours, getTourById, createTour, updateTour, deleteTour };
