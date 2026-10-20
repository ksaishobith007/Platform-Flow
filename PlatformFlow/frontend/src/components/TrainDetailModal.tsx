import React, { useEffect, useState } from 'react';
import { X, Train, MapPin, Clock, ArrowRight } from 'lucide-react';
import { TrainDetail } from '../types';
import { getTrainDetail } from '../api';

interface TrainDetailModalProps {
  trainNumber: string | null;
  onClose: () => void;
}

export const TrainDetailModal: React.FC<TrainDetailModalProps> = ({ trainNumber, onClose }) => {
  const [detail, setDetail] = useState<TrainDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trainNumber) return;
    setLoading(true);
    setError(null);
    getTrainDetail(trainNumber)
      .then(data => setDetail(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [trainNumber]);

  if (!trainNumber) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Train size={22} color="#0ea594" />
            <div>
              <h3>
                {trainNumber} — {detail ? detail.train_name : 'Loading Train Profile...'}
              </h3>
              <p style={{ fontSize: 11, color: '#64748b' }}>
                {detail ? `${detail.train_type} • ${detail.total_coaches} Coaches • Days: ${detail.service_days}` : ''}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading && <p style={{ textAlign: 'center', padding: 20 }}>Retrieving route schedule...</p>}
          {error && <p style={{ color: '#dc2626', padding: 20 }}>{error}</p>}

          {detail && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Source</span>
                  <div style={{ fontWeight: 700 }}>{detail.source_station_name} ({detail.source_station_code})</div>
                  <div style={{ fontSize: 12, color: '#0ea594', fontWeight: 600 }}>Dep: {detail.origin_departure_time}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                  <ArrowRight size={20} />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Destination</span>
                  <div style={{ fontWeight: 700 }}>{detail.destination_station_name} ({detail.destination_station_code})</div>
                  <div style={{ fontSize: 12, color: '#0ea594', fontWeight: 600 }}>Arr: {detail.destination_arrival_time}</div>
                </div>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Full Route Stops & Platform Halts</h4>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Seq</th>
                      <th>Station</th>
                      <th>Arr</th>
                      <th>Dep</th>
                      <th>Halt</th>
                      <th>Distance</th>
                      <th>Day</th>
                      <th>Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.stops.map(stop => (
                      <tr key={stop.stop_sequence}>
                        <td style={{ fontWeight: 700 }}>{stop.stop_sequence}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{stop.station_name}</div>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{stop.station_code}</span>
                        </td>
                        <td>{stop.arrival_time || '— (Origin)'}</td>
                        <td>{stop.departure_time || '— (Terminus)'}</td>
                        <td>{stop.halt_minutes > 0 ? `${stop.halt_minutes} min` : '—'}</td>
                        <td>{stop.distance_km} km</td>
                        <td>Day {stop.day_offset + 1}</td>
                        <td>
                          <span className="platform-pill" style={{ width: 26, height: 26, fontSize: 11 }}>
                            P{stop.assigned_platform || stop.preferred_platform || 1}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
