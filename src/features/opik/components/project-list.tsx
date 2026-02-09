'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { OpikProject } from '@/lib/opik-client-safe';

export function ProjectList() {
    const [projects, setProjects] = useState<OpikProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [newProjectName, setNewProjectName] = useState('');

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/opik/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data.content || []);
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
        }
    };

    const createProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const res = await fetch('/api/opik/projects', {
                method: 'POST',
                body: JSON.stringify({ name: newProjectName }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setNewProjectName('');
                fetchProjects();
            }
        } catch (error) {
            console.error('Failed to create project', error);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Manage your Opik projects</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Input
                        placeholder="New Project Name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                    />
                    <Button onClick={createProject}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                    </Button>
                </div>

                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center py-4">Loading projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No projects found.</div>
                    ) : (
                        projects.map((project) => (
                            <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div className="font-medium">{project.name}</div>
                                    <div className="text-xs text-muted-foreground">{project.description || 'No description'}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(project.created_at || '').toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
