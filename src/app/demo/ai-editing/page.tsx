'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Code, 
  Zap, 
  CheckCircle, 
  FileEdit, 
  Bot,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CodeEditor } from '@/features/editor/components/code-editor';
import { AIEditingOverlay } from '@/features/editor/components/ai-editing-overlay';
import { EnhancedConversationSidebar } from '@/features/conversations/components/enhanced-conversation-sidebar';

export default function AIEditingDemoPage() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState(`// Sample React Component
import React, { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`);

  const demos = [
    {
      id: 'create-component',
      title: 'Create New Component',
      description: 'Watch AI create a complete React component from scratch',
      icon: Code,
      color: 'bg-blue-500',
      prompt: 'Create a TodoList component with add, delete, and toggle functionality'
    },
    {
      id: 'fix-bugs',
      title: 'Fix Bugs Automatically',
      description: 'AI identifies and fixes bugs in your code',
      icon: CheckCircle,
      color: 'bg-green-500',
      prompt: 'Fix any bugs in this code and add proper TypeScript types'
    },
    {
      id: 'refactor-code',
      title: 'Refactor & Optimize',
      description: 'AI refactors code for better performance and readability',
      icon: Sparkles,
      color: 'bg-purple-500',
      prompt: 'Refactor this component to use modern React patterns and optimize performance'
    },
    {
      id: 'add-features',
      title: 'Add New Features',
      description: 'AI adds new functionality to existing components',
      icon: FileEdit,
      color: 'bg-orange-500',
      prompt: 'Add a reset button and animation effects to this counter'
    }
  ];

  const runDemo = (demoId: string) => {
    setActiveDemo(demoId);
    
    // Simulate AI editing process
    setTimeout(() => {
      const demo = demos.find(d => d.id === demoId);
      if (demo) {
        // Simulate different code changes based on demo type
        switch (demoId) {
          case 'create-component':
            setDemoCode(`// AI Generated TodoList Component
import React, { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');

  const addTodo = () => {
    if (inputText.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: inputText,
        completed: false
      }]);
      setInputText('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="todo-list">
      <h2>Todo List</h2>
      <div className="add-todo">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a new todo..."
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`);
            break;
          case 'fix-bugs':
            setDemoCode(`// Fixed and Typed React Component
import React, { useState } from 'react';

interface CounterProps {
  initialCount?: number;
  step?: number;
}

export function Counter({ initialCount = 0, step = 1 }: CounterProps) {
  const [count, setCount] = useState<number>(initialCount);

  const increment = () => {
    setCount(prevCount => prevCount + step);
  };

  const decrement = () => {
    setCount(prevCount => prevCount - step);
  };

  return (
    <div className="counter">
      <h1>Counter: {count}</h1>
      <div className="button-group">
        <button onClick={decrement} disabled={count <= 0}>
          Decrement
        </button>
        <button onClick={increment}>
          Increment
        </button>
      </div>
    </div>
  );
}`);
            break;
          case 'refactor-code':
            setDemoCode(`// Refactored Modern React Component
import React, { useState, useCallback, useMemo } from 'react';

interface CounterProps {
  initialCount?: number;
  step?: number;
  onCountChange?: (count: number) => void;
}

export const Counter = React.memo(({ 
  initialCount = 0, 
  step = 1, 
  onCountChange 
}: CounterProps) => {
  const [count, setCount] = useState<number>(initialCount);

  const increment = useCallback(() => {
    setCount(prevCount => {
      const newCount = prevCount + step;
      onCountChange?.(newCount);
      return newCount;
    });
  }, [step, onCountChange]);

  const decrement = useCallback(() => {
    setCount(prevCount => {
      const newCount = Math.max(0, prevCount - step);
      onCountChange?.(newCount);
      return newCount;
    });
  }, [step, onCountChange]);

  const isAtMinimum = useMemo(() => count <= 0, [count]);

  return (
    <div className="counter" role="group" aria-label="Counter controls">
      <h1 aria-live="polite">Counter: {count}</h1>
      <div className="button-group">
        <button 
          onClick={decrement} 
          disabled={isAtMinimum}
          aria-label={\`Decrease count by \${step}\`}
        >
          Decrement
        </button>
        <button 
          onClick={increment}
          aria-label={\`Increase count by \${step}\`}
        >
          Increment
        </button>
      </div>
    </div>
  );
});

Counter.displayName = 'Counter';`);
            break;
          case 'add-features':
            setDemoCode(`// Enhanced Counter with New Features
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface CounterProps {
  initialCount?: number;
  step?: number;
}

export function Counter({ initialCount = 0, step = 1 }: CounterProps) {
  const [count, setCount] = useState<number>(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);

  const increment = useCallback(() => {
    setIsAnimating(true);
    setCount(prevCount => prevCount + step);
    setTimeout(() => setIsAnimating(false), 300);
  }, [step]);

  const decrement = useCallback(() => {
    setIsAnimating(true);
    setCount(prevCount => Math.max(0, prevCount - step));
    setTimeout(() => setIsAnimating(false), 300);
  }, [step]);

  const reset = useCallback(() => {
    setIsAnimating(true);
    setCount(initialCount);
    setTimeout(() => setIsAnimating(false), 300);
  }, [initialCount]);

  return (
    <div className="counter">
      <motion.h1 
        animate={{ 
          scale: isAnimating ? 1.1 : 1,
          color: isAnimating ? '#3b82f6' : '#000'
        }}
        transition={{ duration: 0.3 }}
      >
        Counter: {count}
      </motion.h1>
      <div className="button-group">
        <motion.button 
          onClick={decrement} 
          disabled={count <= 0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Decrement
        </motion.button>
        <motion.button 
          onClick={reset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="reset-button"
        >
          Reset
        </motion.button>
        <motion.button 
          onClick={increment}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Increment
        </motion.button>
      </div>
    </div>
  );
}`);
            break;
        }
      }
      
      // End demo after showing result
      setTimeout(() => {
        setActiveDemo(null);
      }, 3000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bot className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Direct Code Editing
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience the future of coding with AI that writes, edits, and improves your code in real-time.
            Watch as AI seamlessly integrates with your development workflow.
          </p>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {demos.map((demo) => {
            const Icon = demo.icon;
            const isActive = activeDemo === demo.id;
            
            return (
              <Card 
                key={demo.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => !activeDemo && runDemo(demo.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${demo.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm">{demo.title}</CardTitle>
                      {isActive && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          <Zap className="h-3 w-3 mr-1" />
                          Running...
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs mb-3">
                    {demo.description}
                  </CardDescription>
                  <Button 
                    size="sm" 
                    variant={isActive ? "secondary" : "outline"}
                    className="w-full text-xs"
                    disabled={!!activeDemo}
                  >
                    {isActive ? (
                      <>
                        <Zap className="h-3 w-3 mr-1 animate-spin" />
                        AI Working...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Run Demo
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Demo Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Code Editor */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Live Code Editor
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {activeDemo && (
                      <Badge variant="secondary" className="animate-pulse">
                        <Bot className="h-3 w-3 mr-1" />
                        AI Editing
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Watch AI make real-time changes to your code
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative">
                  <CodeEditor
                    fileName="demo.tsx"
                    initialValue={demoCode}
                    onChange={setDemoCode}
                  />
                  
                  {/* AI Editing Overlay */}
                  {activeDemo && (
                    <AIEditingOverlay
                      editingState={{
                        isEditing: true,
                        currentOperation: demos.find(d => d.id === activeDemo)?.title || 'Processing...',
                        editType: 'ai-edit',
                        progress: 65,
                        canCancel: false
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Panel */}
          <div className="space-y-6">
            {/* Features List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Key Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Real-time Sync</p>
                    <p className="text-xs text-muted-foreground">
                      See AI changes applied instantly in your editor
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Visual Feedback</p>
                    <p className="text-xs text-muted-foreground">
                      Highlighted changes and progress indicators
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Conflict Resolution</p>
                    <p className="text-xs text-muted-foreground">
                      Smart handling of simultaneous edits
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Undo/Redo Support</p>
                    <p className="text-xs text-muted-foreground">
                      Full history tracking for AI changes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <span>AI analyzes your request</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <span>Code changes are applied in real-time</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <span>Visual feedback shows the changes</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">
                Ready to Transform Your Coding Experience?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of developers who are already using AI-powered direct code editing 
                to build better software faster.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Get Started Now
                </Button>
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}