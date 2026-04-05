const cloudinary = require('cloudinary').v2;

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
};

const getDeliveryMaxWidth = (folder = '') => {
  const normalizedFolder = String(folder || '').toLowerCase();

  if (normalizedFolder.includes('article')) return 2200;
  if (normalizedFolder.includes('tour')) return 2560;
  if (normalizedFolder.includes('banner')) return 2560;
  return 2048;
};

const isCloudinaryConfigured = () => {
  const invalidValues = ['MOCK', 'xxx', 'your_cloud_name', 'your_api_key', 'your_api_secret'];
  return Object.values(cloudinaryConfig).every((value) => value && !invalidValues.includes(String(value).trim()));
};

cloudinary.config(cloudinaryConfig);

const uploadImage = async (filePath, folder = 'travel-management') => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary chưa được cấu hình, fallback sang lưu local');
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto'
    });

    const optimizedUrl = cloudinary.url(result.public_id, {
      secure: true,
      fetch_format: 'auto',
      quality: 'auto:best',
      dpr: 'auto',
      flags: 'progressive',
      transformation: [
        {
          crop: 'limit',
          width: getDeliveryMaxWidth(folder)
        }
      ]
    });

    return optimizedUrl || result.secure_url;
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
};

module.exports = { uploadImage, deleteImage };
