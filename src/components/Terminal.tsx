'use client';

import { useState, useEffect } from 'react';
import TerminalTab, { type AgentType } from './TerminalTab';

interface Tab {
  id: string;
  agentType: AgentType;
  label: string;
}

const AGENT_LABELS: Record<AgentType, string> = {
  claude: 'CLI',
  gemini: 'Gemini',
  codex: 'Codex',
  bash: 'Bash',
};

const AGENT_COLORS: Record<AgentType, string> = {
  claude: 'bg-orange-600',
  gemini: 'bg-blue-600',
  codex: 'bg-green-600',
  bash: 'bg-slate-600',
};

// Real logos for each agent
const AgentIcon = ({ type, className = "w-5 h-5" }: { type: AgentType; className?: string }) => {
  // Use embedded SVG only for Codex (OpenAI logo works well)
  if (type === 'codex') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
      </svg>
    );
  }

  // Use CDN for others
  const iconMap: Record<AgentType, string> = {
    claude: 'https://cdn.simpleicons.org/anthropic/white',
    gemini: 'https://cdn.simpleicons.org/googlegemini/white',
    codex: '', // Not used, SVG above
    bash: 'https://cdn.simpleicons.org/gnubash/white',
  };

  return (
    <img
      src={iconMap[type]}
      alt={type}
      className={className}
    />
  );
};

const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  claude: 'Claude Code AI assistant',
  gemini: 'Google Gemini AI',
  codex: 'OpenAI Codex',
  bash: 'Standard shell',
};

// Simple UUID generator
let idCounter = 0;
function generateId(): string {
  return `tab-${Date.now()}-${++idCounter}`;
}

export default function Terminal() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem('terminal-tabs');
    const savedActiveTab = localStorage.getItem('terminal-active-tab');

    if (saved) {
      try {
        setTabs(JSON.parse(saved));
      } catch {
        // Ignore invalid data
      }
    }

    if (savedActiveTab) {
      setActiveTabId(savedActiveTab);
    }

    setIsHydrated(true);
  }, []);

  // Save tabs to localStorage whenever they change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('terminal-tabs', JSON.stringify(tabs));
    }
  }, [tabs, isHydrated]);

  // Save active tab to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (isHydrated && activeTabId) {
      localStorage.setItem('terminal-active-tab', activeTabId);
    }
  }, [activeTabId, isHydrated]);

  const addTab = (agentType: AgentType) => {
    console.log('[Terminal] Adding new tab:', agentType);
    const newTab: Tab = {
      id: generateId(),
      agentType,
      label: AGENT_LABELS[agentType],
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
    }
  };

  const handleDragStart = (tabId: string) => {
    setDraggedTabId(tabId);
  };

  const handleDragOver = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetTabId) return;

    const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);

    const newTabs = [...tabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);
    setTabs(newTabs);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#0f172a]">
      {/* Tab bar - only show if there are tabs */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 border-b border-slate-700 overflow-x-auto overflow-y-visible">
          {/* Agent picker - horizontal row */}
          <div className="flex gap-1 p-1 bg-slate-800 rounded mr-2">
            {(['claude', 'gemini', 'codex', 'bash'] as AgentType[]).map(agent => (
              <button
                key={agent}
                onClick={() => addTab(agent)}
                className={`${AGENT_COLORS[agent]} hover:opacity-80 hover:scale-105 active:opacity-60 active:scale-95 rounded p-1.5 transition-all cursor-pointer flex items-center justify-center`}
                title={AGENT_DESCRIPTIONS[agent]}
              >
                <AgentIcon type={agent} className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* Tabs */}
          {tabs.map(tab => (
            <div
              key={tab.id}
              draggable
              onDragStart={() => handleDragStart(tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${
                activeTabId === tab.id
                  ? 'bg-[#0f172a] text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300 cursor-pointer'
              } ${draggedTabId === tab.id ? 'opacity-50' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-1 text-slate-500 hover:text-slate-300 hover:scale-125 active:scale-100 transition-all cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 bg-[#0f172a]">
        {tabs.length === 0 ? (
          /* Welcome screen */
          <div className="h-full flex items-center justify-center">
            <div className="max-w-sm text-center px-8">
              <h1 className="text-3xl font-bold text-slate-200 mb-3">
                👋 Welcome to CLI
              </h1>
              <p className="text-slate-400 mb-8">
                Choose an AI agent or terminal
              </p>

              {/* Agent buttons in column */}
              <div className="flex flex-col gap-2 w-full">
                {(['claude', 'gemini', 'codex', 'bash'] as AgentType[]).map(agent => {
                  const labels: Record<AgentType, string> = {
                    claude: 'Claude CLI',
                    gemini: 'Gemini CLI',
                    codex: 'Codex CLI',
                    bash: 'bash',
                  };

                  return (
                    <button
                      key={agent}
                      onClick={() => addTab(agent)}
                      className={`${AGENT_COLORS[agent]} hover:opacity-90 hover:scale-105 active:opacity-75 active:scale-100 rounded-lg px-4 py-3 transition-all cursor-pointer flex items-center gap-3 text-left`}
                    >
                      <AgentIcon type={agent} className="w-4 h-4 flex-shrink-0" />
                      <span className="text-white text-sm font-medium whitespace-nowrap">{labels[agent]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Terminal tabs */
          tabs.map(tab => (
            <TerminalTab
              key={tab.id}
              tabId={tab.id}
              agentType={tab.agentType}
              isActive={activeTabId === tab.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
