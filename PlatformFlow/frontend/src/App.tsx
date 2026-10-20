import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { TimetableBoard } from './components/TimetableBoard';
import { PlatformPlanner } from './components/PlatformPlanner';
import { ConflictAnalyzer } from './components/ConflictAnalyzer';
import { NetworkExplorer } from './components/NetworkExplorer';
import { DSAHub } from './components/DSAHub';
import { TrainDetailModal } from './components/TrainDetailModal';
import { DataImportModal } from './components/DataImportModal';
import { resetDemoData } from './api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('timetable');
  const [currentStation, setCurrentStation] = useState<string>('NDLS');
  const [selectedTrainModal, setSelectedTrainModal] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset database to clean verified nationwide seed dataset?')) return;
    setIsResetting(true);
    try {
      const res = await resetDemoData();
      showToast(res.message || 'Database reset successfully!');
      // Trigger a state change to re-render
      setCurrentStation('NDLS');
    } catch (err: any) {
      showToast('Reset failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImport={() => setIsImportModalOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#091a2e',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 9999,
            fontSize: 13,
            fontWeight: 600,
            borderLeft: '4px solid #0ea594'
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Quick Station Switcher Bar */}
      <div style={{ background: '#e2e8f0', padding: '8px 20px', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            Quick Station Switch:
          </span>
          {[
            { code: 'NDLS', name: 'New Delhi' },
            { code: 'CSMT', name: 'Mumbai CSMT' },
            { code: 'HWH', name: 'Howrah' },
            { code: 'MAS', name: 'Chennai Central' },
            { code: 'SBC', name: 'Bengaluru' },
            { code: 'TPTY', name: 'Tirupati' },
            { code: 'PUNE', name: 'Pune' },
            { code: 'CNB', name: 'Kanpur Central' },
            { code: 'BSB', name: 'Varanasi' },
            { code: 'ADI', name: 'Ahmedabad' }
          ].map(st => (
            <button
              key={st.code}
              onClick={() => setCurrentStation(st.code)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                background: currentStation === st.code ? '#0f2c4c' : '#ffffff',
                color: currentStation === st.code ? '#ffffff' : '#334155',
                fontSize: 11,
                fontWeight: currentStation === st.code ? 700 : 500,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {st.code} ({st.name})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="main-container" style={{ flexGrow: 1 }}>
        {activeTab === 'timetable' && (
          <TimetableBoard
            currentStation={currentStation}
            onSelectStation={setCurrentStation}
            onOpenTrainDetail={setSelectedTrainModal}
          />
        )}

        {activeTab === 'platforms' && (
          <PlatformPlanner
            currentStation={currentStation}
            onOpenTrainDetail={setSelectedTrainModal}
          />
        )}

        {activeTab === 'conflicts' && (
          <ConflictAnalyzer currentStation={currentStation} />
        )}

        {activeTab === 'network' && (
          <NetworkExplorer />
        )}

        {activeTab === 'dsa' && (
          <DSAHub />
        )}
      </main>

      {/* Train Details Modal */}
      <TrainDetailModal
        trainNumber={selectedTrainModal}
        onClose={() => setSelectedTrainModal(null)}
      />

      {/* Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          showToast('Dataset imported and ingested successfully!');
        }}
      />

      {/* Operational Disclaimer Footer */}
      <footer
        style={{
          background: '#091a2e',
          color: '#94a3b8',
          padding: '24px 20px',
          textAlign: 'center',
          fontSize: 12,
          lineHeight: 1.7,
          borderTop: '1px solid #1e293b',
          marginTop: 40
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <strong>PlatformFlow Operational Disclaimer:</strong> PlatformFlow is an intelligent decision-support
          prototype for train movement visualization, timetable time-window filtering, and platform conflict analysis.
          It does not connect to live Indian Railways signalling, interlocking, or central dispatch networks.
          All allocations are mathematical simulations requiring authorized railway staff approval.
        </div>
      </footer>
    </div>
  );
};

export default App;
