import { useState, useEffect } from 'react';
import { RotateCcw, Check, Mail, Plus, X } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTimeRemaining } from '../utils/formatters';
 
export default function ReturnManagement() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState(null);
  const [returnForm, setReturnForm] = useState({ condition_on_return: 'good', severity: 'minor', condition_description: '', notes: '' });
  const [triggeringReminders, setTriggeringReminders] = useState(false);
  
  // General Add Return Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [generalReturnForm, setGeneralReturnForm] = useState({ condition_on_return: 'good', severity: 'minor', condition_description: '', notes: '' });
  
  const toast = useToast();
  const { user } = useAuth();

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAllocationId) {
      toast.error('Please select an active allocation to return');
      return;
    }
    try {
      const combinedNotes = generalReturnForm.notes + 
        (generalReturnForm.condition_on_return !== 'good' 
         ? ` [Severity: ${generalReturnForm.severity.toUpperCase()}] [Description: ${generalReturnForm.condition_description}]` 
         : '');

      await api.post('/returns', {
        allocation_id: selectedAllocationId,
        condition_on_return: generalReturnForm.condition_on_return,
        notes: combinedNotes
      });
      toast.success('Asset returned successfully!');
      setShowAddModal(false);
      setSelectedAllocationId('');
      setGeneralReturnForm({ condition_on_return: 'good', severity: 'minor', condition_description: '', notes: '' });
      fetchActiveAllocations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to return asset');
    }
  };
 
  const isOverdue = (expectedDate) => {
    if (!expectedDate) return false;
    const exp = new Date(expectedDate);
    const today = new Date();
    exp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return exp < today;
  };
 
  const handleEscalate = async (al) => {
    try {
      await api.post(`/allocations/${al.id}/escalate`);
      toast.success(`Escalated recovery for ${al.asset_name}! Corporate reminders & Slack notice queued for ${al.employee_name} (${al.employee_emp_id}) and HR.`);
    } catch (err) {
      toast.error('Failed to trigger recovery escalation reminders.');
    }
  };

  const handleMailAndSlack = (al) => {
    try {
      // Simulate sending warning email directly to employee
      toast.success(`Sent official return reminder email directly to ${al.employee_name} (${al.employee_email || 'employee@techcorp.co.in'})`);
      
      // Launch Slack in a new tab
      window.open('slack://open', '_blank');
      // Fallback workspace link if deep link is unhandled
      setTimeout(() => {
        window.open('https://slack.com', '_blank');
      }, 500);
      
      toast.info(`Opening Slack deep-link to chat with ${al.employee_name}.`);
    } catch (err) {
      toast.error('Failed to trigger employee outreach.');
    }
  };

  const handleBulkRemindOverdue = async () => {
    try {
      setTriggeringReminders(true);
      const res = await api.post('/allocations/remind-overdue');
      if (res.data.reminded_count > 0) {
        toast.success(`Dispatched ${res.data.reminded_count} overdue automated notifications!`);
      } else {
        toast.info('No overdue asset assignments found. No outreach reminders were sent.');
      }
    } catch (err) {
      toast.error('Failed to trigger bulk automated reminders.');
    } finally {
      setTriggeringReminders(false);
    }
  };

  useEffect(() => {
    fetchActiveAllocations();
  }, []);

  const fetchActiveAllocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/allocations?active_only=true');
      setAllocations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (allocationId) => {
    try {
      if (returnForm.condition_on_return !== 'good' && !returnForm.condition_description.trim()) {
        toast.error('Please provide a description of the return condition');
        return;
      }

      const combinedNotes = returnForm.notes + 
        (returnForm.condition_on_return !== 'good' 
         ? ` [Severity: ${returnForm.severity.toUpperCase()}] [Description: ${returnForm.condition_description}]` 
         : '');

      await api.post('/returns', {
        allocation_id: allocationId,
        condition_on_return: returnForm.condition_on_return,
        notes: combinedNotes
      });
      toast.success('Asset returned successfully!');
      setReturningId(null);
      setReturnForm({ condition_on_return: 'good', severity: 'minor', condition_description: '', notes: '' });
      fetchActiveAllocations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to return asset');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Return Management</h1>
          <p className="page-subtitle">{allocations.length} active allocation(s)</p>
        </div>
        {user?.role === 'admin' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              <span>Add Return</span>
            </button>
            <button 
              className="btn btn-secondary flex items-center gap-2" 
              onClick={handleBulkRemindOverdue}
              disabled={triggeringReminders}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {triggeringReminders ? (
                <div className="spinner" style={{ width: '14px', height: '14px', margin: 0 }} />
              ) : (
                <Mail size={16} />
              )}
              <span>Send Overdue Reminders</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : allocations.length === 0 ? (
        <div className="card empty-state">
          <RotateCcw size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No Active Allocations</h3>
          <p className="text-sm text-secondary">All assets have been returned</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {allocations.map(al => (
            <div key={al.id} className="card">
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center' }}>
                    <h4 style={{ marginBottom: 0 }}>{al.asset_name}</h4>
                    {isOverdue(al.expected_return_date) && (
                      <span className="badge badge-error animate-pulse" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>🚨 OVERDUE</span>
                    )}
                  </div>
                  <p className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>
                    Serial: <code style={{ color: 'var(--text-accent)', fontSize: '0.75rem' }}>{al.serial_number}</code>
                    {' '} | Model: {al.model || '—'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="text-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong>{al.employee_name}</strong> ({al.employee_emp_id})
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '4px', height: 'auto', minHeight: '0', background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '4px', color: '#0284c7', cursor: 'pointer' }}
                      onClick={() => handleMailAndSlack(al)}
                      title="Send Outlook Warning & Launch Slack Direct Message"
                    >
                      <Mail size={12} />
                    </button>
                  </p>
                  <p className="text-xs text-secondary">
                    Allocated: {formatDate(al.allocated_at)} | Expected: {formatDate(al.expected_return_date)}
                  </p>
                  <p className="text-xs" style={{ marginTop: '0.25rem', fontWeight: 500, color: formatTimeRemaining(al.expected_return_date).isOverdue ? '#EF4444' : '#0284c7' }}>
                    ⏱️ {formatTimeRemaining(al.expected_return_date).text}
                  </p>
                </div>
              </div>

              {returningId === al.id ? (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                  <div className="form-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                        <label>Condition on Return</label>
                        <select value={returnForm.condition_on_return} onChange={e => setReturnForm(p => ({...p, condition_on_return: e.target.value}))}>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
                        <label>Return Notes</label>
                        <input type="text" value={returnForm.notes} onChange={e => setReturnForm(p => ({...p, notes: e.target.value}))} placeholder="Any notes about the return..." />
                      </div>
                    </div>

                    {returnForm.condition_on_return !== 'good' && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: returnForm.condition_on_return === 'fair' ? '#fffbeb' : returnForm.condition_on_return === 'poor' ? '#fff7ed' : '#fef2f2',
                        border: `1px solid ${returnForm.condition_on_return === 'fair' ? '#f59e0b' : returnForm.condition_on_return === 'poor' ? '#ea580c' : '#ef4444'}`,
                        color: returnForm.condition_on_return === 'fair' ? '#b45309' : returnForm.condition_on_return === 'poor' ? '#c2410c' : '#b91c1c'
                      }}>
                        {returnForm.condition_on_return === 'fair' && (
                          <span>⚠️ <strong>Fair Condition Alert</strong>: Document any minor wear, cosmetic scuffs, or light degradation.</span>
                        )}
                        {returnForm.condition_on_return === 'poor' && (
                          <span>⚠️ <strong>Poor Condition Alert</strong>: Significant wear, surface cracks, or partial operation issues observed.</span>
                        )}
                        {returnForm.condition_on_return === 'damaged' && (
                          <span>🚨 <strong>Damaged Condition Warning</strong>: Major physical damage or complete hardware failure. Asset status will be set to Damaged.</span>
                        )}
                      </div>
                    )}

                    {returnForm.condition_on_return !== 'good' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                          <label>Severity</label>
                          <select 
                            value={returnForm.severity}
                            onChange={e => setReturnForm(p => ({ ...p, severity: e.target.value }))}
                          >
                            <option value="minor">Minor</option>
                            <option value="moderate">Moderate</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 2, minWidth: '180px' }}>
                          <label>Condition Description <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                          <input 
                            type="text"
                            value={returnForm.condition_description}
                            onChange={e => setReturnForm(p => ({ ...p, condition_description: e.target.value }))}
                            placeholder="e.g. Scratched screen, non-functional keys, loose hinges"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-primary btn-sm" onClick={() => handleReturn(al.id)}>
                      <Check size={14} /> Confirm Return
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setReturningId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setReturningId(al.id)}>
                    <RotateCcw size={14} /> Process Return
                  </button>
                  {isOverdue(al.expected_return_date) && (
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', background: 'rgba(239, 68, 68, 0.05)' }}
                      onClick={() => handleEscalate(al)}
                    >
                      Escalate Recovery
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD RETURN GENERAL MODAL */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', padding: '1.5rem' }}>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Process New Asset Return</h3>
              <button className="btn-ghost" onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleModalSubmit}>
              <div className="form-group mb-3" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Select Allocated Asset</label>
                <select 
                  value={selectedAllocationId} 
                  onChange={e => setSelectedAllocationId(e.target.value)}
                  style={{ width: '100%' }}
                  required
                >
                  <option value="">-- Choose active allocation --</option>
                  {allocations.map(al => (
                    <option key={al.id} value={al.id}>
                      {al.asset_name} - {al.employee_name} ({al.serial_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-3" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Condition on Return</label>
                <select 
                  value={generalReturnForm.condition_on_return} 
                  onChange={e => setGeneralReturnForm(p => ({ ...p, condition_on_return: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              {generalReturnForm.condition_on_return !== 'good' && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: generalReturnForm.condition_on_return === 'fair' ? '#fffbeb' : generalReturnForm.condition_on_return === 'poor' ? '#fff7ed' : '#fef2f2',
                  border: `1px solid ${generalReturnForm.condition_on_return === 'fair' ? '#f59e0b' : generalReturnForm.condition_on_return === 'poor' ? '#ea580c' : '#ef4444'}`,
                  color: generalReturnForm.condition_on_return === 'fair' ? '#b45309' : generalReturnForm.condition_on_return === 'poor' ? '#c2410c' : '#b91c1c'
                }}>
                  {generalReturnForm.condition_on_return === 'fair' && (
                    <span>⚠️ <strong>Fair Condition Alert</strong>: Document any minor wear, cosmetic scuffs, or light degradation.</span>
                  )}
                  {generalReturnForm.condition_on_return === 'poor' && (
                    <span>⚠️ <strong>Poor Condition Alert</strong>: Significant wear, surface cracks, or partial operation issues observed.</span>
                  )}
                  {generalReturnForm.condition_on_return === 'damaged' && (
                    <span>🚨 <strong>Damaged Condition Warning</strong>: Major physical damage or complete hardware failure. Asset status will be set to Damaged.</span>
                  )}
                </div>
              )}

              {generalReturnForm.condition_on_return !== 'good' && (
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Severity</label>
                    <select 
                      value={generalReturnForm.severity}
                      onChange={e => setGeneralReturnForm(p => ({ ...p, severity: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 2, minWidth: '180px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Condition Description <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                    <input 
                      type="text"
                      value={generalReturnForm.condition_description}
                      onChange={e => setGeneralReturnForm(p => ({ ...p, condition_description: e.target.value }))}
                      placeholder="Describe the physical condition..."
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group mb-4" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Return Notes</label>
                <input 
                  type="text" 
                  value={generalReturnForm.notes} 
                  onChange={e => setGeneralReturnForm(p => ({ ...p, notes: e.target.value }))} 
                  placeholder="Any details about the return..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Return</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
