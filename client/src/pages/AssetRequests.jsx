import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Plus, Check, X, ClipboardCheck, ClipboardX, AlertCircle, 
  Clock, CheckCircle, XCircle, Send, HelpCircle, Loader2
} from 'lucide-react';

export default function AssetRequests() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(null); // { request, type: 'approve' | 'reject' }
  
  // Forms state
  const [requestForm, setRequestForm] = useState({
    category_id: '',
    asset_id: '',
    request_reason: ''
  });
  const [actionForm, setActionForm] = useState({
    asset_id: '',
    admin_notes: ''
  });
  
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchRequests();
    fetchCategories();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests');
      setRequests(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories/list');
      setCategories(res.data);
    } catch (err) {
      addToast('Failed to load asset categories', 'error');
    }
  };

  // When employee changes category in request form, load available in-stock assets in that category
  const handleCategoryChange = async (e) => {
    const categoryId = e.target.value;
    setRequestForm(prev => ({ ...prev, category_id: categoryId, asset_id: '' }));
    
    if (!categoryId) {
      setAvailableAssets([]);
      return;
    }
    
    try {
      // Query assets matching this category that are 'in_stock'
      const res = await api.get(`/assets?category_id=${categoryId}&status=in_stock`);
      // Note: If /assets returns pagination object, extract list
      const assetList = res.data.assets || res.data || [];
      // Filter list to make sure they are in stock
      setAvailableAssets(assetList.filter(a => a.status === 'in_stock'));
    } catch (err) {
      console.error(err);
    }
  };

  // When admin opens action modal for approved category, fetch available assets
  const openActionModal = async (req, type) => {
    setShowActionModal({ request: req, type });
    setActionForm({ asset_id: '', admin_notes: '' });
    
    if (type === 'approve') {
      try {
        const res = await api.get(`/assets?category_id=${req.category_id}&status=in_stock`);
        const assetList = res.data.assets || res.data || [];
        setAvailableAssets(assetList.filter(a => a.status === 'in_stock'));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.category_id || !requestForm.request_reason) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }
    
    try {
      setSubmitting(true);
      await api.post('/requests', requestForm);
      addToast('Asset request submitted successfully!', 'success');
      setShowRequestModal(false);
      setRequestForm({ category_id: '', asset_id: '', request_reason: '' });
      fetchRequests();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    const { request, type } = showActionModal;
    
    if (type === 'approve' && !actionForm.asset_id && !request.asset_id) {
      addToast('Please select an asset to allocate', 'warning');
      return;
    }
    
    try {
      setSubmitting(true);
      await api.put(`/requests/${request.id}`, {
        status: type === 'approve' ? 'approved' : 'rejected',
        admin_notes: actionForm.admin_notes,
        asset_id: actionForm.asset_id || request.asset_id
      });
      addToast(`Request successfully ${type === 'approve' ? 'approved & allocated' : 'rejected'}!`, 'success');
      setShowActionModal(null);
      fetchRequests();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to process request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Asset Allocation Requests</h1>
          <p className="page-subtitle">
            {user?.role === 'admin' 
              ? 'Review and action hardware requests submitted by employee teams' 
              : 'Submit and track requests for corporate hardware, tools, and accessories'}
          </p>
        </div>
        
        {user?.role !== 'admin' && (
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowRequestModal(true)}>
            <Plus size={18} />
            <span>Request Asset</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="card mb-6" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus(status)}
            style={{ textTransform: 'capitalize' }}
          >
            {status} Requests
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin text-primary animate-spin" size={32} />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <HelpCircle size={48} className="text-secondary mb-3" style={{ margin: '0 auto 1rem auto' }} />
          <h3>No {filterStatus !== 'all' ? filterStatus : ''} requests found</h3>
          <p className="text-secondary">
            {user?.role === 'admin' 
              ? 'No pending employee requests in this queue.' 
              : 'Submit your first asset request by clicking the "Request Asset" button above.'}
          </p>
        </div>
      ) : (
        <div className="card table-container">
          <table className="table">
            <thead>
              <tr>
                {user?.role === 'admin' && <th>Employee</th>}
                <th>Requested Item</th>
                <th>Request Reason</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Resolution Details</th>
                {user?.role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr key={req.id}>
                  {user?.role === 'admin' && (
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.user_name}</div>
                      <div className="text-xs text-secondary">{req.user_department || 'General'}</div>
                    </td>
                  )}
                  <td>
                    <div style={{ fontWeight: 500 }}>{req.category_name}</div>
                    {req.asset_name && (
                      <span className="text-xs text-secondary">
                        Specific: {req.asset_name} ({req.asset_serial})
                      </span>
                    )}
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.85rem' }}>
                    {req.request_reason}
                  </td>
                  <td className="text-xs text-secondary">
                    {new Date(req.created_at).toLocaleDateString(undefined, { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: '240px', whiteSpace: 'normal', fontSize: '0.825rem' }}>
                    {req.status !== 'pending' ? (
                      <div>
                        {req.status === 'approved' ? (
                          <div className="text-success" style={{ fontWeight: 500 }}>Approved & Assigned</div>
                        ) : (
                          <div className="text-danger" style={{ fontWeight: 500 }}>Rejected</div>
                        )}
                        {req.admin_notes && (
                          <p className="text-xs text-secondary mt-1">"{req.admin_notes}"</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-secondary italic">Awaiting review...</span>
                    )}
                  </td>
                  {user?.role === 'admin' && (
                    <td>
                      {req.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-success btn-xs flex items-center gap-1"
                            onClick={() => openActionModal(req, 'approve')}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button 
                            className="btn btn-danger btn-xs flex items-center gap-1"
                            onClick={() => openActionModal(req, 'reject')}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-secondary italic">Processed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 1. EMPLOYEE REQUEST MODAL */}
      {showRequestModal && (
        <div className="modal-backdrop" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>New Asset Request</h3>
              <button className="btn-ghost" onClick={() => setShowRequestModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleRequestSubmit}>
              <div className="form-group">
                <label className="form-label">Asset Category <span className="text-danger">*</span></label>
                <select 
                  className="form-input" 
                  value={requestForm.category_id}
                  onChange={handleCategoryChange}
                  required
                >
                  <option value="">Select hardware category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {requestForm.category_id && (
                <div className="form-group">
                  <label className="form-label">Select Specific Model (Optional)</label>
                  <select 
                    className="form-input"
                    value={requestForm.asset_id}
                    onChange={e => setRequestForm(prev => ({ ...prev, asset_id: e.target.value }))}
                  >
                    <option value="">Any available {categories.find(c => String(c.id) === String(requestForm.category_id))?.name || 'item'}</option>
                    {availableAssets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} - Model: {a.model || 'Generic'} (Serial: {a.serial_number})</option>
                    ))}
                  </select>
                  {availableAssets.length === 0 && (
                    <p className="text-xs text-warning mt-1">⚠️ Note: No available in-stock items found. Admin will need to procure/stock items to allocate.</p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Justification / Reason for Request <span className="text-danger">*</span></label>
                <textarea 
                  className="form-input" 
                  rows="4"
                  placeholder="Explain why you require this equipment (e.g. Current laptop thermal throttling, onboarding new project workstation)"
                  value={requestForm.request_reason}
                  onChange={e => setRequestForm(prev => ({ ...prev, request_reason: e.target.value }))}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 mt-6" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADMIN ACTION MODAL (APPROVE/REJECT) */}
      {showActionModal && (
        <div className="modal-backdrop" onClick={() => setShowActionModal(null)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {showActionModal.type === 'approve' ? 'Approve & Allocate Asset' : 'Reject Asset Request'}
              </h3>
              <button className="btn-ghost" onClick={() => setShowActionModal(null)}><X size={20} /></button>
            </div>
            
            <p className="text-sm text-secondary mb-4">
              Reviewing request from <strong>{showActionModal.request.user_name}</strong> for category: <strong>{showActionModal.request.category_name}</strong>.
            </p>

            <form onSubmit={handleActionSubmit}>
              {showActionModal.type === 'approve' && (
                <div className="form-group">
                  <label className="form-label">Allocate Physical Asset <span className="text-danger">*</span></label>
                  {showActionModal.request.asset_id ? (
                    <div className="card text-xs" style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                      📝 Employee pre-selected specific hardware:
                      <div className="mt-1" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {showActionModal.request.asset_name} ({showActionModal.request.asset_serial})
                      </div>
                    </div>
                  ) : (
                    <div>
                      <select 
                        className="form-input" 
                        value={actionForm.asset_id}
                        onChange={e => setActionForm(prev => ({ ...prev, asset_id: e.target.value }))}
                        required
                      >
                        <option value="">Select an available in-stock asset...</option>
                        {availableAssets.map(a => (
                          <option key={a.id} value={a.id}>{a.name} - Model: {a.model || 'Generic'} (Serial: {a.serial_number})</option>
                        ))}
                      </select>
                      {availableAssets.length === 0 && (
                        <p className="text-xs text-danger mt-1">❌ No in-stock items are available in this category. You must add stock or reject this request.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {showActionModal.type === 'approve' ? 'Admin Allocation Notes' : 'Rejection Reason'} 
                  <span className="text-secondary"> (Optional)</span>
                </label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  placeholder={showActionModal.type === 'approve' 
                    ? 'Input any shipping references, custom configuration setup notes, etc.' 
                    : 'Input why this request cannot be fulfilled (e.g. Budget allocations frozen, duplicate request)'}
                  value={actionForm.admin_notes}
                  onChange={e => setActionForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowActionModal(null)}>Cancel</button>
                <button 
                  type="submit" 
                  className={`btn ${showActionModal.type === 'approve' ? 'btn-success' : 'btn-danger'} flex items-center gap-2`}
                  disabled={submitting || (showActionModal.type === 'approve' && !actionForm.asset_id && !showActionModal.request.asset_id)}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  <span>{showActionModal.type === 'approve' ? 'Approve & Assign' : 'Reject Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
