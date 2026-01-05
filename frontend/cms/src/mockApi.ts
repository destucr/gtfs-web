import { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import demoData from './demo-data.json';

export const setupMockApi = (api: AxiosInstance) => {
    const mock = new MockAdapter(api, { delayResponse: 500 });

    console.log('👷 Mocking API for CMS Demo Mode');
    console.log('📋 Base URL:', api.defaults.baseURL);

    // Dynamic endpoints (GET only for demo)
    // Note: axios-mock-adapter matches against relative URLs (without baseURL)
    Object.keys(demoData).forEach(endpoint => {
        if (endpoint.startsWith('/')) {
            mock.onGet(endpoint).reply(200, (demoData as any)[endpoint]);
        }
    });

    // Special Detail Handlers
    // Note: axios-mock-adapter matches against the relative URL (without baseURL)
    // So /shapes/SHP_K4 matches, not /api/shapes/SHP_K4
    // filter(Boolean) handles trailing slashes
    const extractId = (url: string) => url.split('/').filter(Boolean).pop()?.split('?')[0] || '';

    // Register shape handler BEFORE the fallback to ensure it catches shape requests
    mock.onGet(/^\/shapes\/[^\/]+$/).reply((config) => {
        const url = config.url || '';
        const id = extractId(url);
        const details = (demoData as any)['/shapes/detail'] || {};
        const detail = details[id];
        
        console.log(`🔍 [Mock] SHAPE Request: "${url}" -> ID: "${id}" -> ${detail ? '✅ FOUND' : '❌ NOT FOUND'}`);
        if (!detail) {
            console.warn(`⚠️ [Mock] Shape "${id}" not found. Available shapes:`, Object.keys(details));
            // Return empty array instead of 404 to prevent errors
            return [200, []];
        }
        
        return [200, detail];
    });
    
    // Also handle shapes with query params
    mock.onGet(/^\/shapes\/[^\/]+/).reply((config) => {
        const url = config.url || '';
        const id = extractId(url);
        const details = (demoData as any)['/shapes/detail'] || {};
        const detail = details[id];
        
        if (detail) {
            console.log(`🔍 [Mock] SHAPE Request (with params): "${url}" -> ID: "${id}" -> ✅ FOUND`);
            return [200, detail];
        }
        return [200, []];
    });

    mock.onPost(/^\/shapes\/bulk/).reply((config) => {
        const ids = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        console.log(`🔍 [Mock] BULK SHAPES Request:`, ids);
        const result: Record<string, any> = {};
        const details = (demoData as any)['/shapes/detail'] || {};
        ids.forEach((id: string) => {
            if (details[id]) result[id] = details[id];
        });
        return [200, result];
    });

    mock.onGet(/^\/trips\/[^\/]+\/stops/).reply((config) => {
        const url = config.url || '';
        const parts = url.split('/');
        // URL is /trips/ID/stops -> ID is at index 2
        const id = parts[2];
        const stopData = (demoData as any)['/trips/stops'] || {};
        const stops = id ? stopData[id] : null;
        
        console.log(`🔍 [Mock] TRIP STOPS Request: "${url}" -> ID: "${id}" -> ${stops ? '✅ FOUND' : '❌ NOT FOUND'}`);
        return stops ? [200, stops] : [200, []];
    });

    // Handle stop times endpoint
    mock.onGet(/^\/stops\/[^\/]+\/times/).reply((config) => {
        const url = config.url || '';
        const match = url.match(/\/stops\/([^\/\?]+)\/times/);
        const id = match ? match[1] : null;
        const timeData = (demoData as any)['/stops/times'] || {};
        const times = id ? timeData[id] : null;
        
        console.log(`🔍 [Mock] STOP TIMES Request: "${url}" -> ID: "${id}" -> ${times ? '✅ FOUND' : '❌ NOT FOUND'}`);
        return times ? [200, times] : [200, []];
    });

    // Mock all PUT/POST/DELETE requests to return success (demo mode is read-only)
    mock.onPut(/.*/).reply((config) => {
        console.log(`🔍 [Mock] PUT Request: "${config.url}" -> ✅ MOCKED (demo mode)`);
        return [200, { success: true, message: 'Mocked response in demo mode' }];
    });

    mock.onPost(/.*/).reply((config) => {
        console.log(`🔍 [Mock] POST Request: "${config.url}" -> ✅ MOCKED (demo mode)`);
        return [200, { success: true, id: Math.floor(Math.random() * 1000), message: 'Mocked response in demo mode' }];
    });

    mock.onDelete(/.*/).reply((config) => {
        console.log(`🔍 [Mock] DELETE Request: "${config.url}" -> ✅ MOCKED (demo mode)`);
        return [200, { success: true, message: 'Mocked response in demo mode' }];
    });

    // Fallback for any unmatched GET requests - return empty array instead of 404
    // This must be last to catch everything that wasn't matched above
    // Use a catch-all pattern to ensure nothing passes through
    mock.onGet(/.*/).reply((config) => {
        const url = config.url || '';
        console.warn(`⚠️ [Mock] Unmatched GET Request: "${url}" -> Returning empty array`);
        return [200, []];
    });
};
