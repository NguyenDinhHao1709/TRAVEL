import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000)
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    error.normalizedStatus = error.response?.status;
    error.normalizedMessage = error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(error);
  }
);

export default client;
