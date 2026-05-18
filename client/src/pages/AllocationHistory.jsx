import { useState, useEffect } from 'react';
import { History, User, Package, Search, Mail, Briefcase, Calendar, ShieldAlert, CheckCircle2, ScanEye, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import api from '../utils/api';
import { formatDate, formatDateTime, formatINR, formatStatus, getStatusBadge } from '../utils/formatters';

export default function AllocationHistory() {
  const [tab, setTab] = useState('employee');
  const [allocations, setAllocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchAllocations();
    fetchUsers();
    fetchAssets();
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/allocations');
      setAllocations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await api.get('/assets?limit=200');
      setAssets(res.data.assets);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployeeReport = async (userId) => {
    setSelectedUser(userId);
    if (!userId) { setReportData(null); return; }
    setLoading(true);
    try {
      const res = await api.get(`/reports/employee/${userId}`);
      setReportData({ type: 'employee', data: res.data });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetReport = async (assetId) => {
    setSelectedAsset(assetId);
    if (!assetId) { setReportData(null); return; }
    setLoading(true);
    try {
      const res = await api.get(`/reports/asset/${assetId}`);
      setReportData({ type: 'asset', data: res.data });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Allocation History</h1>
          <p className="page-subtitle">Track asset assignments and returns</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 mb-3" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
        {[
          { key: 'employee', label: 'By Employee', icon: User },
          { key: 'asset', label: 'By Asset', icon: Package },
        ].map(t => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => { setTab(t.key); setReportData(null); }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* By Employee Tab */}
      {tab === 'employee' && (
        <div>
          <div className="filter-bar">
            <select value={selectedUser} onChange={e => fetchEmployeeReport(e.target.value)} style={{ maxWidth: 350 }}>
              <option value="">Select an employee...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.emp_id}) — {u.department}</option>
              ))}
            </select>
          </div>

          {loading && selectedUser ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : reportData?.type === 'employee' ? (
            <div>
              <div className="card mb-3" style={{ padding: '1.5rem', background: 'var(--bg-glass)', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                  {/* Avatar or profile placeholder */}
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: 700 }}>
                    {reportData.data.employee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>{reportData.data.employee.name}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Briefcase size={14} style={{ color: 'var(--accent-primary)' }} /> {reportData.data.employee.designation || 'IT Specialist'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} style={{ color: 'var(--accent-primary)' }} /> Department: {reportData.data.employee.department}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Mail size={14} style={{ color: 'var(--accent-primary)' }} /> {reportData.data.employee.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} style={{ color: 'var(--accent-primary)' }} /> Joined: {formatDate(reportData.data.employee.created_at)}
                      </span>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <span className={`badge ${reportData.data.employee.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {reportData.data.employee.is_active ? 'Active Employee' : 'Inactive'}
                      </span>
                      <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                        Role: {reportData.data.employee.role || 'user'}
                      </span>
                      <span className="badge badge-secondary">
                        ID: {reportData.data.employee.emp_id}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{reportData.data.stats.totalAllocations}</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Total</span>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '60px', borderLeft: '1px solid var(--border-primary)', paddingLeft: '1rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-info)', display: 'block' }}>{reportData.data.stats.activeAllocations}</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--status-info)' }}>Active</span>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '60px', borderLeft: '1px solid var(--border-primary)', paddingLeft: '1rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-success)', display: 'block' }}>{reportData.data.stats.returnedAllocations}</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--status-success)' }}>Returned</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Asset</th><th>Category</th><th>Allocated</th><th>Returned</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {reportData.data.allocations.map(al => (
                      <tr key={al.id}>
                        <td>{al.asset_name} <span className="text-xs text-secondary">({al.serial_number})</span></td>
                        <td>{al.category_name}</td>
                        <td>{formatDate(al.allocated_at)}</td>
                        <td>{al.returned_at ? formatDate(al.returned_at) : '—'}</td>
                        <td><span className={`badge ${al.returned_at ? 'badge-success' : 'badge-info'}`}>{al.returned_at ? 'Returned' : 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !selectedUser ? (
            <div className="card empty-state"><User size={48} style={{ opacity: 0.3 }} /><h3>Select an Employee</h3><p className="text-sm text-secondary">Choose an employee to view their allocation history</p></div>
          ) : null}
        </div>
      )}

      {/* By Asset Tab */}
      {tab === 'asset' && (
        <div>
          <div className="filter-bar">
            <select value={selectedAsset} onChange={e => fetchAssetReport(e.target.value)} style={{ maxWidth: 450 }}>
              <option value="">Select an asset...</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.model} [{a.serial_number}]</option>
              ))}
            </select>
          </div>

          {loading && selectedAsset ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : reportData?.type === 'asset' ? (
            <div>
              <div className="card mb-2">
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3>{reportData.data.asset.name}</h3>
                    <p className="text-sm text-secondary">
                      {reportData.data.asset.model} • {reportData.data.asset.serial_number} • {reportData.data.asset.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusBadge(reportData.data.asset.status)}`}>{formatStatus(reportData.data.asset.status)}</span>
                    <span className="text-sm">{formatINR(reportData.data.asset.price)}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="card" style={{ padding: '1.5rem 2rem' }}>
                <div style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-primary)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Detailed Asset Lifecycle & Audit Trail</h3>
                </div>
                {reportData.data.timeline.length === 0 ? (
                  <p className="text-sm text-secondary">No lifecycle events recorded for this asset.</p>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: '1.75rem', borderLeft: '2px solid var(--border-primary)', marginLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {reportData.data.timeline.map((event, idx) => {
                      let iconColor = 'var(--status-info)';
                      let IconComponent = ArrowRightLeft;
                      let bgOpacityColor = 'rgba(59, 130, 246, 0.15)';
                      let title = '';
                      let extra = null;

                      if (event.type === 'allocation') {
                        iconColor = 'var(--status-info)';
                        bgOpacityColor = 'rgba(59, 130, 246, 0.15)';
                        IconComponent = ArrowRightLeft;
                        title = `Allocated to ${event.details.employee_name || 'Staff'}`;
                        extra = (
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>Employee Code: <strong>{event.details.employee_emp_id || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Authorized by: <strong>{event.details.allocated_by_name || 'Administrator'}</strong></span>
                          </div>
                        );
                      } else if (event.type === 'return') {
                        iconColor = 'var(--status-success)';
                        bgOpacityColor = 'rgba(16, 185, 129, 0.15)';
                        IconComponent = CheckCircle2;
                        title = `Returned & Restocked by ${event.details.employee_name || 'Staff'}`;
                        extra = (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span>Condition on Return: <strong style={{ textTransform: 'capitalize', color: event.details.condition_on_return === 'good' ? 'var(--status-success)' : 'var(--status-warning)' }}>{event.details.condition_on_return || 'good'}</strong></span>
                              {event.details.return_notes && (
                                <>
                                  <span>•</span>
                                  <span>Audit Notes: <em>"{event.details.return_notes}"</em></span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      } else if (event.type === 'damage') {
                        iconColor = 'var(--status-danger)';
                        bgOpacityColor = 'rgba(239, 68, 68, 0.15)';
                        IconComponent = AlertTriangle;
                        title = `Damage Report Filed`;
                        extra = (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>Reported by: <strong>{event.details.reported_by_name || 'Staff'}</strong></span>
                            <span>Severity: <strong style={{ color: 'var(--status-danger)' }}>{event.details.severity || 'Critical'}</strong></span>
                            {event.details.description && (
                              <span>Fault Description: <strong style={{ color: 'var(--text-primary)' }}>"{event.details.description}"</strong></span>
                            )}
                          </div>
                        );
                      } else if (event.type === 'scan') {
                        iconColor = '#a855f7';
                        bgOpacityColor = 'rgba(168, 85, 247, 0.15)';
                        IconComponent = ScanEye;
                        title = `Verified Physical QR Code Scanned`;
                        extra = (
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>Auditor User: <strong>{event.details.scanned_by_name || 'IT Inspector'}</strong></span>
                            <span>•</span>
                            <span>Status: <strong style={{ color: '#a855f7' }}>Passed Security Audit</strong></span>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          {/* Circle Badge Indicator */}
                          <div style={{
                            position: 'absolute',
                            left: '-2.2rem',
                            top: '2px',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: bgOpacityColor,
                            border: `2px solid ${iconColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            color: iconColor
                          }}>
                            <IconComponent size={14} />
                          </div>
                          {/* Event details */}
                          <div style={{ paddingLeft: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDateTime(event.date)}</span>
                            </div>
                            {extra}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : !selectedAsset ? (
            <div className="card empty-state"><Package size={48} style={{ opacity: 0.3 }} /><h3>Select an Asset</h3><p className="text-sm text-secondary">Choose an asset to view its full lifecycle</p></div>
          ) : null}
        </div>
      )}
    </div>
  );
}
