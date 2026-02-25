import axios from "axios";
import { getAuth, logout } from "./auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
});

// Attach token only if valid (not expired)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const { token } = getAuth();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      logout();
    }
    return Promise.reject(err);
  }
);