const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = {
  uploadImage: (buffer, folder = 'tours') => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  },

  deleteImage: async (publicId) => {
    return cloudinary.uploader.destroy(publicId);
  },

  isConfigured: () => {
    const name = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    const placeholders = ['your_cloud_name', 'your_api_key', 'your_api_secret', 'xxx', ''];
    return !!(name && key && secret &&
      !placeholders.includes(name) &&
      !placeholders.includes(key) &&
      !placeholders.includes(secret)
    );
  }
};
