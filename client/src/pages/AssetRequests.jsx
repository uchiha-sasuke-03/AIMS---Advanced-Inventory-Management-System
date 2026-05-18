import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Plus, Check, X, ClipboardCheck, ClipboardX, AlertCircle, 
  Clock, CheckCircle, XCircle, Send, HelpCircle, Loader2,
  Inbox, CheckCircle2, User, Calendar, MessageSquare, Tag, Terminal
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
      const assetList = res.data.assets || res.data || [];
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Asset Allocation Requests</h1>
          <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>
            {user?.role === 'admin' 
              ? 'Review, approve, and auto-allocate hardware configurations requested by employees.' 
              : 'Submit and track requisitions for developer machines, office hardware, and peripherals.'}
          </p>
        </div>
        
        <button 
          className="btn btn-primary flex items-center gap-2" 
          onClick={() => setShowRequestModal(true)}
          style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} />
          <span style={{ fontWeight: 600 }}>Request Asset</span>
        </button>
      </div>

      {/* Dynamic Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-primary)', background: 'var(--bg-glass)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
            <Inbox size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Total Submissions</span>
            <h4 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--text-primary)', lineHeight: 1 }}>{requests.length}</h4>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-warning)', background: 'var(--bg-glass)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Awaiting Review</span>
            <h4 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--status-warning)', lineHeight: 1 }}>{pendingCount}</h4>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-success)', background: 'var(--bg-glass)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Approved & Filled</span>
            <h4 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--status-success)', lineHeight: 1 }}>{approvedCount}</h4>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-danger)', background: 'var(--bg-glass)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)' }}>
            <XCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Declined Requests</span>
            <h4 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--status-danger)', lineHeight: 1 }}>{rejectedCount}</h4>
          </div>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="card mb-4" style={{ padding: '0.5rem', background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', borderRadius: '12px', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Requests', count: requests.length, color: 'var(--accent-primary)' },
          { id: 'pending', label: 'Pending Queue', count: pendingCount, color: 'var(--status-warning)' },
          { id: 'approved', label: 'Approved', count: approvedCount, color: 'var(--status-success)' },
          { id: 'rejected', label: 'Rejected', count: rejectedCount, color: 'var(--status-danger)' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`btn btn-sm ${filterStatus === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterStatus(tab.id)}
            style={{ 
              borderRadius: '8px', 
              padding: '0.5rem 1rem', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontWeight: filterStatus === tab.id ? 700 : 500
            }}
          >
            <span>{tab.label}</span>
            <span style={{ 
              fontSize: '0.7rem', 
              padding: '2px 6px', 
              borderRadius: '20px', 
              background: filterStatus === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)', 
              color: filterStatus === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Requests Core Board */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem 0' }}>
          <Loader2 className="animate-spin" size={36} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card empty-state" style={{ padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg-glass)' }}>
          <HelpCircle size={54} style={{ opacity: 0.25, margin: '0 auto 1.25rem auto', color: 'var(--text-secondary)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>No {filterStatus !== 'all' ? filterStatus : ''} requests found</h3>
          <p className="text-secondary" style={{ maxWidth: '400px', margin: '0.5rem auto 0 auto', fontSize: '0.875rem' }}>
            {user?.role === 'admin' 
              ? 'No pending employee hardware requests in this category.' 
              : 'Submit your first corporate hardware request by clicking the "Request Asset" button above.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map(req => {
            const dateStr = new Date(req.created_at).toLocaleDateString(undefined, { 
              month: 'short', day: 'numeric', year: 'numeric' 
            });

            return (
              <div 
                key={req.id} 
                className="card animate-fade-in" 
                style={{ 
                  padding: '1.25rem 1.5rem', 
                  background: 'var(--bg-glass)', 
                  border: '1px solid var(--border-primary)', 
                  position: 'relative',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', alignItems: 'flex-start' }}>
                  {/* User Initial Circle / Category Tag */}
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {req.user_name ? req.user_name.charAt(0) : <Tag size={20} />}
                  </div>

                  {/* Main request contents */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {req.category_name}
                      </h4>
                      {req.asset_name && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                          Specific Asset Selected: {req.asset_name}
                        </span>
                      )}
                      <span className={`badge ${
                        req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                      }`} style={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>
                        {req.status}
                      </span>
                    </div>

                    {/* Employee Metadata */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> Requester: <strong>{req.user_name}</strong> ({req.user_department || 'General'})
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} /> Filed On: <strong>{dateStr}</strong>
                      </span>
                    </div>

                    {/* Reason bubble */}
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--border-primary)', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <MessageSquare size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -1, color: 'var(--text-tertiary)' }} />
                      "{req.request_reason}"
                    </div>

                    {/* Resolution details block */}
                    {req.status !== 'pending' && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: req.status === 'approved' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-primary)' }}>
                        <strong style={{ color: req.status === 'approved' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                          {req.status === 'approved' ? '✓ Allocation Approved' : '✗ Request Declined'}
                        </strong>
                        {req.admin_notes && (
                          <span style={{ color: 'var(--text-secondary)' }}>: "{req.admin_notes}"</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Column (Admin Queue) */}
                  {user?.role === 'admin' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignSelf: 'center' }}>
                      {req.status === 'pending' ? (
                        <>
                          <button 
                            className="btn btn-success btn-sm flex items-center gap-1"
                            onClick={() => openActionModal(req, 'approve')}
                            style={{ padding: '0.5rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                          >
                            <Check size={14} /> Approve & Allocate
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm flex items-center gap-1"
                            onClick={() => openActionModal(req, 'reject')}
                            style={{ padding: '0.5rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-danger)', fontWeight: 600 }}
                          >
                            <X size={14} /> Decline Request
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={12} /> Log Archived
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. EMPLOYEE REQUEST MODAL */}
      {showRequestModal && (
        <div className="modal-backdrop" onClick={() => setShowRequestModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%', padding: '1.75rem', border: '1px solid var(--border-primary)', borderRadius: '16px', background: 'var(--bg-card)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Submit Hardware Allocation Request</h3>
              <button className="btn-ghost" onClick={() => setShowRequestModal(false)} style={{ padding: 4, borderRadius: '50%' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleRequestSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Asset Category <span className="text-danger">*</span></label>
                <select 
                  className="form-input" 
                  value={requestForm.category_id}
                  onChange={handleCategoryChange}
                  required
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select required category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {requestForm.category_id && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Preferred Model/Serial (Optional)</label>
                  <select 
                    className="form-input"
                    value={requestForm.asset_id}
                    onChange={e => setRequestForm(prev => ({ ...prev, asset_id: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Any available {categories.find(c => String(c.id) === String(requestForm.category_id))?.name || 'unit'}</option>
                    {availableAssets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} - Model: {a.model || 'Generic'} (Serial: {a.serial_number})</option>
                    ))}
                  </select>
                  {availableAssets.length === 0 && (
                    <p className="text-xs text-warning mt-1" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-warning)', marginTop: '0.5rem' }}>
                      <AlertCircle size={12} /> Note: No in-stock items. Admin will procure or transfer stock.
                    </p>
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Justification & Purpose <span className="text-danger">*</span></label>
                <textarea 
                  className="form-input" 
                  rows="4"
                  placeholder="Explain why you require this specific hardware configuration (e.g. Onboarding task workstation, upgrade for heavy AI compilations)..."
                  value={requestForm.request_reason}
                  onChange={e => setRequestForm(prev => ({ ...prev, request_reason: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div className="flex justify-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '8px' }}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary flex items-center gap-2" 
                  disabled={submitting}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  <span>Submit Requisition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADMIN ACTION MODAL (APPROVE/REJECT) */}
      {showActionModal && (
        <div className="modal-backdrop" onClick={() => setShowActionModal(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%', padding: '1.75rem', border: '1px solid var(--border-primary)', borderRadius: '16px', background: 'var(--bg-card)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {showActionModal.type === 'approve' ? 'Approve & Allocate Device' : 'Decline Hardware Request'}
              </h3>
              <button className="btn-ghost" onClick={() => setShowActionModal(null)} style={{ padding: 4, borderRadius: '50%' }}><X size={20} /></button>
            </div>
            
            <p className="text-sm text-secondary mb-4" style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
              🔑 Reviewing request from <strong>{showActionModal.request.user_name}</strong> for category: <strong>{showActionModal.request.category_name}</strong>.
            </p>

            <form onSubmit={handleActionSubmit}>
              {showActionModal.type === 'approve' && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Allocate Physical Hardware Asset <span className="text-danger">*</span></label>
                  {showActionModal.request.asset_id ? (
                    <div className="card text-xs" style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Terminal size={14} style={{ color: 'var(--status-info)' }} />
                      <div>
                        Employee requested specific inventory item:
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', marginTop: '0.15rem' }}>
                          {showActionModal.request.asset_name} ({showActionModal.request.asset_serial})
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <select 
                        className="form-input" 
                        value={actionForm.asset_id}
                        onChange={e => setActionForm(prev => ({ ...prev, asset_id: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                      >
                        <option value="">Select an available in-stock inventory...</option>
                        {availableAssets.map(a => (
                          <option key={a.id} value={a.id}>{a.name} - Model: {a.model || 'Generic'} (Serial: {a.serial_number})</option>
                        ))}
                      </select>
                      {availableAssets.length === 0 && (
                        <p className="text-xs text-danger mt-1" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-danger)', marginTop: '0.5rem' }}>
                          <AlertCircle size={12} /> Warning: No available in-stock units found. Please stock this category first or decline request.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {showActionModal.type === 'approve' ? 'Allocation & Setup Notes' : 'Reason for Decline'} 
                  <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 400 }}> (Optional)</span>
                </label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  placeholder={showActionModal.type === 'approve' 
                    ? 'Input tracking references, specific software installations done, or distribution desk pickup instructions...' 
                    : 'Input brief explanation of why this equipment cannot be allocated at this time...'}
                  value={actionForm.admin_notes}
                  onChange={e => setActionForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div className="flex justify-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowActionModal(null)} style={{ padding: '0.625rem 1.25rem', borderRadius: '8px' }}>Cancel</button>
                <button 
                  type="submit" 
                  className={`btn ${showActionModal.type === 'approve' ? 'btn-success' : 'btn-danger'} flex items-center gap-2`}
                  disabled={submitting || (showActionModal.type === 'approve' && !actionForm.asset_id && !showActionModal.request.asset_id)}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                  <span>{showActionModal.type === 'approve' ? 'Confirm Allocation' : 'Decline Requisition'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
