const cloudinaryService = require('../services/cloudinary.service');
const path = require('path');
const fs = require('fs');
let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

async function processImage(buffer) {
  if (!sharp) return buffer;
  return sharp(buffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

async function saveLocalFile(buffer, originalname) {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const processed = await processImage(buffer);
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), processed);
  return `/uploads/${filename}`;
}

exports.uploadTourImages = async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'Không có file nào được tải lên' });
  }

  if (cloudinaryService.isConfigured()) {
    const uploadResults = await Promise.all(
      files.map((file) => cloudinaryService.uploadImage(file.buffer, 'tours'))
    );
    const imageUrls = uploadResults.map((r) => r.url);
    return res.json({ imageUrls, imageUrl: imageUrls[0] });
  }

  // Fallback: lưu local khi Cloudinary chưa cấu hình
  const imageUrls = await Promise.all(files.map((file) => saveLocalFile(file.buffer, file.originalname)));
  return res.json({ imageUrls, imageUrl: imageUrls[0] });
};

exports.uploadSingleImage = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'Không có file nào được tải lên' });

  if (cloudinaryService.isConfigured()) {
    const folder = req.params.folder || 'uploads';
    const result = await cloudinaryService.uploadImage(file.buffer, folder);
    return res.json({ imageUrl: result.url });
  }

  // Fallback: lưu local
  const imageUrl = await saveLocalFile(file.buffer, file.originalname);
  return res.json({ imageUrl });
};
