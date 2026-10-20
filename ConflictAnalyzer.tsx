import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  Clock,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import { WhatIfComparisonResponse } from '../types';
import { getWhatIfComparison } from '../api';

interface ConflictAnalyzerProps {
  currentStation: string;
}

export const ConflictAnalyzer: React.FC<ConflictAnalyzerProps> = ({ currentStation }) => {
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('21:00');
  const [bufferMinutes, setBufferMinutes] = useState(10);

  const [data, setData] = useState<WhatIfComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComparison();
  }, [currentStation, startTime, endTime, bufferMinutes]);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await getWhatIfComparison(currentStation, startTime, endTime, bufferMinutes);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div className="disclaimer-banner">
        <HelpCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Avoidable Delay Estimation Assumptions:</strong> Potential waiting time savings are estimated
          based on eliminating home signal holding penalties and headway caution aspect travel under a nominal {bufferMinutes}-minute
          clearance buffer. These values represent simulated mathematical improvements and do not guarantee
          external network clearance.
        </div>
      </div>

      {/* Metrics Row */}
      {data && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="metric-data">
              <p>Baseline Conflicts</p>
              <h3>{data.baseline_conflicts_count}</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="metric-data">
              <p>Conflicts Resolved</p>
              <h3>{data.avoidable_waiting_analysis.conflicts_resolved}</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Clock size={24} />
            </div>
            <div className="metric-data">
              <p>Est. Minutes Saved</p>
              <h3>{data.avoidable_waiting_analysis.estimated_minutes_saved} min</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
              <TrendingDown size={24} />
            </div>
            <div className="metric-data">
              <p>Optimized Delay</p>
              <h3>{data.avoidable_waiting_analysis.optimized_waiting_minutes} min</h3>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2c4c' }}>
            Feasible Alternative Plans Comparison ({currentStation})
          </h3>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            Side-by-side evaluation of Platform Assignment strategies
          </p>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Plan Strategy</th>
                <th>Platform Conflicts</th>
                <th>Estimated Waiting Time</th>
                <th>Operational Viability</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>
                    Evaluating alternative plans...
                  </td>
                </tr>
              ) : !data ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>
                    No plan comparison available.
                  </td>
                </tr>
              ) : (
                data.alternative_plans.map(plan => (
                  <tr key={plan.plan_id}>
                    <td style={{ fontWeight: 700, color: '#0f2c4c' }}>
                      {plan.title}
                    </td>
                    <td>
                      {plan.conflicts > 0 ? (
                        <span className="badge badge-delayed">
                          {plan.conflicts} Conflict(s)
                        </span>
                      ) : (
                        <span className="badge badge-ontime">
                          0 Conflicts (Clear)
                        </span>
                      )}
                    </td>
                    <td>
                      {plan.plan_id === 'PLAN_A_BASELINE'
                        ? `${data.avoidable_waiting_analysis.baseline_waiting_minutes} min`
                        : `${data.avoidable_waiting_analysis.optimized_waiting_minutes} min`}
                    </td>
                    <td>
                      <span className="badge badge-superfast">
                        {plan.plan_id === 'PLAN_A_BASELINE' ? 'Standard Preference' : 'Optimal Dispatch'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#475569', maxWidth: 350 }}>
                      {plan.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Assumptions & Hard Constraints Policy */}
      <div className="filter-card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#0ea594" />
          Mathematical Modeling Assumptions & Hard Constraints
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f2c4c', marginBottom: 6 }}>
              Hard Operational Constraints (Inviolable)
            </h4>
            <ul style={{ fontSize: 12, color: '#475569', paddingLeft: 18, lineHeight: 1.8 }}>
              <li><strong>Platform Length:</strong> Train coaches (e.g. 24 coaches) cannot exceed platform capacity.</li>
              <li><strong>Headway Buffer:</strong> Minimum {bufferMinutes} minutes track circuit clearance required between consecutive moves.</li>
              <li><strong>Route Interlocking:</strong> Points and signals must be physically verified before route clearance.</li>
            </ul>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f2c4c', marginBottom: 6 }}>
              Avoidable Delay Calculation Model
            </h4>
            <ul style={{ fontSize: 12, color: '#475569', paddingLeft: 18, lineHeight: 1.8 }}>
              <li><strong>Direct Collision Penalty:</strong> Overlap duration + 5 min safety restart delay.</li>
              <li><strong>Headway Margin Violation:</strong> 6 min caution aspect running delay.</li>
              <li><strong>Flow Recovery:</strong> Dynamic reallocation saves up to {data ? data.avoidable_waiting_analysis.estimated_minutes_saved : 0} minutes of dwell time.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
