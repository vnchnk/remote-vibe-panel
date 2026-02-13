'use client';

import { useState } from 'react';
import Header from './Header';
import TabBar, { type Tab } from './TabBar';
import GitPanel from './GitPanel';
import Terminal from './Terminal';
import DockerPanel from './DockerPanel';
import DbPanel from './DbPanel';
import { ToastProvider } from './Toast';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('git');

  return (
    <ToastProvider>
      <div className="h-full flex flex-col bg-slate-900">
        <Header />

        {/* Content — hidden instead of unmounted so Terminal state persists */}
        <main className="flex-1 overflow-hidden">
          <div className={activeTab === 'git' ? 'h-full' : 'hidden'}><GitPanel /></div>
          <div className={activeTab === 'claude' ? 'h-full' : 'hidden'}><Terminal /></div>
          <div className={activeTab === 'docker' ? 'h-full' : 'hidden'}><DockerPanel /></div>
          <div className={activeTab === 'db' ? 'h-full' : 'hidden'}><DbPanel /></div>
        </main>

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </ToastProvider>
  );
}
