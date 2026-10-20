import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  Calendar,
  Filter,
  Train,
  AlertTriangle,
  Moon,
  Info,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Station, TimetableResponse, TimetableItem } from '../types';
import { searchStations, getTimetable } from '../api';

interface TimetableBoardProps {
  currentStation: string;
  onSelectStation: (code: string) => void;
  onOpenTrainDetail: (trainNumber: string) => void;
}

export const TimetableBoard: React.FC<TimetableBoardProps> = ({
  currentStation,
  onSelectStation,
  onOpenTrainDetail
}) => {
  // Search state
  const [stationQuery, setStationQuery] = useState(currentStation);
  const [stationSuggestions, setStationSuggestions] = useState<Station[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter state
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Timetable result
  const [data, setData] = useState<TimetableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch timetable when currentStation, startTime, endTime, selectedDay, or selectedType changes
  useEffect(() => {
    fetchData();
  }, [currentStation, startTime, endTime, selectedDay, selectedType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTimetable(
        currentStation,
        startTime,
        endTime,
        selectedDay === 'All' ? undefined : selectedDay,
        selectedType === 'All' ? undefined : selectedType
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Error loading timetable');
    } finally {
      setLoading(false);
    }
  };

  // Search autosuggest
  const handleStationInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStationQuery(val);
    if (val.trim().length >= 1) {
      try {
        const results = await searchStations(val);
        setStationSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        setStationSuggestions([]);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectStation = (st: Station) => {
    setStationQuery(st.code);
    setShowSuggestions(false);
    onSelectStation(st.code);
  };

  const isOvernight = startTime > endTime;

  const getTypeBadgeClass = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('rajdhani')) return 'badge-rajdhani';
    if (t.includes('vande')) return 'badge-vandebharat';
    if (t.includes('shatabdi')) return 'badge-shatabdi';
    if (t.includes('superfast')) return 'badge-superfast';
    return 'badge-express';
  };

  return (
    <div>
      {/* Disclaimer */}
      <div className="disclaimer-banner">
        <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Operational Data Integrity Notice:</strong> All timetable and platform assignments are derived
          from a verified demonstration railway dataset. No unauthorized live feeds are fabricated.
          Platform allocations represent simulated decision-support recommendations.
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <Train size={24} />
          </div>
          <div className="metric-data">
            <p>Trains In Interval</p>
            <h3>{data ? data.total_trains : 0}</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Clock size={24} />
          </div>
          <div className="metric-data">
            <p>Delayed Services</p>
            <h3>{data ? data.delayed_trains : 0}</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: '#ecfdf5', color: '#047857' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-data">
            <p>Platform Count</p>
            <h3>{data ? `${data.platform_count} Platforms` : '—'}</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: isOvernight ? '#ede9fe' : '#f1f5f9', color: isOvernight ? '#6d28d9' : '#475569' }}>
            <Moon size={24} />
          </div>
          <div className="metric-data">
            <p>Window Mode</p>
            <h3 style={{ fontSize: 18, marginTop: 6 }}>
              {isOvernight ? 'Overnight (Crosses 00:00)' : 'Standard Daylight'}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="filter-card">
        <div className="filter-header">
          <h2>
            <Filter size={18} />
            Train Movement Search & Time-Window Controls
          </h2>
          {isOvernight && (
            <span className="midnight-warning-tag">
              <Moon size={14} />
              Overnight Window ({startTime} → {endTime}): Midnight crossing algorithm active
            </span>
          )}
        </div>

        <div className="filter-grid">
          {/* Station Search Autosuggest */}
          <div className="form-group">
            <label>Nationwide Station</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingRight: 32 }}
                value={stationQuery}
                placeholder="Search station code or name (e.g. NDLS, CSMT, TPTY)"
                onChange={handleStationInputChange}
                onFocus={() => {
                  if (stationSuggestions.length > 0) setShowSuggestions(true);
                }}
              />
              <Search size={16} style={{ position: 'absolute', right: 10, top: 13, color: '#94a3b8' }} />
            </div>

            {showSuggestions && (
              <div className="suggest-dropdown">
                {stationSuggestions.map(st => (
                  <div
                    key={st.code}
                    className="suggest-item"
                    onClick={() => handleSelectStation(st)}
                  >
                    <div>
                      <span className="suggest-code">{st.code}</span>
                      <strong style={{ marginLeft: 8 }}>{st.name}</strong>
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {st.zone} • {st.platform_count} Platforms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Window Starts */}
          <div className="form-group">
            <label>Window Starts</label>
            <input
              type="time"
              className="form-input"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>

          {/* Time Window Ends */}
          <div className="form-group">
            <label>Window Ends</label>
            <input
              type="time"
              className="form-input"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>

          {/* Day of Week */}
          <div className="form-group">
            <label>Day of Week</label>
            <select
              className="form-select"
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
            >
              <option value="All">All Days</option>
              <option value="MON">Monday</option>
              <option value="TUE">Tuesday</option>
              <option value="WED">Wednesday</option>
              <option value="THU">Thursday</option>
              <option value="FRI">Friday</option>
              <option value="SAT">Saturday</option>
              <option value="SUN">Sunday</option>
            </select>
          </div>

          {/* Train Type */}
          <div className="form-group">
            <label>Train Category</label>
            <select
              className="form-select"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Rajdhani">Rajdhani Express</option>
              <option value="Vande Bharat">Vande Bharat</option>
              <option value="Shatabdi">Shatabdi Express</option>
              <option value="Superfast">Superfast Express</option>
              <option value="Express">Mail / Express</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timetable Table Card */}
      <div className="table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              {data ? `${data.station_name} (${data.station_code}) — Station Movements` : 'Loading Station...'}
            </h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Showing {data ? data.trains.length : 0} services between {startTime} and {endTime}
            </p>
          </div>
          <button className="btn-secondary" onClick={fetchData} style={{ height: 34, fontSize: 12 }}>
            Refresh
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Train Number</th>
                <th>Train Name</th>
                <th>Category</th>
                <th>Scheduled Arr / Dep</th>
                <th>Expected Arr / Dep</th>
                <th>Delay Status</th>
                <th>Role</th>
                <th>Platform</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32 }}>
                    Querying railway timetable engine...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#dc2626' }}>
                    {error}
                  </td>
                </tr>
              ) : !data || data.trains.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    No train services found for {currentStation} between {startTime} and {endTime}.
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      Tip: Try widening the time range (e.g., 00:00 to 23:59) or switching to major stations like NDLS, MMCT, CSMT, HWH, MAS.
                    </div>
                  </td>
                </tr>
              ) : (
                data.trains.map(train => (
                  <tr key={train.train_number}>
                    <td>
                      <span style={{ fontWeight: 800, color: '#0f2c4c' }}>{train.train_number}</span>
                      {train.crosses_midnight && (
                        <span className="badge badge-midnight" style={{ marginLeft: 6 }}>
                          <Moon size={10} /> Overnight
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{train.train_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {train.source_station_name} → {train.destination_station_name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(train.train_type)}`}>
                        {train.train_type}
                      </span>
                    </td>
                    <td>
                      <div>Arr: {train.scheduled_arrival || '— (Origin)'}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>Dep: {train.scheduled_departure || '— (Terminus)'}</div>
                    </td>
                    <td>
                      <div>Arr: {train.expected_arrival || '—'}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>Dep: {train.expected_departure || '—'}</div>
                    </td>
                    <td>
                      {train.delay_minutes > 0 ? (
                        <span className="badge badge-delayed">
                          +{train.delay_minutes} min late
                        </span>
                      ) : (
                        <span className="badge badge-ontime">
                          On Schedule
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        {train.role}
                      </span>
                    </td>
                    <td>
                      <span className="platform-pill">
                        P{train.assigned_platform || train.preferred_platform || 1}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() => onOpenTrainDetail(train.train_number)}
                        style={{ height: 30, padding: '0 8px', fontSize: 11 }}
                      >
                        <ExternalLink size={12} />
                        Route
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
