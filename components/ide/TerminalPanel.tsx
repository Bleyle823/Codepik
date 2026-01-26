'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { Terminal, X, Plus } from 'lucide-react'

interface TerminalLine {
  id: string
  text: string
  type: 'input' | 'output' | 'error'
}

export function TerminalPanel() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: '1', text: 'Codepick Terminal Ready', type: 'output' },
    { id: '2', text: '$ ', type: 'input' }
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [lines])

  const executeCommand = (command: string) => {
    if (!command.trim()) return

    // Add command to history
    setHistory(prev => [...prev, command])
    setHistoryIndex(-1)

    // Add input line
    const newId = Date.now().toString()
    setLines(prev => [
      ...prev.slice(0, -1),
      { id: newId, text: `$ ${command}`, type: 'input' }
    ])

    // Simulate command execution with delay
    setTimeout(() => {
      let output = ''
      const cmd = command.toLowerCase().trim()

      if (cmd === 'help') {
        output = `Available commands:
  help          - Show this help message
  clear         - Clear the terminal
  ls            - List files
  echo <text>   - Print text
  pwd           - Print working directory`
      } else if (cmd === 'clear') {
        setLines([{ id: Date.now().toString(), text: '$ ', type: 'input' }])
        setInput('')
        return
      } else if (cmd === 'ls') {
        output = `app.tsx
index.css
utils.py
src/`
      } else if (cmd.startsWith('echo ')) {
        output = cmd.substring(5)
      } else if (cmd === 'pwd') {
        output = '/home/codepick/project'
      } else {
        output = `Command not found: ${command}`
      }

      setLines(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: output, type: 'output' },
        { id: (Date.now() + 2).toString(), text: '$ ', type: 'input' }
      ])
    }, 300)

    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      executeCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Terminal</h3>
        </div>
        <button className="p-1 hover:bg-secondary rounded transition-colors text-muted-foreground">
          <X size={16} />
        </button>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {lines.map(line => (
          <div key={line.id} className={`
            ${line.type === 'input' ? 'text-foreground' : ''}
            ${line.type === 'output' ? 'text-foreground' : ''}
            ${line.type === 'error' ? 'text-destructive' : ''}
            whitespace-pre-wrap break-words
          `}>
            {line.text}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 flex-shrink-0 bg-card">
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="text-foreground">$</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground outline-none"
            placeholder="Type 'help' for commands..."
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
