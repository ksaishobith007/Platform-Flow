import React, { useState, useEffect } from 'react';
import {
  Code2,
  Database,
  ArrowUpDown,
  Clock,
  Layers,
  GitMerge,
  Cpu,
  CheckCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { AlgorithmExplanation } from '../types';
import { getDSAExplanations } from '../api';

export const DSAHub: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<AlgorithmExplanation[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive Interval-Overlap Sandbox State
  const [aStart, setAStart] = useState('10:00');
  const [aEnd, setAEnd] = useState('10:30');
  const [bStart, setBStart] = useState('10:25');
  const [bEnd, setBEnd] = useState('11:00');
  const [buffer, setBuffer] = useState(10);
  const [overlapResult, setOverlapResult] = useState<any | null>(null);

  // Min-Heap Interactive State
  const [heapItems, setHeapItems] = useState<Array<{ time: number; label: string }>>([
    { time: 640, label: 'Train 12951 Dep' },
    { time: 600, label: 'Train 12004 Arr' },
    { time: 615, label: 'Train 22436 Arr' }
  ]);
  const [newHeapTime, setNewHeapTime] = useState('10:10');
  const [newHeapLabel, setNewHeapLabel] = useState('Train 12797 Arr');

  useEffect(() => {
    getDSAExplanations()
      .then(res => setAlgorithms(res.algorithms))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    calculateOverlap();
  }, []);

  const calculateOverlap = () => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMin(aStart);
    const e1 = toMin(aEnd);
    const s2 = toMin(bStart);
    const e2 = toMin(bEnd);

    const effEnd1 = e1 + buffer;
    const effEnd2 = e2 + buffer;

    const overlapStart = Math.max(s1, s2);
    const overlapEnd = Math.min(effEnd1, effEnd2);
    const hasOverlap = overlapStart < overlapEnd;
    const duration = hasOverlap ? overlapEnd - overlapStart : 0;

    setOverlapResult({
      hasOverlap,
      duration,
      formula: `max(${s1}, ${s2}) < min(${e1} + ${buffer}, ${e2} + ${buffer})`,
      evaluated: `${overlapStart} < ${overlapEnd}`
    });
  };

  const handlePushHeap = (e: React.FormEvent) => {
    e.preventDefault();
    const [h, m] = newHeapTime.split(':').map(Number);
    const min = h * 60 + m;
    const updated = [...heapItems, { time: min, label: newHeapLabel }];
    // Sort to simulate binary heap priority queue order
    updated.sort((x, y) => x.time - y.time);
    setHeapItems(updated);
  };

  const handlePopHeap = () => {
    if (heapItems.length === 0) return;
    const [, ...rest] = heapItems;
    setHeapItems(rest);
  };

  const formatMin = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Overview Card */}
      <div className="filter-card">
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f2c4c', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cpu size={22} color="#0ea594" />
          PlatformFlow Data Structures & Algorithms Architecture
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>
          PlatformFlow employs high-performance algorithms to guarantee sub-millisecond timetable lookups,
          prevent train collisions, compute optimal platform assignments, and traverse nationwide track topologies.
        </p>
      </div>

      {/* Algorithms Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginBottom: 28 }}>
        {algorithms.map((algo, idx) => (
          <div key={algo.id} className="filter-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2c4c' }}>
                {idx + 1}. {algo.name}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <span className="badge badge-superfast" style={{ fontSize: 10 }}>
                Time: {algo.time_complexity}
              </span>
              <span className="badge badge-shatabdi" style={{ fontSize: 10 }}>
                Space: {algo.space_complexity}
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#334155', marginBottom: 10, lineHeight: 1.5 }}>
              <strong>Use Case:</strong> {algo.use_case}
            </p>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, color: '#475569', border: '1px solid #e2e8f0' }}>
              {algo.explanation}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Sandbox Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        {/* Interactive Interval Overlap Tester */}
        <div className="filter-card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="#0ea594" />
            Live Interval-Overlap & Headway Buffer Sandbox
          </h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Test whether two train intervals conflict under a safety headway buffer:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label>Train A Arrival</label>
              <input type="time" className="form-input" value={aStart} onChange={e => { setAStart(e.target.value); calculateOverlap(); }} />
            </div>
            <div className="form-group">
              <label>Train A Departure</label>
              <input type="time" className="form-input" value={aEnd} onChange={e => { setAEnd(e.target.value); calculateOverlap(); }} />
            </div>
            <div className="form-group">
              <label>Train B Arrival</label>
              <input type="time" className="form-input" value={bStart} onChange={e => { setBStart(e.target.value); calculateOverlap(); }} />
            </div>
            <div className="form-group">
              <label>Train B Departure</label>
              <input type="time" className="form-input" value={bEnd} onChange={e => { setBEnd(e.target.value); calculateOverlap(); }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Safety Headway Buffer: {buffer} minutes</label>
            <input
              type="range"
              min={0}
              max={30}
              value={buffer}
              onChange={e => { setBuffer(Number(e.target.value)); calculateOverlap(); }}
            />
          </div>

          {overlapResult && (
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: overlapResult.hasOverlap ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${overlapResult.hasOverlap ? '#fecaca' : '#a7f3d0'}`
              }}
            >
              <div style={{ fontWeight: 700, color: overlapResult.hasOverlap ? '#991b1b' : '#065f46', fontSize: 14 }}>
                {overlapResult.hasOverlap
                  ? `CONFLICT DETECTED (${overlapResult.duration} min overlap)`
                  : 'PLATFORM INTERVAL CLEAR'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
                Mathematical Condition: {overlapResult.formula} → {overlapResult.evaluated} ({overlapResult.hasOverlap ? 'TRUE' : 'FALSE'})
              </div>
            </div>
          )}
        </div>

        {/* Interactive Min-Heap Priority Queue */}
        <div className="filter-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#0ea594" />
              Min-Heap Priority Queue Simulator (O(log K))
            </h3>
            <button
              className="btn-secondary"
              onClick={handlePopHeap}
              disabled={heapItems.length === 0}
              style={{ height: 30, fontSize: 11 }}
            >
              Pop Earliest Root
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Min-heap automatically maintains chronological railway events with O(1) peek and O(log K) insertion:
          </p>

          <form onSubmit={handlePushHeap} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              type="time"
              className="form-input"
              style={{ width: 110 }}
              value={newHeapTime}
              onChange={e => setNewHeapTime(e.target.value)}
              required
            />
            <input
              type="text"
              className="form-input"
              style={{ flexGrow: 1 }}
              value={newHeapLabel}
              placeholder="Event description"
              onChange={e => setNewHeapLabel(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" style={{ height: 42 }}>
              Push
            </button>
          </form>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', minHeight: 120 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
              Priority Queue Contents (Heap Order):
            </div>
            {heapItems.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8' }}>Heap is empty.</p>
            ) : (
              heapItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: idx === 0 ? '#e6f7f5' : '#ffffff',
                    border: idx === 0 ? '1px solid #0ea594' : '1px solid #e2e8f0',
                    borderRadius: 6,
                    marginBottom: 6,
                    fontSize: 12
                  }}
                >
                  <span>
                    {idx === 0 && <strong style={{ color: '#0ea594' }}>[ROOT] </strong>}
                    {item.label}
                  </span>
                  <span style={{ fontWeight: 700, color: '#0f2c4c' }}>
                    {formatMin(item.time)} ({item.time}m)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
