export const OPIK_CONFIG = {
    apiKey: process.env.OPIK_API_KEY || process.env.NEXT_PUBLIC_OPIK_API_KEY,
    workspaceName: process.env.OPIK_WORKSPACE || process.env.NEXT_PUBLIC_OPIK_WORKSPACE || 'default',
    apiBaseUrl: process.env.OPIK_URL || process.env.NEXT_PUBLIC_OPIK_BASE_URL || 'https://www.comet.com/opik/api',
    get isSelfHosted() {
        return this.apiBaseUrl && !this.apiBaseUrl.includes('comet.com');
    }
};
