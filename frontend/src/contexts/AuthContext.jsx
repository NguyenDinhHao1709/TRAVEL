import { createContext, useContext, useMemo, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Validate user object — role must be a plain string
      if (!parsed || typeof parsed.role !== 'string' || !parsed.email) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return null;
    }
  });

  const login = async (email, password, captchaToken, captchaText) => {
    const { data } = await client.post('/auth/login', { email, password, captchaToken, captchaText });
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const requestRegisterOtp = async (fullName, email, password) => {
    const { data } = await client.post('/auth/register/request-otp', { fullName, email, password });
    return data;
  };

  const register = async (registerToken, otpCode) => {
    const { data } = await client.post('/auth/register', { registerToken, otpCode });
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    const sessionKeys = Object.keys(sessionStorage);
    for (const key of sessionKeys) {
      if (key.startsWith('chatbot_session_history_')) {
        sessionStorage.removeItem(key);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(() => ({ user, login, register, requestRegisterOtp, logout, updateUser }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
