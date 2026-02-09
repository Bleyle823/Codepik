'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpikTrace } from '@/lib/opik-client-safe';

export function TraceViewer() {
    const [traces, setTraces] = useState<OpikTrace[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTraces = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/opik/traces?size=20');
            if (res.ok) {
                const data = await res.json();
                setTraces(data.content || []);
            }
        } catch (error) {
            console.error('Failed to fetch traces', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTraces();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Traces</CardTitle>
                <CardDescription>View latest AI interactions</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-4">Loading traces...</div>
                ) : traces.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No traces found.</div>
                ) : (
                    <div className="space-y-3">
                        {traces.map((trace) => (
                            <div key={trace.id} className="p-3 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium truncate">{trace.name || 'Untitled Trace'}</div>
                                    <Badge variant={trace.tags?.includes('error') ? 'destructive' : 'secondary'}>
                                        {trace.duration ? `${trace.duration}ms` : 'N/A'}
                                    </Badge>
                                </div>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span>{new Date(trace.created_at || '').toLocaleString()}</span>
                                    <span>•</span>
                                    <span>{trace.id.slice(0, 8)}...</span>
                                </div>
                                {trace.input && (
                                    <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-20">
                                        <strong>Input:</strong> {JSON.stringify(trace.input).slice(0, 200)}
                                    </div>
                                )}
                                {trace.output && (
                                    <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-20">
                                        <strong>Output:</strong> {JSON.stringify(trace.output).slice(0, 200)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
