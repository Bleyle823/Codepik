'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectList } from '@/features/opik/components/project-list';
import { TraceViewer } from '@/features/opik/components/trace-viewer';
import { PromptManager } from '@/features/opik/components/prompt-manager';
import { OpikAnalyticsDashboard } from '@/features/analytics/components/opik-dashboard';

export default function OpikPage() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Opik Integration</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your LLM applications, projects, traces, and prompts.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="dashboard" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="dashboard">Analytics Dashboard</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="traces">Traces</TabsTrigger>
                    <TabsTrigger value="prompts">Prompts</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    <OpikAnalyticsDashboard />
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                    <ProjectList />
                </TabsContent>

                <TabsContent value="traces" className="space-y-4">
                    <TraceViewer />
                </TabsContent>

                <TabsContent value="prompts" className="space-y-4">
                    <PromptManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
