import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info
} from 'lucide-react';
import { uploadStationsFile, uploadTrainsFile, uploadDelaysFile } from '../api';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [importType, setImportType] = useState<'stations' | 'trains' | 'delays'>('trains');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      let res;
      if (importType === 'stations') {
        res = await uploadStationsFile(file);
      } else if (importType === 'trains') {
        res = await uploadTrainsFile(file);
      } else {
        res = await uploadDelaysFile(file);
      }
      setResult(res);
      if (res.success) {
        onImportSuccess();
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Import failed.'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    let content = '';
    let filename = '';

    if (importType === 'stations') {
      content = 'code,name,zone,state,platform_count\nNDLS,New Delhi,NR,Delhi,16\nCSMT,Mumbai CSMT,CR,Maharashtra,18\n';
      filename = 'sample_stations_DEMO.csv';
    } else if (importType === 'trains') {
      content = 'train_number,train_name,station_code,station_name,arrival,departure,halt_minutes,route_sequence,service_days,data_source,verified\n12951,Mumbai Rajdhani,MMCT,Mumbai Central,,17:00,0,1,MON-SUN,DEMO_VALIDATED,false\n12951,Mumbai Rajdhani,NDLS,New Delhi,08:32,,0,2,MON-SUN,DEMO_VALIDATED,false\n';
      filename = 'sample_trains_DEMO.csv';
    } else {
      content = JSON.stringify([
        {
          stationCode: 'TPTY',
          trainNumber: '17015',
          expectedArrival: '16:45',
          expectedDeparture: '17:05',
          delayMinutes: 35,
          updatedAt: '2026-10-17T16:20:00+05:30',
          source: 'Simulated Demo Feed'
        }
      ], null, 2);
      filename = 'sample_delays_DEMO.json';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UploadCloud size={22} color="#0ea594" />
            <div>
              <h3>Import Railway Datasets (CSV / JSON)</h3>
              <p style={{ fontSize: 11, color: '#64748b' }}>
                Strict Schema Validation & Integrity Enforcement
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Integrity Note */}
          <div className="disclaimer-banner" style={{ marginBottom: 16 }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>DEMO Data Integrity Policy:</strong> All imported timetables and delay adjustments
              are explicitly labelled with their source. Never present simulated feeds as live operational railway telemetry.
            </div>
          </div>

          <form onSubmit={handleUpload}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Select Dataset Target</label>
              <select
                className="form-select"
                value={importType}
                onChange={e => {
                  setImportType(e.target.value as any);
                  setFile(null);
                  setResult(null);
                }}
              >
                <option value="trains">Train Timetable Stops (CSV / JSON)</option>
                <option value="stations">Station Directory (CSV / JSON)</option>
                <option value="delays">Simulated Delay Updates (JSON Array)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Supported extensions: .csv, .json
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={downloadSampleTemplate}
                style={{ height: 30, fontSize: 11 }}
              >
                <Download size={12} />
                Download DEMO Template
              </button>
            </div>

            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 8,
                padding: '24px 16px',
                textAlign: 'center',
                background: '#f8fafc',
                marginBottom: 18,
                cursor: 'pointer'
              }}
            >
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                style={{ display: 'block', margin: '0 auto' }}
              />
              {file && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#0ea594' }}>
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!file || loading}>
                {loading ? 'Validating & Ingesting...' : 'Upload & Ingest'}
              </button>
            </div>
          </form>

          {/* Results Feedback */}
          {result && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 8,
                background: result.success ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${result.success ? '#a7f3d0' : '#fecaca'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {result.success ? (
                  <CheckCircle2 size={18} color="#059669" />
                ) : (
                  <AlertTriangle size={18} color="#dc2626" />
                )}
                <strong style={{ color: result.success ? '#065f46' : '#991b1b', fontSize: 13 }}>
                  {result.message}
                </strong>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                    Validation Errors:
                  </div>
                  <ul style={{ fontSize: 11, color: '#7f1d1d', paddingLeft: 16, marginTop: 4, maxHeight: 120, overflowY: 'auto' }}>
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
