import { useState, useEffect } from 'react';
import { ArrowRightLeft, PlusCircle, List } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/formatters';

export default function Allocation() {
  const [activeTab, setActiveTab] = useState('new');
  const [activeAllocations, setActiveAllocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    user_id: '',
    asset_id: '',
    expected_return_date: '',
    notes: ''
  });
  const toast = useToast();

  const fetchActiveAllocations = async () => {
    try {
      const res = await api.get('/allocations?active_only=true');
      setActiveAllocations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAvailableAssets();
    fetchActiveAllocations();
  }, []);

  const selectedUser = users.find(u => String(u.id) === String(form.user_id));
  const selectedAsset = assets.find(a => String(a.id) === String(form.asset_id));

  const getRecommendation = () => {
    if (!selectedUser || !selectedAsset) return null;

    const dept = (selectedUser.department || '').toLowerCase();
    const assetName = (selectedAsset.name || '').toLowerCase();
    const price = parseFloat(selectedAsset.price || 0);

    const isHighSpec = price >= 100000 || assetName.includes('pro') || assetName.includes('macbook') || assetName.includes('x1');
    const isTechDept = dept.includes('eng') || dept.includes('it') || dept.includes('dev') || dept.includes('tech');

    if (isHighSpec && !isTechDept) {
      return {
        type: 'warning',
        text: `⚠ Budget Guard Alert: High-end asset selected. ${selectedUser.department} employees typically receive baseline laptops. Consider allocating a standard laptop to optimize IT budgets.`
      };
    }

    if (!isHighSpec && isTechDept) {
      return {
        type: 'info',
        text: `ℹ Performance Guard: Standard/low-spec asset selected. Engineering/Technical roles often require high-performance workstations to prevent workflow bottlenecks.`
      };
    }

    return {
      type: 'success',
      text: `✓ Best-Fit Match: Asset class is fully aligned with ${selectedUser.department} department guidelines.`
    };
  };

  const advice = getRecommendation();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailableAssets = async () => {
    try {
      const res = await api.get('/assets?status=in_stock&limit=100');
      setAssets(res.data.assets);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        asset_id: parseInt(form.asset_id),
        user_id: parseInt(form.user_id),
        expected_return_date: form.expected_return_date || null,
        notes: form.notes || null
      };
      await api.post('/allocations', payload);
      toast.success('Asset allocated successfully!');
      setForm({ user_id: '', asset_id: '', expected_return_date: '', notes: '' });
      fetchAvailableAssets();
      fetchActiveAllocations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to allocate asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Allocation Center</h1>
          <p className="page-subtitle">Manage, assign, and audit active employee hardware allocations</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 mb-3" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('new')}
        >
          <PlusCircle size={14} /> Allocate Asset
        </button>
        <button
          className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('list')}
        >
          <List size={14} /> Current Active Allocations ({activeAllocations.length})
        </button>
      </div>
 
      {activeTab === 'new' && (
        <div className="card animate-fade-in" style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user_id">Employee *</label>
            <select id="user_id" value={form.user_id} onChange={e => setForm(p => ({...p, user_id: e.target.value}))} required>
              <option value="">Select employee</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.emp_id}) — {u.department}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="asset_id">Available Asset *</label>
            <select id="asset_id" value={form.asset_id} onChange={e => setForm(p => ({...p, asset_id: e.target.value}))} required>
              <option value="">Select an asset</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.model} [{a.serial_number}] — {a.location} — {formatINR(a.price)}
                </option>
              ))}
            </select>
            {assets.length === 0 && <p className="form-error">No assets available for allocation</p>}
            
            {advice && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                border: '1px solid',
                background: advice.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : advice.type === 'info' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                borderColor: advice.type === 'warning' ? 'rgba(245, 158, 11, 0.25)' : advice.type === 'info' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                color: advice.type === 'warning' ? '#F59E0B' : advice.type === 'info' ? '#3B82F6' : '#10B981',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}>
                {advice.text}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expected_return_date">Expected Return Date</label>
              <input id="expected_return_date" type="date" value={form.expected_return_date} onChange={e => setForm(p => ({...p, expected_return_date: e.target.value}))} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={3} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Additional notes about this allocation..." />
          </div>

          <button type="submit" className="btn btn-primary mt-2" disabled={loading || assets.length === 0}>
            {loading ? <span className="spinner" /> : <><ArrowRightLeft size={16} /> Allocate Asset</>}
          </button>
        </form>
      </div>
      )}
 
      {activeTab === 'list' && (
        <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          {activeAllocations.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <h3>No Active Allocations</h3>
              <p className="text-sm text-secondary">All hardware is currently in stock.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Category</th>
                    <th>Model / Serial</th>
                    <th>Employee</th>
                    <th>Allocated By</th>
                    <th>Allocated On</th>
                    <th>Expected Return</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAllocations.map(al => (
                    <tr key={al.id}>
                      <td style={{ fontWeight: 500 }}>{al.asset_name}</td>
                      <td>
                        <span className="badge badge-info" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          {al.category_name || 'Electronics'}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm">{al.model || '—'}</div>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-accent)' }}>{al.serial_number}</code>
                      </td>
                      <td>
                        <div><strong>{al.employee_name}</strong></div>
                        <div className="text-xs text-secondary">{al.employee_emp_id}</div>
                      </td>
                      <td className="text-secondary">{al.allocated_by_name || 'System'}</td>
                      <td>{new Date(al.allocated_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span style={{ fontWeight: 500, color: al.expected_return_date && new Date(al.expected_return_date) < new Date() ? '#EF4444' : 'var(--text-primary)' }}>
                          {al.expected_return_date ? new Date(al.expected_return_date).toLocaleDateString('en-IN') : 'Permanent'}
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
    </div>
  );
}
