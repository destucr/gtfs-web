import axios from 'axios';
import { setupMockApi } from './mockApi';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
});

if (import.meta.env.VITE_DEMO_MODE === 'true') {
  setupMockApi(api);
}

export default api;
