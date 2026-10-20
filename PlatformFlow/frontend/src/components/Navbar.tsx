import React from 'react';
import {
  Train,
  Calendar,
  Layers,
  GitBranch,
  Code2,
  UploadCloud,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenImport: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onResetDemo,
  isResetting
}) => {
  return (
    <header className="topbar">
      <div className="topbar-content">
        <div className="brand-section">
          <div className="brand-logo">
            <Train size={24} />
          </div>
          <div className="brand-titles">
            <h1>PlatformFlow</h1>
            <p>Nationwide Railway Timetable & Platform Planning System</p>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}
            onClick={() => setActiveTab('timetable')}
          >
            <Calendar size={16} />
            Timetable Board
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'platforms' ? 'active' : ''}`}
            onClick={() => setActiveTab('platforms')}
          >
            <Layers size={16} />
            Platform Planner
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'conflicts' ? 'active' : ''}`}
            onClick={() => setActiveTab('conflicts')}
          >
            <ShieldAlert size={16} />
            Conflict & What-If
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
          >
            <GitBranch size={16} />
            Network Graph (BFS/DFS)
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'dsa' ? 'active' : ''}`}
            onClick={() => setActiveTab('dsa')}
          >
            <Code2 size={16} />
            DSA Architecture
          </button>
        </nav>

        <div className="topbar-actions">
          <span className="data-status-badge">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            DEMO VALIDATED DATASET
          </span>

          <button
            className="btn-secondary"
            onClick={onOpenImport}
            title="Import custom CSV/JSON schedules"
            style={{ height: 36, padding: '0 12px', fontSize: 12 }}
          >
            <UploadCloud size={14} />
            Import Data
          </button>

          <button
            className="btn-secondary"
            onClick={onResetDemo}
            disabled={isResetting}
            title="Reset database to seed dataset"
            style={{ height: 36, padding: '0 10px', fontSize: 12 }}
          >
            <RefreshCw size={14} className={isResetting ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
};
