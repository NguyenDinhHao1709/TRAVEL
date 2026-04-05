const { uploadImage } = require('../services/cloudinary.service');
const fs = require('fs').promises;
const path = require('path');

const getLocalImageUrl = (req, filePath) => {
  const fileName = path.basename(filePath);
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
};

const uploadSingleFile = async (req, file, folderName) => {
  try {
    const imageUrl = await uploadImage(file.path, folderName);
    await fs.unlink(file.path);
    return imageUrl;
  } catch (cloudinaryError) {
    return getLocalImageUrl(req, file.path);
  }
};

const uploadTourImage = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrls = await Promise.all(
      files.map((file) => uploadSingleFile(req, file, 'travel-tours'))
    );

    return res.status(200).json({
      imageUrl: imageUrls[0],
      imageUrls,
      note: 'Uploaded successfully'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const imageUrl = await uploadImage(req.file.path, 'travel-banners');
      await fs.unlink(req.file.path);
      return res.status(200).json({ imageUrl });
    } catch (cloudinaryError) {
      const imageUrl = getLocalImageUrl(req, req.file.path);
      return res.status(200).json({ imageUrl, note: 'Uploaded to local storage because Cloudinary is not configured' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const uploadArticleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = await uploadSingleFile(req, req.file, 'travel-articles');
    return res.status(200).json({ imageUrl });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadTourImage, uploadBannerImage, uploadArticleImage };
