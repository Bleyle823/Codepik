import { Code2, Settings, Share2, Menu } from 'lucide-react'

export function TopBar() {
  return (
    <div className="h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Code2 className="w-6 h-6 text-primary" />
        <span className="text-lg font-semibold text-sidebar-foreground">Codepick</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button className="p-2 hover:bg-sidebar-accent/20 rounded transition-colors text-sidebar-foreground">
          <Menu size={20} />
        </button>
        <button className="p-2 hover:bg-sidebar-accent/20 rounded transition-colors text-sidebar-foreground">
          <Share2 size={20} />
        </button>
        <button className="p-2 hover:bg-sidebar-accent/20 rounded transition-colors text-sidebar-foreground">
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
