'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Activity, 
  Bot, 
  Code, 
  ArrowRight,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

export default function DemoIndexPage() {
  const demos = [
    {
      id: 'opik-integration',
      title: 'Opik Integration Demo',
      description: 'Complete end-to-end demonstration of Opik TypeScript SDK integration with real-time tracing',
      icon: Activity,
      color: 'bg-blue-500',
      href: '/demo/opik-integration',
      status: 'Ready',
      features: ['Real-time tracing', 'AI operations', 'Performance metrics', 'Error handling']
    },
    {
      id: 'opik-dashboard',
      title: 'Analytics Dashboard',
      description: 'Comprehensive analytics dashboard with real-time metrics, cost analysis, and quality insights',
      icon: BarChart3,
      color: 'bg-green-500',
      href: '/demo/opik-dashboard',
      status: 'Ready',
      features: ['Live metrics', 'Cost tracking', 'Quality analysis', 'Performance trends']
    },
    {
      id: 'opik-status',
      title: 'Status & Metrics',
      description: 'Live status indicator and metrics panel showing real-time coding productivity',
      icon: Target,
      color: 'bg-purple-500',
      href: '/demo/opik-status',
      status: 'Ready',
      features: ['Connection status', 'Live metrics', 'Productivity scores', 'Session tracking']
    },
    {
      id: 'ai-editing',
      title: 'AI Direct Editing',
      description: 'Experience AI-powered direct code editing with real-time visual feedback',
      icon: Bot,
      color: 'bg-orange-500',
      href: '/demo/ai-editing',
      status: 'Ready',
      features: ['Real-time editing', 'Visual feedback', 'Multiple AI models', 'Undo/Redo support']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Codepik Demo Center
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Explore the powerful features of our AI-powered IDE with comprehensive Opik integration. 
            Experience real-time tracing, analytics, and AI-assisted coding in action.
          </p>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {demos.map((demo) => {
            const Icon = demo.icon;
            
            return (
              <Card 
                key={demo.id} 
                className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-3 rounded-lg ${demo.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {demo.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{demo.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {demo.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {/* Features */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Key Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {demo.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link href={demo.href}>
                    <Button className="w-full group-hover:bg-primary/90 transition-colors">
                      <span>Launch Demo</span>
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Access Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Quick Access</CardTitle>
            <CardDescription>
              Jump directly to specific features or documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/demo/opik-integration">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-1">
                  <Zap className="h-5 w-5" />
                  <span className="text-xs">Run Full Demo</span>
                </Button>
              </Link>
              
              <Link href="/demo/opik-dashboard">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-1">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs">View Analytics</span>
                </Button>
              </Link>
              
              <Link href="/demo/opik-status">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-1">
                  <Activity className="h-5 w-5" />
                  <span className="text-xs">Check Status</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Configure Opik</p>
                  <p className="text-sm text-muted-foreground">
                    Copy <code>.env.example</code> to <code>.env.local</code> and add your Opik API key
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Run Integration Demo</p>
                  <p className="text-sm text-muted-foreground">
                    Start with the full integration demo to see all features working together
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Explore Features</p>
                  <p className="text-sm text-muted-foreground">
                    Check out individual components like the dashboard and status indicators
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}