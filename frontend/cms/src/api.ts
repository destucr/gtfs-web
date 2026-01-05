import axios, { AxiosInstance } from 'axios';
import { setupMockApi } from './mockApi';

const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
});

// Setup mock API immediately if in demo mode
if (import.meta.env.VITE_DEMO_MODE === 'true') {
    setupMockApi(api);
    console.log('✅ Mock API initialized for demo mode');
}

export default api;
