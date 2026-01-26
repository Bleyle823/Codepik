'use client'

import React from "react"

import { useState, useRef } from 'react'
import { ChevronDown, ChevronRight, File, Folder, Plus, Upload, Trash2 } from 'lucide-react'

export interface IdeFile {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  language?: string
  children?: IdeFile[]
}

interface FileExplorerProps {
  files: IdeFile[]
  selectedFileId: string
  onSelectFile: (id: string) => void
  onFilesChange: (files: IdeFile[]) => void
}

export function FileExplorer({ files, selectedFileId, onSelectFile, onFilesChange }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedFolders(newExpanded)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (uploadedFiles) {
      Array.from(uploadedFiles).forEach(file => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          const newFile: IdeFile = {
            id: Date.now().toString(),
            name: file.name,
            type: 'file',
            content,
            language: getLanguage(file.name)
          }
          onFilesChange([...files, newFile])
        }
        reader.readAsText(file)
      })
    }
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languages: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      css: 'css',
      html: 'html',
      json: 'json',
    }
    return languages[ext || ''] || 'plaintext'
  }

  const renderFileTree = (items: IdeFile[], level: number = 0) => {
    return items.map(item => (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 px-4 py-2 cursor-pointer text-sm transition-colors ${
            selectedFileId === item.id
              ? 'bg-sidebar-primary/20 text-sidebar-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.id)
            } else {
              onSelectFile(item.id)
            }
          }}
        >
          {item.type === 'folder' ? (
            <>
              {expandedFolders.has(item.id) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <Folder size={16} className="text-blue-400" />
              <span>{item.name}</span>
            </>
          ) : (
            <>
              <div className="w-4" />
              <File size={16} className="text-gray-400" />
              <span className="flex-1">{item.name}</span>
            </>
          )}
        </div>
        {item.type === 'folder' && expandedFolders.has(item.id) && item.children && (
          renderFileTree(item.children, level + 1)
        )}
      </div>
    ))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Explorer</h2>
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-sidebar-accent/20 rounded transition-colors text-sidebar-foreground"
            title="Upload files"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".ts,.tsx,.js,.jsx,.py,.css,.html,.json,.txt"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {renderFileTree(files)}
      </div>
    </div>
  )
}
