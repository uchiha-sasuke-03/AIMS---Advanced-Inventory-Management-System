import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Wrench, RefreshCw, Trash, ExternalLink, Calendar, User, IndianRupee } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatDate, formatINR } from '../utils/formatters';

export default function DamageLog() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, resolved
  const toast = useToast();

  useEffect(() => {
    fetchDamageReports();
  }, [filter]);

  const fetchDamageReports = async () => {
    setLoading(true);
    try {
      const resolvedParam = filter === 'active' ? 'false' : filter === 'resolved' ? 'true' : undefined;
      const url = resolvedParam !== undefined ? `/damage-reports?resolved=${resolvedParam}` : '/damage-reports';
      const res = await api.get(url);
      setReports(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load damage reports');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!resolutionNote.trim()) {
      toast.error('Please enter a resolution note.');
      return;
    }
    try {
      await api.put(`/damage-reports/${id}`, { resolution_note: resolutionNote });
      toast.success('Damage report marked as resolved!');
      setResolvingId(null);
      setResolutionNote('');
      fetchDamageReports();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve damage report');
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'low': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'high': return 'badge-danger';
      case 'critical': return 'badge-danger';
      default: return '';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'repair': return '#10B981'; // Green
      case 'replace': return '#3B82F6'; // Blue
      case 'retire': return '#EF4444'; // Red
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Damage & Triage Logs</h1>
          <p className="page-subtitle">AI-assisted hardware diagnostics and resolutions</p>
        </div>
        <Link to="/damage-reports/new" className="btn btn-primary">
          <AlertTriangle size={16} /> File Damage Report
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
        {[
          { key: 'all', label: 'All Reports' },
          { key: 'active', label: 'Active Issues' },
          { key: 'resolved', label: 'Resolved Logs' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn ${filter === tab.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : reports.length === 0 ? (
        <div className="card empty-state">
          <CheckCircle size={48} style={{ opacity: 0.3, color: 'var(--status-success)', marginBottom: '1rem' }} />
          <h3>All Systems Operational</h3>
          <p className="text-sm text-secondary">No damage reports matching the filter are outstanding.</p>
        </div>
      ) : (
        <div className="damage-grid">
          {reports.map(report => (
            <div key={report.id} className="card damage-card" style={{ borderColor: report.resolved ? undefined : 'rgba(239, 68, 68, 0.2)' }}>
              
              {/* Header */}
              <div className="damage-card-header">
                <div>
                  <h3 className="asset-title">{report.asset_name}</h3>
                  <p className="text-xs text-secondary">
                    Serial: <code style={{ color: 'var(--text-accent)' }}>{report.serial_number}</code> | Model: {report.model || '—'}
                  </p>
                </div>
                <div className="flex gap-1 items-center">
                  <span className={`badge ${getSeverityColor(report.severity)}`}>
                    {report.severity} severity
                  </span>
                  {report.resolved ? (
                    <span className="badge badge-success">Resolved</span>
                  ) : (
                    <span className="badge badge-warning">Active</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="damage-body">
                <p className="description-text">"{report.description}"</p>
                <div className="metadata-row">
                  <span><User size={12} /> Reported by: {report.reported_by_name}</span>
                  <span><Calendar size={12} /> Filed: {formatDate(report.reported_at)}</span>
                  <span>📍 Location: {report.location || 'Unknown'}</span>
                </div>
              </div>

              {/* AI TRIAGE WIDGET */}
              {report.ai_triage_action && (
                <div className="ai-triage-panel-ui">
                  <div className="ai-triage-header-ui">
                    <span className="ai-badge-ui">NVIDIA NIM Triage</span>
                    {report.ai_estimated_cost > 0 && (
                      <span className="ai-cost-ui">
                        Est. Cost: <strong>{formatINR(report.ai_estimated_cost)}</strong>
                      </span>
                    )}
                  </div>
                  
                  <div className="ai-triage-content-ui">
                    <div className="triage-status-ui">
                      <span className="bullet-ui" style={{ background: getActionColor(report.ai_triage_action) }} />
                      Suggested Action: <strong style={{ color: getActionColor(report.ai_triage_action), textTransform: 'uppercase', fontSize: '0.75rem' }}>{report.ai_triage_action}</strong>
                    </div>
                    <p className="ai-rec-text">
                      {report.ai_recommendation}
                    </p>
                  </div>
                </div>
              )}

              {/* Resolution Info */}
              {report.resolved ? (
                <div className="resolution-panel">
                  <h4 className="resolution-title"><CheckCircle size={14} style={{ color: 'var(--status-success)', display: 'inline', marginRight: 4, verticalAlign: -2 }} /> Resolution Action:</h4>
                  <p className="resolution-text">{report.resolution_note || 'Resolved without detailed notes.'}</p>
                </div>
              ) : (
                <div className="action-panel">
                  {resolvingId === report.id ? (
                    <div style={{ width: '100%' }}>
                      <textarea
                        className="w-full text-sm"
                        rows={2}
                        value={resolutionNote}
                        onChange={e => setResolutionNote(e.target.value)}
                        placeholder="Enter repair details, cost incurred, or replacement serial number..."
                        style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '0.5rem', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', marginBottom: '0.5rem' }}
                      />
                      <div className="flex gap-1">
                        <button className="btn btn-primary btn-sm" onClick={() => handleResolve(report.id)}>
                          Confirm Resolution
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setResolvingId(null); setResolutionNote(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => setResolvingId(report.id)}>
                      <Wrench size={12} /> Resolve Issue
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .damage-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        .damage-card {
          padding: 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          transition: all 0.2s;
        }
        .damage-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--border-primary);
          padding-bottom: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .asset-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .damage-body {
          margin-bottom: 1rem;
        }
        .description-text {
          font-size: 0.875rem;
          line-height: 1.5;
          color: var(--text-primary);
          font-style: italic;
          margin-bottom: 0.5rem;
        }
        .metadata-row {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .metadata-row span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        /* AI Triage UI Widget */
        .ai-triage-panel-ui {
          background: rgba(59, 130, 246, 0.05);
          border: 1px dashed rgba(59, 130, 246, 0.25);
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .ai-triage-header-ui {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
          padding-bottom: 0.375rem;
        }
        .ai-badge-ui {
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.05em;
        }
        .ai-cost-ui {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .ai-cost-ui strong {
          color: var(--text-primary);
        }
        .triage-status-ui {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
        }
        .bullet-ui {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .ai-rec-text {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin: 0;
        }

        /* Resolution info */
        .resolution-panel {
          background: rgba(16, 185, 129, 0.04);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }
        .resolution-title {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--status-success);
          margin-bottom: 0.25rem;
        }
        .resolution-text {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin: 0;
        }
        .action-panel {
          border-top: 1px solid var(--border-primary);
          padding-top: 0.75rem;
        }
      `}</style>
    </div>
  );
}
