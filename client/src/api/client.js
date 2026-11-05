import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Response envelope is { ok, data, error } — unwrap data for errors
api.interceptors.response.use(
  (res) => res.data?.ok ? { ...res, data: res.data.data } : res.data?.data !== undefined ? { ...res, data: res.data.data } : res,
  (err) => Promise.reject(new Error(err.response?.data?.error?.message || err.message || 'Request failed'))
);

export default api;
export { api };
