import React, { useState } from 'react';
import {
  GitBranch,
  ArrowRight,
  Navigation,
  Compass,
  Milestone,
  CheckCircle,
  Clock,
  Layers
} from 'lucide-react';
import { NetworkPathResponse, NetworkDfsResponse } from '../types';
import { findNetworkRoute } from '../api';

export const NetworkExplorer: React.FC = () => {
  const [origin, setOrigin] = useState('NDLS');
  const [destination, setDestination] = useState('CSMT');
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS'>('BFS');

  const [routeResult, setRouteResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await findNetworkRoute(origin, destination, algorithm);
      setRouteResult(res);
    } catch (err: any) {
      setError(err.message || 'Route exploration failed');
      setRouteResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search Header */}
      <div className="filter-card">
        <div className="filter-header">
          <h2>
            <Compass size={18} />
            Nationwide Railway Network Route Finder (Graph BFS & DFS)
          </h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Traversing Railway Network Adjacency Lists
          </span>
        </div>

        <form onSubmit={handleSearch} className="filter-grid" style={{ alignItems: 'end' }}>
          <div className="form-group">
            <label>Origin Station Code</label>
            <input
              type="text"
              className="form-input"
              value={origin}
              placeholder="e.g. NDLS, HWH, MAS"
              onChange={e => setOrigin(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="form-group">
            <label>Destination Station Code</label>
            <input
              type="text"
              className="form-input"
              value={destination}
              placeholder="e.g. CSMT, SBC, TPTY"
              onChange={e => setDestination(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="form-group">
            <label>Graph Traversal Algorithm</label>
            <select
              className="form-select"
              value={algorithm}
              onChange={e => setAlgorithm(e.target.value as 'BFS' | 'DFS')}
            >
              <option value="BFS">BFS — Shortest Path (Fewest Junction Hops)</option>
              <option value="DFS">DFS — Alternative Route Discovery</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            <Navigation size={14} />
            {loading ? 'Traversing Graph...' : 'Find Route'}
          </button>
        </form>
      </div>

      {error && (
        <div className="conflict-alert-card" style={{ marginBottom: 20 }}>
          <h4>Route Search Notice</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Route Results Display */}
      {routeResult && (
        <div>
          {algorithm === 'BFS' ? (
            /* BFS Result */
            <div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    <Milestone size={24} />
                  </div>
                  <div className="metric-data">
                    <p>Intermediate Hops</p>
                    <h3>{routeResult.hops_count} Hops</h3>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#ecfdf5', color: '#047857' }}>
                    <Navigation size={24} />
                  </div>
                  <div className="metric-data">
                    <p>Total Track Distance</p>
                    <h3>{routeResult.total_distance_km} km</h3>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
                    <GitBranch size={24} />
                  </div>
                  <div className="metric-data">
                    <p>Nodes Explored</p>
                    <h3>{routeResult.nodes_explored} Vertices</h3>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                    <Layers size={24} />
                  </div>
                  <div className="metric-data">
                    <p>Complexity</p>
                    <h3 style={{ fontSize: 18, marginTop: 6 }}>O(V + E)</h3>
                  </div>
                </div>
              </div>

              {/* Step by step route hops */}
              <div className="table-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2c4c' }}>
                    BFS Optimal Track Corridor: {origin} → {destination}
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b' }}>
                    Shortest path by intermediate junction transfers
                  </p>
                </div>

                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Hop #</th>
                        <th>Station</th>
                        <th>Section Distance</th>
                        <th>Cumulative Distance</th>
                        <th>Track Classification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routeResult.path.map((hop: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{idx === 0 ? 'Origin' : `Hop ${idx}`}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f2c4c' }}>{hop.station_name}</div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>Code: {hop.station_code}</span>
                          </td>
                          <td>{hop.distance_from_prev_km > 0 ? `${hop.distance_from_prev_km} km` : '—'}</td>
                          <td style={{ fontWeight: 600, color: '#0ea594' }}>{hop.cumulative_distance_km} km</td>
                          <td>
                            <span className="badge badge-superfast">{hop.line_type}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* DFS Routes */
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f2c4c', marginBottom: 14 }}>
                DFS Discovered {routeResult.routes_count} Alternative Route Option(s)
              </h3>
              {routeResult.routes.map((rt: any, idx: number) => (
                <div key={idx} className="filter-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0ea594' }}>
                      {rt.algorithm} ({rt.hops_count} Hops • {rt.total_distance_km} km)
                    </h4>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      Nodes visited: {rt.nodes_explored}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    {rt.path.map((node: any, nIdx: number) => (
                      <React.Fragment key={nIdx}>
                        <span style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          {node.station_code} ({node.station_name})
                        </span>
                        {nIdx < rt.path.length - 1 && <ArrowRight size={14} color="#94a3b8" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
