'use client'

import { useState, useRef, useEffect } from 'react'
import { FileExplorer } from '@/components/ide/FileExplorer'
import { CodeEditor } from '@/components/ide/CodeEditor'
import { AIPanel } from '@/components/ide/AIPanel'
import { TerminalPanel } from '@/components/ide/TerminalPanel'
import { TopBar } from '@/components/ide/TopBar'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function IDE() {
  const [files, setFiles] = useState([
    {
      id: '1',
      name: 'app.tsx',
      type: 'file',
      content: `import React from 'react'

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">Welcome to Codepick</h1>
    </div>
  )
}`,
      language: 'typescript'
    },
    {
      id: '2',
      name: 'index.css',
      type: 'file',
      content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}`,
      language: 'css'
    },
    {
      id: '3',
      name: 'utils.py',
      type: 'file',
      content: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def process_data(data):
    """Process input data and return results."""
    return [x * 2 for x in data]`,
      language: 'python'
    },
    {
      id: '4',
      name: 'src',
      type: 'folder',
      children: []
    }
  ])

  const [selectedFileId, setSelectedFileId] = useState('1')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [aiPanelOpen, setAIPanelOpen] = useState(true)
  const [resizingSidebar, setResizingSidebar] = useState(false)
  const [resizingTerminal, setResizingTerminal] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [terminalHeight, setTerminalHeight] = useState(200)

  const selectedFile = files.find(f => f.id === selectedFileId)

  const handleMouseDownSidebar = () => {
    setResizingSidebar(true)
  }

  const handleMouseDownTerminal = () => {
    setResizingTerminal(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingSidebar) {
        setSidebarWidth(Math.max(200, Math.min(500, e.clientX)))
      }
      if (resizingTerminal) {
        setTerminalHeight(Math.max(100, Math.min(600, window.innerHeight - e.clientY)))
      }
    }

    const handleMouseUp = () => {
      setResizingSidebar(false)
      setResizingTerminal(false)
    }

    if (resizingSidebar || resizingTerminal) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [resizingSidebar, resizingTerminal])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden"
          >
            <FileExplorer
              files={files}
              selectedFileId={selectedFileId}
              onSelectFile={setSelectedFileId}
              onFilesChange={setFiles}
            />
          </div>
        )}

        {/* Sidebar Resize Handle */}
        {sidebarOpen && (
          <div
            onMouseDown={handleMouseDownSidebar}
            className="w-1 bg-border hover:bg-primary cursor-col-resize hover:bg-blue-500/50 transition-colors"
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor and AI Panel Row */}
          <div className="flex flex-1 overflow-hidden gap-0">
            {/* Code Editor */}
            <div className="flex-1 overflow-hidden">
              {selectedFile ? (
                <CodeEditor file={selectedFile} />
              ) : (
                <div className="h-full flex items-center justify-center bg-card">
                  <p className="text-muted-foreground">Select a file to start editing</p>
                </div>
              )}
            </div>

            {/* AI Panel */}
            {aiPanelOpen && (
              <>
                <div
                  onMouseDown={handleMouseDownTerminal}
                  className="w-1 bg-border hover:bg-primary cursor-col-resize hover:bg-blue-500/50 transition-colors"
                />
                <div className="w-80 bg-card border-l border-border flex flex-col overflow-hidden">
                  <AIPanel />
                </div>
              </>
            )}
          </div>

          {/* Terminal Panel */}
          {terminalOpen && (
            <>
              <div
                onMouseDown={handleMouseDownTerminal}
                className="h-1 bg-border hover:bg-primary cursor-row-resize hover:bg-blue-500/50 transition-colors"
              />
              <div style={{ height: `${terminalHeight}px` }} className="bg-card border-t border-border flex flex-col overflow-hidden">
                <TerminalPanel />
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar Toggle */}
        <div className="flex flex-col items-center gap-2 bg-sidebar border-l border-sidebar-border px-2 py-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-sidebar-accent/20 rounded transition-colors text-sidebar-foreground"
            title="Toggle sidebar"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  )
}
