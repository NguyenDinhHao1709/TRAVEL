import { useState, useRef } from 'react';
import { Form, Alert, ProgressBar } from 'react-bootstrap';
import client from '../api/client';

const ImageUpload = ({ onUploadSuccess, folder = 'tour', multiple = false }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef();

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const formData = new FormData();
    if (multiple) {
      files.forEach((file) => formData.append('files', file));
    } else {
      formData.append('file', files[0]);
    }

    setUploading(true);
    setMessage('');

    try {
      const endpoint = folder === 'banner' ? '/upload/banner' : '/upload/tour';
      const { data } = await client.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percent);
        }
      });

      setMessage('Tải ảnh thành công');
      onUploadSuccess(multiple ? (data.imageUrls || []) : data.imageUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>{multiple ? 'Tải lên nhiều ảnh' : 'Tải ảnh lên'}</Form.Label>
        <Form.Control
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={uploading}
          accept="image/*"
          multiple={multiple}
        />
      </Form.Group>
      {uploading && <ProgressBar now={progress} label={`${progress}%`} className="mb-2" />}
      {message && <Alert variant={message.includes('thành công') ? 'success' : 'danger'}>{message}</Alert>}
    </div>
  );
};

export default ImageUpload;
