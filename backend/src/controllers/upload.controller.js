const cloudinaryService = require('../services/cloudinary.service');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

function saveLocalFile(buffer, originalname) {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalname) || '.jpg';
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
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
  const imageUrls = files.map((file) => saveLocalFile(file.buffer, file.originalname));
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
  const imageUrl = saveLocalFile(file.buffer, file.originalname);
  return res.json({ imageUrl });
};
