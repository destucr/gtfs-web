import { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import demoData from './demo-data.json';

export const setupMockApi = (api: AxiosInstance) => {
    const mock = new MockAdapter(api as any, { delayResponse: 500 });

    console.log('👷 Mocking API for Web Viewer Demo');

    // Dynamic endpoints (GET only for demo)
    Object.keys(demoData).forEach(endpoint => {
        if (endpoint.startsWith('/')) {
            mock.onGet(endpoint).reply(200, (demoData as any)[endpoint]);
        }
    });

    // Special Detail Handlers (Using more robust matching)
    mock.onGet(/\/shapes\//).reply((config) => {
        const url = config.url || '';
        const parts = url.split('/');
        const id = parts[parts.length - 1]?.split('?')[0] || '';
        const details = (demoData as any)['/shapes/detail'] || {};
        const detail = details[id];
        
        console.log(`🔍 [Mock Web] GET Shape ID: "${id}" from URL: "${url}"`);
        return detail ? [200, detail] : [404, { error: `Shape ${id} not found in demo data` }];
    });

    mock.onGet(/\/stops\/.*\/times/).reply((config) => {
        const url = config.url || '';
        const match = url.match(/\/stops\/([^\/\?]+)\/times/);
        const id = match ? match[1] : null;
        const timeData = (demoData as any)['/stops/times'] || {};
        const times = id ? timeData[id] : null;
        
        console.log(`🔍 [Mock Web] GET Stop Times ID: "${id}" from URL: "${url}"`);
        return times ? [200, times] : [200, []];
    });

    // Fallback for everything else
    mock.onAny().passThrough();
};
