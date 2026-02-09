'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

export function PromptManager() {
    const [prompts, setPrompts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPromptName, setNewPromptName] = useState('');
    const [newPromptDesc, setNewPromptDesc] = useState('');

    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/opik/prompts');
            if (res.ok) {
                const data = await res.json();
                setPrompts(data.content || []);
            }
        } catch (error) {
            console.error('Failed to fetch prompts', error);
        } finally {
            setLoading(false);
        }
    };

    const createPrompt = async () => {
        if (!newPromptName.trim()) return;
        try {
            const res = await fetch('/api/opik/prompts', {
                method: 'POST',
                body: JSON.stringify({ name: newPromptName, description: newPromptDesc }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setNewPromptName('');
                setNewPromptDesc('');
                fetchPrompts();
            }
        } catch (error) {
            console.error('Failed to create prompt', error);
        }
    };

    useEffect(() => {
        fetchPrompts();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Prompt Library</CardTitle>
                <CardDescription>Manage your AI prompts</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 mb-6 p-4 border rounded-lg bg-muted/20">
                    <h3 className="font-medium text-sm">Create New Prompt</h3>
                    <div className="grid gap-2">
                        <Input
                            placeholder="Prompt Name"
                            value={newPromptName}
                            onChange={(e) => setNewPromptName(e.target.value)}
                        />
                        <Textarea
                            placeholder="Description"
                            value={newPromptDesc}
                            onChange={(e) => setNewPromptDesc(e.target.value)}
                        />
                        <Button onClick={createPrompt} disabled={!newPromptName}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Prompt
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-4">Loading prompts...</div>
                    ) : prompts.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No prompts found.</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {prompts.map((prompt) => (
                                <Card key={prompt.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{prompt.name}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {new Date(prompt.created_at || '').toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {prompt.description || 'No description'}
                                        </p>
                                        <div className="mt-2 text-xs font-medium">
                                            v{prompt.version_count || 1}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
