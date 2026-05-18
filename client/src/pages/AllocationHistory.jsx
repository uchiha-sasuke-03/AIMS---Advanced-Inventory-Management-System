import { useState, useEffect } from 'react';
import { History, User, Package, Search } from 'lucide-react';
import api from '../utils/api';
import { formatDate, formatDateTime, formatINR, formatStatus, getStatusBadge } from '../utils/formatters';

export default function AllocationHistory() {
  const [tab, setTab] = useState('all');
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
          { key: 'all', label: 'All History', icon: History },
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

      {/* All History Tab */}
      {tab === 'all' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : allocations.length === 0 ? (
            <div className="empty-state"><h3>No allocation history</h3></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Employee</th>
                    <th>Allocated By</th>
                    <th>Allocated On</th>
                    <th>Expected Return</th>
                    <th>Returned On</th>
                    <th>Condition</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(al => (
                    <tr key={al.id}>
                      <td style={{ fontWeight: 500 }}>{al.asset_name}</td>
                      <td>{al.employee_name} <span className="text-xs text-secondary">({al.employee_emp_id})</span></td>
                      <td className="text-secondary">{al.allocated_by_name || '—'}</td>
                      <td>{formatDate(al.allocated_at)}</td>
                      <td>{formatDate(al.expected_return_date)}</td>
                      <td>{al.returned_at ? formatDate(al.returned_at) : '—'}</td>
                      <td>{al.condition_on_return ? formatStatus(al.condition_on_return) : '—'}</td>
                      <td>
                        <span className={`badge ${al.returned_at ? 'badge-success' : 'badge-info'}`}>
                          {al.returned_at ? 'Returned' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
              <div className="card mb-2">
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3>{reportData.data.employee.name}</h3>
                    <p className="text-sm text-secondary">{reportData.data.employee.emp_id} • {reportData.data.employee.department} • {reportData.data.employee.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-center">
                      <span className="stat-value" style={{ fontSize: '1.25rem' }}>{reportData.data.stats.totalAllocations}</span>
                      <p className="text-xs text-secondary">Total</p>
                    </div>
                    <div className="text-center">
                      <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--status-info)' }}>{reportData.data.stats.activeAllocations}</span>
                      <p className="text-xs text-secondary">Active</p>
                    </div>
                    <div className="text-center">
                      <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--status-success)' }}>{reportData.data.stats.returnedAllocations}</span>
                      <p className="text-xs text-secondary">Returned</p>
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
              <div className="card">
                <h4 style={{ marginBottom: '1rem' }}>Lifecycle Timeline</h4>
                {reportData.data.timeline.length === 0 ? (
                  <p className="text-sm text-secondary">No events recorded</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {reportData.data.timeline.map((event, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                          background: event.type === 'allocation' ? 'var(--status-info)' : event.type === 'return' ? 'var(--status-success)' : 'var(--status-danger)'
                        }} />
                        <div>
                          <p className="text-sm" style={{ fontWeight: 500 }}>
                            {event.type === 'allocation' && `Allocated to ${event.details.employee_name}`}
                            {event.type === 'return' && `Returned by ${event.details.employee_name} — ${event.details.condition_on_return || 'good'}`}
                            {event.type === 'damage' && `Damage reported — ${event.details.severity}`}
                          </p>
                          <p className="text-xs text-secondary">{formatDateTime(event.date)}</p>
                        </div>
                      </div>
                    ))}
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
