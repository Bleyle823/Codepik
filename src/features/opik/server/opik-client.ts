import { OPIK_CONFIG } from './opik-config';
import {
    ProjectResponse,
    TraceResponse,
    TraceStatsResponse,
    PromptResponse,
    SingleTraceResponse
} from './types';

interface ApiRequestOptions extends RequestInit {
    query?: Record<string, string | number | boolean | undefined>;
}

export class OpikClient {
    private static instance: OpikClient;

    private constructor() { }

    public static getInstance(): OpikClient {
        if (!OpikClient.instance) {
            OpikClient.instance = new OpikClient();
        }
        return OpikClient.instance;
    }

    private async makeApiRequest<T>(
        path: string,
        options: ApiRequestOptions = {},
        workspaceName?: string
    ): Promise<{ data: T | null; error: string | null }> {
        const { query, ...fetchOptions } = options;

        // Prepare headers
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            authorization: OPIK_CONFIG.apiKey || '',
            ...((fetchOptions.headers as Record<string, string>) || {}),
        };

        // Add workspace heade
        if (!OPIK_CONFIG.isSelfHosted) {
            const wsName = workspaceName || OPIK_CONFIG.workspaceName;
            if (wsName) {
                headers['Comet-Workspace'] = wsName;
            }
        }

        // Build URL with query params
        let url = `${OPIK_CONFIG.apiBaseUrl}${path}`;
        if (query) {
            const searchParams = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers,
            });

            const responseText = await response.text();
            let responseData: any = null;

            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = responseText;
            }

            if (!response.ok) {
                return {
                    data: null,
                    error: `HTTP error! status: ${response.status} ${JSON.stringify(responseData)}`,
                };
            }

            return {
                data: responseData as T,
                error: null,
            };
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    // --- Projects ---

    async getProjects(page = 1, size = 10, workspaceName?: string) {
        return this.makeApiRequest<ProjectResponse>(
            '/v1/private/projects',
            { query: { page, size } },
            workspaceName
        );
    }

    async createProject(name: string, description?: string, workspaceName?: string) {
        return this.makeApiRequest<any>(
            '/v1/private/projects',
            {
                method: 'POST',
                body: JSON.stringify({ name, description }),
            },
            workspaceName
        );
    }

    // --- Traces ---

    async getTraces(
        page = 1,
        size = 10,
        filters: { projectId?: string; projectName?: string; workspaceName?: string } = {}
    ) {
        const { projectId, projectName, workspaceName } = filters;
        const query: Record<string, string | number | boolean | undefined> = { page, size };

        if (projectId) query.project_id = projectId;
        else if (projectName) query.project_name = projectName;
        else {
            // Auto-resolve project if not provided, just like MCP tool
            const projects = await this.getProjects(1, 1, workspaceName);
            if (projects.data && projects.data.content && projects.data.content.length > 0) {
                query.project_id = projects.data.content[0].id;
            }
        }

        return this.makeApiRequest<TraceResponse>('/v1/private/traces', { query }, workspaceName);
    }

    async getTraceById(traceId: string, workspaceName?: string) {
        return this.makeApiRequest<SingleTraceResponse>(`/v1/private/traces/${traceId}`, {}, workspaceName);
    }

    async getTraceStats(
        filters: { projectId?: string; projectName?: string; startDate?: string; endDate?: string; workspaceName?: string }
    ) {
        const { projectId, projectName, startDate, endDate, workspaceName } = filters;
        const query: Record<string, string | number | boolean | undefined> = {};

        if (projectId) query.project_id = projectId;
        else if (projectName) query.project_name = projectName;
        else {
            const projects = await this.getProjects(1, 1, workspaceName);
            if (projects.data && projects.data.content && projects.data.content.length > 0) {
                query.project_id = projects.data.content[0].id;
            }
        }

        if (startDate) query.start_date = startDate;
        if (endDate) query.end_date = endDate;

        return this.makeApiRequest<TraceStatsResponse>('/v1/private/traces/stats', { query }, workspaceName);
    }

    // --- Prompts ---

    async getPrompts(page = 1, size = 10, name?: string) {
        const query: Record<string, string | number | boolean | undefined> = { page, size };
        if (name) query.name = name;

        return this.makeApiRequest<PromptResponse>('/v1/private/prompts', { query });
    }

    async createPrompt(name: string, description?: string, tags?: string[]) {
        return this.makeApiRequest<any>('/v1/private/prompts', {
            method: 'POST',
            body: JSON.stringify({ name, description, tags }),
        });
    }

    // --- Feedback ---

    async trackFeedback(traceId: string, item: { name: string; value: number; reason?: string }) {
        return this.makeApiRequest<any>('/v1/private/feedback', {
            method: 'POST',
            body: JSON.stringify({
                trace_id: traceId,
                name: item.name,
                value: item.value,
                reason: item.reason
            }),
        });
    }
}

export const opikClient = OpikClient.getInstance();
