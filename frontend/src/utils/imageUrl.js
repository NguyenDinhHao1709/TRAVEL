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

export function getSharpImageUrl(url, maxWidth = 2200) {
  if (!url) return '';
  const normalizedUrl = String(url).trim();
  if (normalizedUrl.startsWith('/uploads/')) {
    return `${BACKEND_BASE}${normalizedUrl}`;
  }

  if (normalizedUrl.includes('res.cloudinary.com') && normalizedUrl.includes('/upload/')) {
    if (normalizedUrl.includes('/upload/f_auto') || normalizedUrl.includes('/upload/q_auto')) {
      return normalizedUrl;
    }
    const transform = `f_auto,q_auto:best,dpr_auto,c_limit,w_${maxWidth}`;
    return normalizedUrl.replace('/upload/', `/upload/${transform}/`);
  }

  try {
    const parsed = new URL(normalizedUrl);
    if (parsed.hostname.endsWith('images.unsplash.com')) {
      parsed.searchParams.set('w', String(maxWidth));
      if (!parsed.searchParams.get('q')) {
        parsed.searchParams.set('q', '80');
      }
      return parsed.toString();
    }
  } catch (error) {
    // Fall back to original URL when parsing fails
  }

  return normalizedUrl;
}

export function generateImageSrcset(url) {
  if (!url) return '';
  const normalizedUrl = String(url).trim();
  if (normalizedUrl.startsWith('/uploads/')) {
    const fullUrl = `${BACKEND_BASE}${normalizedUrl}`;
    return `${fullUrl} 1x`;
  }

  // Cloudinary: generate multiple sizes
  if (normalizedUrl.includes('res.cloudinary.com') && normalizedUrl.includes('/upload/')) {
    const sizes = [
      { w: 600, q: 80 },
      { w: 960, q: 80 },
      { w: 1440, q: 85 },
      { w: 2200, q: 90 }
    ];

    return sizes
      .map(({ w, q }) => {
        const baseUrl = normalizedUrl.split('/upload/')[0];
        const rest = normalizedUrl.split('/upload/')[1];
        const transform = `f_auto,q_${q},dpr_auto,c_limit,w_${w}`;
        return `${baseUrl}/upload/${transform}/${rest} ${w}w`;
      })
      .join(', ');
  }

  // Unsplash: generate multiple sizes
  try {
    const parsed = new URL(normalizedUrl);
    if (parsed.hostname.endsWith('images.unsplash.com')) {
      const sizes = [600, 960, 1440, 2200];
      return sizes
        .map((w) => {
          const p = new URL(parsed.toString());
          p.searchParams.set('w', String(w));
          p.searchParams.set('q', w <= 960 ? '75' : w <= 1440 ? '80' : '90');
          return `${p.toString()} ${w}w`;
        })
        .join(', ');
    }
  } catch (error) {
    // Fall back
  }

  return normalizedUrl;
}

export function getImageSizes() {
  return '(max-width: 640px) 90vw, (max-width: 1024px) 85vw, 85vw';
}
