import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { 
  Cloud, RefreshCw, AlertTriangle, ShieldCheck, 
  Trash2, IndianRupee, Users, Award, ShieldAlert, Cpu, Terminal
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function SaaSInventory() {
  const { addToast } = useToast();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);

  // Employee-wise licenses footprint states
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' or 'employees'
  const [employeeSaaS, setEmployeeSaaS] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchLicenses();
    } else {
      fetchEmployeeSaaS();
    }
  }, [activeTab]);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/saas');
      setLicenses(res.data);
    } catch (err) {
      addToast('Failed to load SaaS subscription inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeSaaS = async () => {
    try {
      setEmployeeLoading(true);
      const res = await api.get('/saas/employees');
      setEmployeeSaaS(res.data.employees);
      setEmployeeSummary(res.data.summary);
    } catch (err) {
      addToast('Failed to load employee cloud license footprint', 'error');
    } finally {
      setEmployeeLoading(false);
    }
  };

  const handleAuditSync = async () => {
    setSyncing(true);
    setTerminalLogs([
      'INITIATING MULTI-CLOUD AUDIT SWEEP...',
      'CONNECTING TO OKTA, AWS RESOURCE GROUPS, AND GOOGLE CLOUD ADMIN PANEL...',
      'COMPARING ACTIVE OKTA DIRECTORY DIRECT ASSIGNMENTS...',
      '⚠️ SaaS Audit: FIGMA Organization: Found 1 seat assigned to external contractor.',
      '⚠️ SaaS Audit: ZOOM Pro: Found 52 seats with zero calls hosted in 60 days.',
      '🔍 SCANNING IAAS & PAAS CLOUD INFRASTRUCTURE IN ACTIVE REGIONS...',
      '⚠️ IaaS Audit: AWS EC2: Found 3 orphaned EBS storage volumes costing ₹34,000/mo.',
      '⚠️ IaaS Audit: GCP Compute: Found 12 unused pre-emptible VM node instances.',
      '⚠️ PaaS Audit: AWS Beanstalk: Found 2 idle staging deployment environments.'
    ]);

    // Simulate stepping through log outputs with LED pulses
    setTimeout(() => {
      setTerminalLogs(prev => [...prev, '⚙️ INITIATING AUTOMATED CLOUD COST RECLAMATION PIPELINES...']);
    }, 1000);

    setTimeout(() => {
      setTerminalLogs(prev => [...prev, '✅ SaaS: Zoom downsized from 100 to 70 seats (-₹39,900/mo).']);
    }, 1800);

    setTimeout(() => {
      setTerminalLogs(prev => [...prev, '✅ IaaS: Purged 3 orphaned AWS volumes (+₹34,000/mo) and GCP VM nodes (+₹14,900/mo).']);
    }, 2600);

    setTimeout(async () => {
      try {
        const res = await api.post('/saas/sync');
        if (activeTab === 'subscriptions') {
          setLicenses(res.data.licenses);
        } else {
          await fetchEmployeeSaaS();
        }
        addToast(res.data.message, 'success');
        setTerminalLogs(prev => [
          ...prev,
          '✅ PaaS: Cleaned up Beanstalk idle environments (+₹12,400/mo).',
          '🔒 SECURITY SANITIZATION COMPLETE: Revoked expired Figma external seat (+₹3,750/mo).',
          '🎉 CLOUD COST OPTIMIZATION ARCHITECTURE FULLY SECURED!',
          '🎉 TOTAL MONTHLY SAVINGS CAPTURED: ₹1,04,950/mo!'
        ]);
      } catch (err) {
        addToast('Multi-cloud optimization sweep failed', 'error');
        setTerminalLogs(prev => [...prev, '❌ ERROR: Sync failed. Connection pool aborted.']);
      } finally {
        setSyncing(false);
      }
    }, 3800);
  };

  // Financial statistics calculations
  const totalMonthlySpend = licenses.reduce((sum, item) => sum + (item.occupied_seats * item.cost_per_seat), 0);
  const activeServices = licenses.length;
  const warningServices = licenses.filter(item => item.active_warnings).length;

  return (
    <div className="page-container animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">SaaS, PaaS, IaaS + Cloud Licenses</h1>
          <p className="page-subtitle">Manage, audit, and optimize corporate software seats, platform hosting engines, and multi-cloud virtual machine infrastructure</p>
        </div>
        {activeTab === 'subscriptions' && (
          <button 
            className="btn btn-primary flex items-center gap-2" 
            onClick={handleAuditSync}
            disabled={syncing || loading}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Sweeping Cloud...' : 'Run Cloud Optimization Audit'}</span>
          </button>
        )}
      </div>

      {/* Premium Skeuomorphic Tab Toggle */}
      <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '1px', marginBottom: '2rem' }}>
        <button 
          className={`btn ${activeTab === 'subscriptions' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ 
            borderRadius: '8px 8px 0 0', 
            borderBottom: activeTab === 'subscriptions' ? '2px solid var(--accent-primary)' : 'none',
            background: activeTab === 'subscriptions' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
          onClick={() => setActiveTab('subscriptions')}
        >
          ☁️ Cloud Service Directory
        </button>
        <button 
          className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ 
            borderRadius: '8px 8px 0 0', 
            borderBottom: activeTab === 'employees' ? '2px solid var(--accent-primary)' : 'none',
            background: activeTab === 'employees' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
          onClick={() => setActiveTab('employees')}
        >
          👤 Employee Footprint Directory
        </button>
      </div>

      {/* Recessed Glowing VFD Statistics Bar */}
      <div className="grid-3 mb-6" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeTab === 'subscriptions' ? 'Active Cloud Subscriptions' : 'Total Allocated Seats'}
              </span>
              <h2 className="mt-1" style={{ fontClassName: 'Share Tech Mono', fontSize: '2rem', color: 'var(--accent-primary)', textShadow: 'var(--accent-glow)' }}>
                {loading || employeeLoading ? '--' : activeTab === 'subscriptions' ? activeServices : (employeeSummary?.total_allocated_licenses || 0)}
              </h2>
            </div>
            <div className="badge badge-info" style={{ height: 'fit-content' }}>
              <Cloud size={16} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeTab === 'subscriptions' ? 'Total Cloud Spend / Month' : 'Total Employee Spend / Month'}
              </span>
              <h2 className="mt-1" style={{ fontClassName: 'Share Tech Mono', fontSize: '2rem', color: 'var(--status-success)', textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}>
                {loading || employeeLoading ? '--' : activeTab === 'subscriptions' ? formatINR(totalMonthlySpend) : formatINR(employeeSummary?.total_spend || 0)}
              </h2>
            </div>
            <div className="badge badge-success" style={{ height: 'fit-content' }}>
              <IndianRupee size={16} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeTab === 'subscriptions' ? 'Cloud Cost Warnings' : 'Average Footprint / Emp'}
              </span>
              <h2 className="mt-1" style={{ 
                fontClassName: 'Share Tech Mono', 
                fontSize: '2rem', 
                color: activeTab === 'subscriptions' ? (warningServices > 0 ? 'var(--status-warning)' : 'var(--status-success)') : 'var(--status-info)', 
                textShadow: activeTab === 'subscriptions' ? (warningServices > 0 ? '0 0 10px rgba(245, 158, 11, 0.4)' : '0 0 10px rgba(16, 185, 129, 0.4)') : '0 0 10px rgba(14, 165, 229, 0.4)' 
              }}>
                {loading || employeeLoading ? '--' : activeTab === 'subscriptions' ? warningServices : formatINR(employeeSummary?.average_spend_per_employee || 0)}
              </h2>
            </div>
            <div className={`badge ${activeTab === 'subscriptions' ? (warningServices > 0 ? 'badge-warning' : 'badge-success') : 'badge-info'}`} style={{ height: 'fit-content' }}>
              {activeTab === 'subscriptions' ? (warningServices > 0 ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />) : <Users size={16} />}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal sync log trace pane (if auditing) */}
      {activeTab === 'subscriptions' && (syncing || terminalLogs.length > 0) && (
        <div className="card mb-6" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)', padding: '1rem', fontFamily: 'Share Tech Mono, Consolas, monospace', marginBottom: '2rem' }}>
          <div className="flex items-center gap-2 mb-2" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <Terminal size={14} className="text-accent" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-accent)' }}>OKTA & CLOUD AUDIT ENGINE TERMINAL</span>
            {syncing && <div className="badge badge-warning btn-xs" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>Running Trace</div>}
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {terminalLogs.map((log, index) => (
              <div 
                key={index} 
                style={{ 
                  fontSize: '0.8rem', 
                  color: log.startsWith('🎉') ? 'var(--status-success)' : log.startsWith('✅') ? 'var(--status-success)' : log.startsWith('⚠️') ? 'var(--status-warning)' : 'var(--text-secondary)' 
                }}
              >
                &gt; {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SaaS Licenses / Employee Footprint Directory */}
      {loading || employeeLoading ? (
        <div className="skeleton" style={{ height: '350px', width: '100%' }} />
      ) : activeTab === 'subscriptions' ? (
        <div className="card" style={{ padding: '1.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Subscription / Service</th>
                <th>Category</th>
                <th>Monthly Rate</th>
                <th>Occupancy Ratio</th>
                <th>Next Renewal</th>
                <th>Status Led</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(item => {
                const occupancyPercent = Math.round((item.occupied_seats / item.total_seats) * 100);
                
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '6px', 
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Cloud size={16} className="text-accent" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          {item.active_warnings && (
                            <span className="text-xs text-warning flex items-center gap-1 mt-1" style={{ color: 'var(--status-warning)' }}>
                              <AlertTriangle size={12} /> {item.active_warnings}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatINR(item.cost_per_seat)}/seat</div>
                      <div className="text-xs text-secondary">Cost: {formatINR(item.occupied_seats * item.cost_per_seat)}/mo</div>
                    </td>
                    <td style={{ width: '220px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ 
                          flex: 1, height: '10px', background: 'var(--bg-secondary)', 
                          borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-primary)',
                          boxShadow: 'var(--shadow-inset)'
                        }}>
                          <div style={{ 
                            width: `${occupancyPercent}%`, 
                            height: '100%', 
                            background: occupancyPercent > 90 ? 'linear-gradient(90deg, #3b82f6, #ef4444)' : 'linear-gradient(90deg, #0ea5e9, #10b981)',
                            borderRadius: '10px'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                          {item.occupied_seats}/{item.total_seats} ({occupancyPercent}%)
                        </span>
                      </div>
                    </td>
                    <td className="text-sm">
                      {new Date(item.renewal_date).toLocaleDateString(undefined, { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </td>
                    <td>
                      {item.active_warnings ? (
                        <span className="badge badge-warning">Optimizable</span>
                      ) : (
                        <span className="badge badge-success">Healthy</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: '1.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Assigned Licenses</th>
                <th style={{ textAlign: 'center' }}>License Count</th>
                <th style={{ textAlign: 'right' }}>Monthly Footprint</th>
              </tr>
            </thead>
            <tbody>
              {employeeSaaS.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '38px', height: '38px', borderRadius: '50%', 
                        background: 'var(--accent-gradient)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
                      }}>
                        {emp.photo_path ? (
                          <img 
                            src={`http://localhost:5000/api/uploads${emp.photo_path}`} 
                            alt={emp.name}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          emp.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{emp.name}</div>
                        <div className="text-xs text-secondary">{emp.designation || 'Staff'} - {emp.department}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '550px' }}>
                      {emp.allocated_licenses.map(lic => {
                        const isSaaS = lic.category.toLowerCase().includes('saas');
                        const isPaaS = lic.category.toLowerCase().includes('paas');
                        const isIaaS = lic.category.toLowerCase().includes('iaas');
                        
                        let badgeStyle = { 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          fontWeight: 600,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        };
                        
                        if (isSaaS) {
                          badgeStyle = {
                            ...badgeStyle,
                            background: 'rgba(59, 130, 246, 0.08)',
                            color: '#3b82f6',
                            borderColor: 'rgba(59, 130, 246, 0.2)'
                          };
                        } else if (isPaaS) {
                          badgeStyle = {
                            ...badgeStyle,
                            background: 'rgba(168, 85, 247, 0.08)',
                            color: '#a855f7',
                            borderColor: 'rgba(168, 85, 247, 0.2)'
                          };
                        } else if (isIaaS) {
                          badgeStyle = {
                            ...badgeStyle,
                            background: 'rgba(249, 115, 22, 0.08)',
                            color: '#f97316',
                            borderColor: 'rgba(249, 115, 22, 0.2)'
                          };
                        } else {
                          badgeStyle = {
                            ...badgeStyle,
                            background: 'rgba(148, 163, 184, 0.08)',
                            color: '#94a3b8',
                            borderColor: 'rgba(148, 163, 184, 0.2)'
                          };
                        }
                        
                        return (
                          <span key={lic.id} style={badgeStyle} title={lic.category}>
                            {lic.name}
                          </span>
                        );
                      })}
                      {emp.allocated_licenses.length === 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>No cloud allocations</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {emp.allocated_licenses.length}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {formatINR(emp.total_monthly_spend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
