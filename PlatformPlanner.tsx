import React, { useState, useEffect } from 'react';
import {
  Layers,
  AlertTriangle,
  Play,
  Sliders,
  CheckCircle2,
  Clock,
  Train,
  ShieldAlert,
  Info
} from 'lucide-react';
import { PlatformTimelineResponse, PlatformConflict } from '../types';
import { getPlatformTimeline, runGreedyAllocation, simulateManualAssignment } from '../api';

interface PlatformPlannerProps {
  currentStation: string;
  onOpenTrainDetail: (trainNumber: string) => void;
}

export const PlatformPlanner: React.FC<PlatformPlannerProps> = ({
  currentStation,
  onOpenTrainDetail
}) => {
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('22:00');
  const [headwayBuffer, setHeadwayBuffer] = useState(10);
  const [selectedPlatform, setSelectedPlatform] = useState(1);

  const [timelineData, setTimelineData] = useState<PlatformTimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);

  // Manual simulator state
  const [simTrainNumber, setSimTrainNumber] = useState('');
  const [simTargetPlatform, setSimTargetPlatform] = useState(1);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, [currentStation, startTime, endTime, headwayBuffer]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await getPlatformTimeline(currentStation, startTime, endTime, headwayBuffer);
      setTimelineData(res);
      // Auto-set simulator train number to first available train if empty
      const allTrains = res.timelines.flatMap(t => t.occupancies);
      if (allTrains.length > 0 && !simTrainNumber) {
        setSimTrainNumber(allTrains[0].train_number);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunGreedy = async () => {
    setAllocating(true);
    try {
      await runGreedyAllocation({
        station_code: currentStation,
        start_time: startTime,
        end_time: endTime,
        headway_buffer_minutes: headwayBuffer
      });
      await fetchTimeline();
    } catch (err) {
      console.error(err);
    } finally {
      setAllocating(false);
    }
  };

  const handleSimulateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTrainNumber) return;
    setSimLoading(true);
    try {
      const res = await simulateManualAssignment({
        station_code: currentStation,
        train_number: simTrainNumber,
        target_platform: simTargetPlatform,
        start_time: startTime,
        end_time: endTime,
        buffer_minutes: headwayBuffer
      });
      setSimResult(res);
    } catch (err: any) {
      setSimResult({
        is_feasible: false,
        status_message: err.message || 'Error executing simulation'
      });
    } finally {
      setSimLoading(false);
    }
  };

  // Convert minutes into horizontal percentage position (0% at startTime to 100% at endTime)
  const calculateBlockStyle = (startMin: number, endMin: number) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let windowStart = sh * 60 + sm;
    let windowEnd = eh * 60 + em;

    if (windowStart >= windowEnd) {
      windowEnd += 1440; // overnight window
    }

    const windowDuration = Math.max(60, windowEnd - windowStart);
    let effStart = startMin;
    let effEnd = endMin;

    if (effStart < windowStart && effEnd > windowStart) effStart = windowStart;
    if (effEnd > windowEnd) effEnd = windowEnd;

    const leftPercent = Math.max(0, ((effStart - windowStart) / windowDuration) * 100);
    const widthPercent = Math.max(3, ((effEnd - effStart) / windowDuration) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`
    };
  };

  return (
    <div>
      {/* Top Banner */}
      <div className="disclaimer-banner">
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Strict Safety Constraint Policy:</strong> PlatformFlow implements conservative interval coloring
          with a minimum {headwayBuffer}-minute clearance buffer between consecutive train movements.
          It never overrides hard interlocking or yard clearance rules.
        </div>
      </div>

      {/* Simulator & Allocation Header */}
      <div className="filter-card">
        <div className="filter-header">
          <h2>
            <Sliders size={18} />
            Platform Planning & Allocation Controls ({currentStation})
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              onClick={handleRunGreedy}
              disabled={allocating}
            >
              <Play size={14} />
              {allocating ? 'Optimizing Plan...' : 'Run Greedy Platform Allocation'}
            </button>
          </div>
        </div>

        <div className="filter-grid">
          <div className="form-group">
            <label>Start Window</label>
            <input
              type="time"
              className="form-input"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>End Window</label>
            <input
              type="time"
              className="form-input"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Headway Safety Buffer (mins)</label>
            <input
              type="number"
              min={2}
              max={30}
              className="form-input"
              value={headwayBuffer}
              onChange={e => setHeadwayBuffer(parseInt(e.target.value) || 10)}
            />
          </div>

          <div className="form-group">
            <label>Active Constraints</label>
            <div style={{ fontSize: 12, color: '#047857', fontWeight: 600, paddingTop: 10 }}>
              ✓ Platform Length Checked • Headway ≥ {headwayBuffer}m
            </div>
          </div>
        </div>
      </div>

      {/* Detected Conflicts Alert Section */}
      {timelineData && timelineData.conflicts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#991b1b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} />
            {timelineData.conflicts.length} Platform Conflict(s) Detected
          </h3>
          {timelineData.conflicts.map(conf => (
            <div key={conf.conflict_id} className="conflict-alert-card">
              <div>
                <h4>
                  Platform {conf.platform_number} — {conf.conflict_type} ({conf.overlap_duration_minutes} min overlap)
                </h4>
                <p>
                  <strong>Train {conf.train_a_number}</strong> ({conf.train_a_name}) [{conf.train_a_interval}] conflicts with{' '}
                  <strong>Train {conf.train_b_number}</strong> ({conf.train_b_name}) [{conf.train_b_interval}].
                </p>
                <div style={{ fontSize: 12, color: '#451a03', marginTop: 4 }}>
                  <strong>Operational Recommendation:</strong> {conf.resolution_suggestion}
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={handleRunGreedy}
                style={{ fontSize: 11, height: 32 }}
              >
                Auto-Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Platform Occupancy Gantt Chart */}
      <div className="gantt-container">
        <div className="gantt-toolbar">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2c4c' }}>
              Platform Occupancy Timeline ({startTime} to {endTime})
            </h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              {timelineData ? `${timelineData.platform_count} Platforms • Execution time: ${timelineData.execution_time_ms} ms` : 'Loading...'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, background: '#0ea594', borderRadius: 3 }}></span>
              Clear Berth
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, background: '#dc2626', borderRadius: 3 }}></span>
              Conflict Overlap
            </span>
          </div>
        </div>

        <div className="gantt-board">
          {loading ? (
            <p style={{ textAlign: 'center', padding: 40 }}>Rendering platform timeline...</p>
          ) : !timelineData ? (
            <p style={{ textAlign: 'center', padding: 40 }}>No timeline data available.</p>
          ) : (
            timelineData.timelines.map(p => (
              <div key={p.platform_number} className="gantt-row">
                <div className="gantt-platform-label">
                  <span>Platform {p.platform_number}</span>
                  <span className="gantt-platform-sub">
                    {p.track_type} • {p.length_coaches} Coaches
                  </span>
                </div>

                <div className="gantt-track-lane">
                  {p.occupancies.map((occ, idx) => {
                    const blockStyle = calculateBlockStyle(occ.start_minutes, occ.end_minutes);
                    return (
                      <div
                        key={idx}
                        className={`gantt-block ${occ.has_conflict ? 'has-conflict' : ''}`}
                        style={blockStyle}
                        onClick={() => onOpenTrainDetail(occ.train_number)}
                        title={`${occ.train_number} - ${occ.train_name} (${occ.start_time_str} - ${occ.end_time_str})`}
                      >
                        <div style={{ fontWeight: 800 }}>{occ.train_number}</div>
                        <div style={{ fontSize: 9, opacity: 0.9 }}>
                          {occ.start_time_str}-{occ.end_time_str}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Platform-wise train viewer */}
      <div className="filter-card" style={{ marginTop: 20 }}>
        <div className="filter-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Train size={19} /> Platform-wise Train Details
          </h2>
          <div className="form-group" style={{ minWidth: 180, marginBottom: 0 }}>
            <label htmlFor="platform-train-viewer">Select a platform</label>
            <select
              id="platform-train-viewer"
              className="form-select"
              value={selectedPlatform}
              onChange={e => setSelectedPlatform(Number(e.target.value))}
              disabled={!timelineData}
            >
              {timelineData && Array.from({ length: timelineData.platform_count }, (_, i) => i + 1).map(platformNo => (
                <option key={platformNo} value={platformNo}>Platform {platformNo}</option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
          Trains shown here are taken directly from the current platform occupancy timeline for {startTime}–{endTime}.
          Change the time window above to inspect another period.
        </p>
        {loading ? (
          <p style={{ padding: 18 }}>Loading trains for Platform {selectedPlatform}…</p>
        ) : !timelineData ? (
          <p style={{ padding: 18 }}>Platform details are unavailable because the timeline could not be loaded.</p>
        ) : (() => {
          const platform = timelineData.timelines.find(item => item.platform_number === selectedPlatform);
          const occupancies = platform?.occupancies ?? [];
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <strong>Platform {selectedPlatform}</strong>
                <span style={{ fontSize: 12, fontWeight: 700, color: occupancies.length ? '#047857' : '#64748b' }}>
                  {occupancies.length} train movement{occupancies.length === 1 ? '' : 's'} in selected window
                </span>
              </div>
              {occupancies.length === 0 ? (
                <div style={{ padding: 16, borderRadius: 8, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
                  <strong>No trains are listed on Platform {selectedPlatform} during {startTime}–{endTime}.</strong>
                  <p style={{ margin: '6px 0 0', fontSize: 12 }}>
                    This means no occupancy was returned for this platform in the current plan; it does not guarantee real-world availability. Check clearance buffers, timetable accuracy, and operational restrictions before assigning a train.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '10px 8px' }}>Train</th>
                        <th style={{ padding: '10px 8px' }}>Name</th>
                        <th style={{ padding: '10px 8px' }}>Occupancy start</th>
                        <th style={{ padding: '10px 8px' }}>Occupancy end</th>
                        <th style={{ padding: '10px 8px' }}>Service role</th>
                        <th style={{ padding: '10px 8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...occupancies].sort((a, b) => a.start_minutes - b.start_minutes).map((occ, index) => (
                        <tr key={`${occ.train_number}-${occ.start_minutes}-${index}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '11px 8px' }}>
                            <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => onOpenTrainDetail(occ.train_number)}>
                              {occ.train_number}
                            </button>
                          </td>
                          <td style={{ padding: '11px 8px' }}>{occ.train_name}</td>
                          <td style={{ padding: '11px 8px', whiteSpace: 'nowrap' }}>{occ.start_time_str}</td>
                          <td style={{ padding: '11px 8px', whiteSpace: 'nowrap' }}>{occ.end_time_str}</td>
                          <td style={{ padding: '11px 8px' }}>{occ.role || '—'}</td>
                          <td style={{ padding: '11px 8px', color: occ.has_conflict ? '#b91c1c' : '#047857', fontWeight: 700 }}>
                            {occ.has_conflict ? 'Conflict — review' : 'In current plan'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* What-If Manual Assignment Simulator Card */}
      <div className="filter-card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} color="#0ea594" />
          What-If Platform Assignment Simulator
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Test assigning any train to a candidate platform in real time. The engine verifies platform length compatibility,
          headway clearance buffer, and detects potential conflicts before changes are approved.
        </p>

        <form onSubmit={handleSimulateAssignment} className="filter-grid" style={{ alignItems: 'end' }}>
          <div className="form-group">
            <label>Train Number</label>
            <input
              type="text"
              className="form-input"
              value={simTrainNumber}
              placeholder="e.g. 12951 or 12797"
              onChange={e => setSimTrainNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Candidate Target Platform</label>
            <select
              className="form-select"
              value={simTargetPlatform}
              onChange={e => setSimTargetPlatform(parseInt(e.target.value) || 1)}
            >
              {timelineData &&
                Array.from({ length: timelineData.platform_count }, (_, i) => i + 1).map(p => (
                  <option key={p} value={p}>
                    Platform {p}
                  </option>
                ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={simLoading}>
            {simLoading ? 'Verifying...' : 'Test Feasibility'}
          </button>
        </form>

        {simResult && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 8,
              background: simResult.is_feasible ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${simResult.is_feasible ? '#a7f3d0' : '#fecaca'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {simResult.is_feasible ? (
                <CheckCircle2 size={20} color="#059669" />
              ) : (
                <AlertTriangle size={20} color="#dc2626" />
              )}
              <strong style={{ color: simResult.is_feasible ? '#065f46' : '#991b1b', fontSize: 14 }}>
                {simResult.status_message}
              </strong>
            </div>

            <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
              {simResult.safety_disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
