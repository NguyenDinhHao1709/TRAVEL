/**
 * Chuẩn hóa URL ảnh:
 * - URL Cloudinary (https://...) → giữ nguyên
 * - URL upload local (/uploads/...) → thêm tiền tố backend base URL
 *   để ảnh không bị tải từ frontend server
 */
const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export function getImageUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (s.startsWith('/uploads/')) return `${BACKEND_BASE}${s}`;
  return s;
}
