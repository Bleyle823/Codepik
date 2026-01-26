'use client'

import React from "react"

import { useEffect, useRef, useState } from 'react'
import { IdeFile } from './FileExplorer'

interface CodeEditorProps {
  file: IdeFile
}

export function CodeEditor({ file }: CodeEditorProps) {
  const [content, setContent] = useState(file.content || '')
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setContent(file.content || '')
  }, [file])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  // Simple syntax highlighting based on language
  const getSyntaxHighlightColor = (char: string, language?: string) => {
    if (language === 'python') {
      if (char === '#') return 'text-green-400'
    }
    return 'text-gray-300'
  }

  const getLineNumbers = () => {
    const lines = content.split('\n').length
    return Array.from({ length: lines }, (_, i) => i + 1)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* File Tab */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <span className="text-sm font-medium text-foreground">{file.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">{file.language}</span>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div className="bg-secondary border-r border-border flex-shrink-0 overflow-hidden">
          <div className="text-right pr-3 pt-4 font-mono text-sm text-muted-foreground leading-6">
            {getLineNumbers().map(num => (
              <div key={num}>{num}</div>
            ))}
          </div>
        </div>

        {/* Code Input */}
        <div className="flex-1 overflow-hidden relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full bg-background text-foreground font-mono text-sm resize-none border-none outline-none p-4 overflow-auto"
            style={{
              color: '#e0e0e0',
              backgroundColor: '#0f0f0f',
              fontFamily: 'Geist Mono, monospace',
            }}
            spellCheck="false"
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 bg-secondary border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground flex-shrink-0">
        <div className="flex gap-4">
          <span>Ln {content.split('\n').length}, Col {content.split('\n').pop()?.length || 0}</span>
        </div>
        <div className="flex gap-4">
          <span>{file.language}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}
