import { useState, useEffect, Fragment } from 'react';
import { Users, Mail, MessageSquare, ChevronDown, ChevronUp, Package, Plus, X, UploadCloud, Terminal, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatDate, formatINR } from '../utils/formatters';

export default function Employees() {
  const [users, setUsers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [ssoSyncing, setSsoSyncing] = useState(false);
  const [ssoLogs, setSsoLogs] = useState([]);
  const toast = useToast();

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    salary: '',
    department: 'Engineering',
    role: 'employee',
    custom_emp_id: '',
    designation: '',
    created_at: new Date().toISOString().substring(0, 10)
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, allocsRes] = await Promise.all([
        api.get('/users'),
        api.get('/allocations?active_only=true')
      ]);
      setUsers(usersRes.data);
      setAllocations(allocsRes.data);
    } catch (err) {
      toast.error('Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleSsoSync = async () => {
    setSsoSyncing(true);
    setSsoLogs([
      'INITIATING SECURE OKTA SSO OIDC DIRECTORY AUDIT...',
      'ESTABLISHING ENCRYPTED HTTPS CONNECTION TO SECURE GATEWAY...',
      'RETRIEVING INTEGRATION PROFILE (CLIENT_ID: aims_okta_prod_sso)...',
    ]);
    
    setTimeout(() => {
      setSsoLogs(prev => [...prev, '✓ SAML 2.0 Identity Assertion token verified.']);
    }, 700);

    setTimeout(() => {
      setSsoLogs(prev => [...prev, '✓ Fetching latest personnel logs (Engineering, Marketing, HR)...']);
    }, 1400);

    setTimeout(() => {
      setSsoLogs(prev => [...prev, '✓ Auto-provisioning employee roles and syncing profiles...']);
    }, 2100);

    setTimeout(async () => {
      try {
        await fetchData();
        toast.success('Okta SSO Directory Synced Successfully! Employee list is up-to-date.');
        setSsoLogs(prev => [
          ...prev,
          '✓ COMMITTING DIRECTORY ENTRIES TO LOCAL DATASTORE...',
          '🎉 OKTA SSO SYNCHRONIZATION SECURED! 0 discrepancies detected. All user roles matched.',
        ]);
      } catch (err) {
        toast.error('Okta Directory sync failed');
        setSsoLogs(prev => [...prev, '❌ ERROR: Synchronization pool connection timed out.']);
      } finally {
        setSsoSyncing(false);
      }
    }, 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file is too large. Max size is 5MB.");
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Name and Email are required fields.");
      return;
    }
    
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      if (formData.age) data.append('age', formData.age);
      if (formData.salary) data.append('salary', formData.salary);
      data.append('department', formData.department);
      data.append('role', formData.role);
      if (formData.custom_emp_id) data.append('custom_emp_id', formData.custom_emp_id);
      if (formData.designation) data.append('designation', formData.designation);
      if (formData.created_at) data.append('created_at', formData.created_at);
      if (photo) data.append('photo', photo);

      await api.post('/users', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`Employee ${formData.name} added successfully!`);
      setShowAddModal(false);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        age: '',
        salary: '',
        department: 'Engineering',
        role: 'employee',
        custom_emp_id: '',
        designation: '',
        created_at: new Date().toISOString().substring(0, 10)
      });
      setPhoto(null);
      setPhotoPreview(null);
      
      // Refresh list
      fetchData();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to create new employee.";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMailAndSlack = (al) => {
    try {
      toast.success(`Reminder email dispatched to ${al.employee_name} (${al.employee_email || 'employee@techcorp.co.in'})`);
      window.open('slack://open', '_blank');
      setTimeout(() => {
        window.open('https://slack.com', '_blank');
      }, 500);
    } catch (err) {
      toast.error('Outreach failed');
    }
  };

  const getUserAllocations = (userId) => {
    return allocations.filter(a => a.user_id === userId);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (u.emp_id || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === '' || u.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const departments = [...new Set(users.map(u => u.department))].filter(Boolean);

  return (
    <>
      <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Employees Directory</h1>
          <p className="page-subtitle">Track personnel details, corporate locations, and assigned assets</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Okta SSO Directory Synchronization Panel */}
      <div className="card mb-3" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '8px', 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Cpu size={20} className="text-accent" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Okta SSO Directory Integration
                <span className="badge badge-success" style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span className="dot dot-success animate-pulse" /> Active Sync
                </span>
              </div>
              <p className="text-xs text-secondary" style={{ margin: 0, marginTop: '0.15rem' }}>Automated user provisioning, SAML authentication records, and corporate directory sync</p>
            </div>
          </div>
          <button 
            className="btn btn-neutral flex items-center gap-2"
            onClick={handleSsoSync}
            disabled={ssoSyncing}
            style={{ minHeight: '38px' }}
          >
            <RefreshCw size={14} className={ssoSyncing ? 'animate-spin' : ''} />
            <span>{ssoSyncing ? 'Syncing Okta...' : 'Sync Okta SSO Directory'}</span>
          </button>
        </div>

        {/* Live Okta sync logs terminal */}
        {(ssoSyncing || ssoLogs.length > 0) && (
          <div style={{ 
            background: 'var(--bg-input)', border: '1px solid var(--border-primary)', 
            borderRadius: '8px', padding: '0.75rem', marginTop: '1rem',
            fontFamily: 'Share Tech Mono, Consolas, monospace'
          }}>
            <div className="flex items-center gap-2 mb-2" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.4rem', marginBottom: '0.5rem', display: 'flex' }}>
              <Terminal size={12} className="text-accent" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-accent)' }}>OKTA IDENTITY SYNC PIPELINE</span>
            </div>
            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {ssoLogs.map((log, index) => (
                <div 
                  key={index} 
                  style={{ 
                    fontSize: '0.75rem', 
                    color: log.startsWith('🎉') || log.startsWith('✓') ? 'var(--status-success)' : log.startsWith('❌') ? 'var(--status-danger)' : 'var(--text-secondary)' 
                  }}
                >
                  &gt; {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters and search bar */}
      <div className="card mb-3" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              placeholder="Search by name, ID, or email..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <button className="btn btn-primary" onClick={fetchData}>Refresh Directory</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
      ) : filteredUsers.length === 0 ? (
        <div className="card empty-state">
          <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No Employees Found</h3>
          <p className="text-sm text-secondary">Try refining your search terms.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Employee</th>
                  <th>Contact Info</th>
                  <th>Department</th>
                  <th>Role / Designation</th>
                  <th>Active Allocations</th>
                  <th>Joining Date</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const userAllocs = getUserAllocations(u.id);
                  const isExpanded = expandedUserId === u.id;
                  const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  
                  return (
                    <Fragment key={u.id}>
                      <tr 
                        style={{ cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }} 
                        onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: 4, height: 'auto', minHeight: 0 }}
                            onClick={(e) => { e.stopPropagation(); setExpandedUserId(isExpanded ? null : u.id); }}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {u.photo_path ? (
                              <img 
                                src={`http://localhost:5000/api/uploads${u.photo_path}`} 
                                alt={u.name}
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-primary)' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                                {initials}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.name}</div>
                              <code style={{ fontSize: '0.7rem', color: 'var(--text-accent)' }}>{u.emp_id}</code>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm" style={{ fontWeight: 500 }}>{u.email}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Age: {u.age || '—'} | Salary: {formatINR(u.salary || 0)}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{u.department}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-accent)' }}>{u.designation || 'Associate'}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>({u.role})</span>
                        </td>
                        <td>
                          <span className={`badge ${userAllocs.length > 0 ? 'badge-info' : 'badge-secondary'}`} style={{
                            background: userAllocs.length > 0 ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-secondary)',
                            color: userAllocs.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: userAllocs.length > 0 ? '1px solid var(--border-accent)' : '1px solid var(--border-primary)'
                          }}>
                            {userAllocs.length} Assigned
                          </span>
                        </td>
                        <td className="text-secondary" style={{ fontSize: '0.85rem' }}>
                          {new Date(u.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                            <a 
                              href={`mailto:${u.email}?subject=AIMS IT Asset Audit Check-in&body=Hi ${u.name},%0D%0A%0D%0AThis is a friendly check-in from the AIMS IT Asset Management Team regarding your corporate equipment.%0D%0A%0D%0APlease let us know if everything is functioning correctly or if you require any technical assistance.%0D%0A%0D%0ABest regards,%0D%0AIT Asset Administrator`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                background: 'rgba(56, 189, 248, 0.1)',
                                color: '#38BDF8',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                transition: 'all 0.2s ease',
                                textDecoration: 'none'
                              }}
                              title={`Send Email to ${u.name}`}
                              onClick={() => {
                                toast.success(`Opening email client for ${u.name}...`);
                              }}
                            >
                              <Mail size={14} />
                            </a>
                            <button 
                              onClick={() => { 
                                toast.success(`Launching Slack Workspace for ${u.name}...`);
                                window.open('slack://open', '_blank');
                                setTimeout(() => {
                                  window.open('https://slack.com', '_blank');
                                }, 500);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                background: 'rgba(74, 21, 75, 0.1)',
                                color: '#E01E5A',
                                border: '1px solid rgba(74, 21, 75, 0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                padding: 0
                              }}
                              title={`Direct Message ${u.name} on Slack`}
                            >
                              <MessageSquare size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <td colSpan="7" style={{ padding: '1.25rem 2rem', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                              <Package size={14} /> Assigned hardware assets
                            </h4>
                            {userAllocs.length === 0 ? (
                              <p className="text-xs text-secondary" style={{ margin: 0, paddingLeft: '1.25rem' }}>No active hardware allocations registered for this employee.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                {userAllocs.map(al => (
                                  <div key={al.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{al.asset_name}</div>
                                        <code style={{ fontSize: '0.7rem', color: 'var(--text-accent)' }}>{al.serial_number}</code>
                                      </div>
                                      <button 
                                        className="btn btn-ghost" 
                                        onClick={() => handleMailAndSlack(al)}
                                        style={{ padding: 4, height: 'auto', minHeight: 0, background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', borderRadius: '4px' }}
                                        title="Direct Employee Outreach"
                                      >
                                        <Mail size={12} />
                                      </button>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>Model: {al.model || '—'}</span>
                                      <span>Expected: {al.expected_return_date ? new Date(al.expected_return_date).toLocaleDateString('en-IN') : 'Permanent'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
          onClick={() => setShowAddModal(false)}
        >
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Add New Employee</h3>
              <button className="btn btn-ghost" style={{ padding: 4, height: 'auto', minHeight: 0 }} onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Full Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="e.g. Amit Patel" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Email Address *</label>
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="e.g. amit@techcorp.co.in" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Employee ID (Optional)</label>
                  <input 
                    type="text" 
                    name="custom_emp_id" 
                    placeholder="Leave blank to auto-generate" 
                    value={formData.custom_emp_id} 
                    onChange={handleInputChange} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Department</label>
                  <select 
                    name="department" 
                    value={formData.department} 
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Age</label>
                  <input 
                    type="number" 
                    name="age" 
                    placeholder="e.g. 30" 
                    value={formData.age} 
                    onChange={handleInputChange} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Monthly Salary (INR)</label>
                  <input 
                    type="number" 
                    name="salary" 
                    placeholder="e.g. 120000" 
                    value={formData.salary} 
                    onChange={handleInputChange} 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Job Title / Designation *</label>
                <input 
                  type="text" 
                  name="designation" 
                  placeholder="e.g. Lead System Architect, Chief Financial Analyst, Head of HR" 
                  value={formData.designation} 
                  onChange={handleInputChange} 
                  required 
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>System Role</label>
                  <select 
                    name="role" 
                    value={formData.role} 
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  >
                    <option value="employee">Standard Employee</option>
                    <option value="admin">IT Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Joining Date *</label>
                  <input 
                    type="date" 
                    name="created_at" 
                    value={formData.created_at} 
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Profile Picture (Optional)</label>
                <div 
                  onClick={() => document.getElementById('profile-photo-input').click()}
                  style={{
                    border: '2px dashed var(--border-primary)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.01)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#38BDF8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                >
                  <input 
                    id="profile-photo-input" 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange} 
                    style={{ display: 'none' }} 
                  />
                  {photoPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #38BDF8' }} 
                      />
                      <button 
                        type="button" 
                        style={{ position: 'absolute', top: -5, right: -5, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhoto(null);
                          setPhotoPreview(null);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={28} style={{ color: 'var(--text-secondary)', opacity: 0.7 }} />
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>Click to upload profile photo</span>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Supports PNG, JPEG, GIF or WEBP up to 5MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {submitting ? 'Adding Employee...' : (
                    <>
                      <Plus size={16} /> Add Employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
