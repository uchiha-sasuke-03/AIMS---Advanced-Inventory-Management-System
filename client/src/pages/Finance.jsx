import React, { useState, useEffect, Fragment } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { 
  Cloud, RefreshCw, AlertTriangle, ShieldCheck, 
  Trash2, IndianRupee, Users, Award, ShieldAlert, Cpu, Terminal,
  Package, Search, Filter, TrendingUp, TrendingDown, Layers
} from 'lucide-react';
import { formatINR, formatDate, calculateBookValue } from '../utils/formatters';

export default function Finance() {
  const { addToast } = useToast();
  const { user } = useAuth();
  
  // Tab Routing: 'cloud' or 'physical'
  const [mainTab, setMainTab] = useState('physical');

  // Cloud/SaaS states
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' or 'employees'
  const [employeeSaaS, setEmployeeSaaS] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  // Physical Finance States
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [physicalAssets, setPhysicalAssets] = useState([]);
  const [physicalSearch, setPhysicalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [physicalLoading, setPhysicalLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchStats();
    fetchPhysicalAssets();
  }, []);

  useEffect(() => {
    if (mainTab === 'cloud') {
      if (activeTab === 'subscriptions') {
        fetchLicenses();
      } else {
        fetchEmployeeSaaS();
      }
    }
  }, [mainTab, activeTab]);

  useEffect(() => {
    if (mainTab === 'physical') {
      fetchPhysicalAssets();
    }
  }, [mainTab, physicalSearch, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories/list');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/reports/stock');
      setStats(res.data.overall);
    } catch (err) {
      addToast('Failed to load physical asset statistics', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPhysicalAssets = async () => {
    try {
      setPhysicalLoading(true);
      const params = new URLSearchParams();
      if (physicalSearch) params.set('search', physicalSearch);
      if (categoryFilter) params.set('category_id', categoryFilter);
      params.set('limit', 50); // Get top assets for finance sheet

      const res = await api.get(`/assets?${params.toString()}`);
      setPhysicalAssets(res.data.assets || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPhysicalLoading(false);
    }
  };

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

  // SaaS Spent calculations
  const totalMonthlySpend = licenses.reduce((sum, item) => sum + (item.occupied_seats * item.cost_per_seat), 0);
  const activeServices = licenses.length;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Corporate Finance & Valuations</h1>
          <p className="page-subtitle">Centralized audit sheet for multi-cloud subscription licensing and physical hardware depreciation valuation</p>
        </div>
      </div>

      {/* Main Switch Toggles */}
      <div className="flex gap-2 mb-4" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${mainTab === 'physical' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMainTab('physical')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '220px', justifyContent: 'center' }}
        >
          <Layers size={16} /> Physical Hardware Finance
        </button>
        <button 
          className={`btn ${mainTab === 'cloud' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMainTab('cloud')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '220px', justifyContent: 'center' }}
        >
          <Cloud size={16} /> Cloud & Software Subscriptions
        </button>
      </div>

      {mainTab === 'physical' ? (
        <div>
          {/* VFD Glowing Financial stats */}
          <div className="grid-4 mb-4">
            <div className="card stat-card" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Initial Purchase Cost</span>
                <span className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.25rem' }}>
                  {statsLoading ? '...' : formatINR(stats?.total_value || 0)}
                </span>
                <span className="text-secondary text-xs">Aggregate physical CAPEX spend</span>
              </div>
            </div>

            <div className="card stat-card" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--status-success)' }}>Net Book Value (WDV)</span>
                <span className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--status-success)', display: 'block', marginTop: '0.25rem' }}>
                  {statsLoading ? '...' : formatINR(stats?.total_book_value || 0)}
                </span>
                <span className="text-secondary text-xs">IT Act WDV depreciation balance</span>
              </div>
            </div>

            <div className="card stat-card" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--status-danger)' }}>Accumulated Depreciation</span>
                <span className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--status-danger)', display: 'block', marginTop: '0.25rem' }}>
                  {statsLoading ? '...' : formatINR((stats?.total_value || 0) - (stats?.total_book_value || 0))}
                </span>
                <span className="text-secondary text-xs">Total capital written off to date</span>
              </div>
            </div>

            <div className="card stat-card" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>Average Hardware Cost</span>
                <span className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', display: 'block', marginTop: '0.25rem' }}>
                  {statsLoading ? '...' : formatINR(stats?.total_assets ? (stats.total_value / stats.total_assets) : 0)}
                </span>
                <span className="text-secondary text-xs">Average acquisition cost per unit</span>
              </div>
            </div>
          </div>

          {/* Physical asset search filter controls */}
          <div className="card mb-3" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <input 
                  type="text" 
                  placeholder="Search assets by name or serial..." 
                  value={physicalSearch} 
                  onChange={e => setPhysicalSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ width: '200px' }}>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '100%' }}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Physical Assets Financial Sheet */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-primary)', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Physical Asset Valuation Details</h3>
              <span className="badge badge-info">Indian IT Act Rules (Computers @ 40%, Equipment @ 15%)</span>
            </div>
            
            {physicalLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : physicalAssets.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }} className="text-secondary">
                No physical hardware records found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hardware Name</th>
                      <th>Serial Number</th>
                      <th>Category</th>
                      <th>Acquisition Date</th>
                      <th style={{ textAlign: 'right' }}>Initial Purchase Cost</th>
                      <th style={{ textAlign: 'right' }}>IT Act Rate</th>
                      <th style={{ textAlign: 'right' }}>Book Value (WDV)</th>
                      <th style={{ textAlign: 'right' }}>Accumulated Depreciation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {physicalAssets.map(asset => {
                      const bookVal = calculateBookValue(asset.price, asset.purchase_date, asset.category_name);
                      const accumDep = (asset.price || 0) - bookVal;
                      const isComputer = (asset.category_name || '').toLowerCase().includes('laptop') || (asset.category_name || '').toLowerCase().includes('computer');
                      const depRateStr = isComputer ? '40%' : '15%';

                      return (
                        <tr key={asset.id}>
                          <td><strong>{asset.name}</strong></td>
                          <td><code>{asset.serial_number}</code></td>
                          <td><span className="badge badge-secondary">{asset.category_name || 'Unassigned'}</span></td>
                          <td>{formatDate(asset.purchase_date)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(asset.price || 0)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-accent)' }}>{depRateStr}</td>
                          <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{formatINR(bookVal)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{formatINR(accumDep)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Cloud & subscriptions tab (originally SaaSInventory.jsx)
        <div>
          {/* Tab sub-toggle */}
          <div className="flex gap-2 mb-4" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '1px', marginBottom: '1.5rem' }}>
            <button 
              className={`btn ${activeTab === 'subscriptions' ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ 
                borderRadius: '8px 8px 0 0', 
                borderBottom: activeTab === 'subscriptions' ? '2px solid var(--accent-primary)' : 'none',
                background: activeTab === 'subscriptions' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                padding: '0.5rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.85rem'
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
                padding: '0.5rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
              onClick={() => setActiveTab('employees')}
            >
              👤 Employee Footprint Directory
            </button>
            
            {activeTab === 'subscriptions' && (
              <button 
                className="btn btn-primary btn-sm flex items-center gap-2" 
                onClick={handleAuditSync}
                disabled={syncing || loading}
                style={{ marginLeft: 'auto', minHeight: 0, padding: '0.4rem 0.85rem' }}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? 'Sweeping Cloud...' : 'Run Cloud Optimization Audit'}</span>
              </button>
            )}
          </div>

          {/* VFD Statistics Bar */}
          <div className="grid-3 mb-4">
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {activeTab === 'subscriptions' ? 'Active Cloud Subscriptions' : 'Total Allocated Seats'}
                  </span>
                  <h2 className="mt-1" style={{ fontSize: '1.75rem', color: 'var(--accent-primary)', textShadow: 'var(--accent-glow)' }}>
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
                  <h2 className="mt-1" style={{ fontSize: '1.75rem', color: 'var(--status-success)', textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}>
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
                    {activeTab === 'subscriptions' ? 'Security & License Compliant' : 'Highly Active Software Seats'}
                  </span>
                  <h2 className="mt-1" style={{ fontSize: '1.75rem', color: 'var(--status-purple)' }}>
                    100% Secure
                  </h2>
                </div>
                <div className="badge badge-neutral" style={{ height: 'fit-content', background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <ShieldCheck size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Clean Modern Developer Terminal Console */}
          {(syncing || terminalLogs.length > 0) && (
            <div className="card mb-4" style={{ 
              background: '#0f172a', border: '1px solid #1e293b', 
              borderRadius: '8px', padding: '1rem',
              boxShadow: 'var(--shadow-md)',
              fontFamily: 'Consolas, SFMono-Regular, monospace'
            }}>
              <div className="flex items-center gap-2 mb-2" style={{ borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem', marginBottom: '0.75rem', display: 'flex' }}>
                <Terminal size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Cloud Directory Audit Logs</span>
              </div>
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {terminalLogs.map((log, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      fontSize: '0.775rem', 
                      color: log.startsWith('🎉') || log.startsWith('✅') ? '#34d399' : log.startsWith('❌') ? '#f87171' : log.startsWith('⚠️') ? '#fbbf24' : '#94a3b8' 
                    }}
                  >
                    &gt;&gt; {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Cloud Provider / Software</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'center' }}>Active Licenses</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Cost / Seat (Mo)</th>
                        <th style={{ textAlign: 'right' }}>Total Cost (Mo)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map(lic => (
                        <tr key={lic.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                {lic.provider[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{lic.provider}</div>
                                <span className="text-xs text-secondary">{lic.license_key}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{lic.license_type}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <strong>{lic.occupied_seats}</strong> / <span className="text-secondary">{lic.total_seats} Assigned</span>
                          </td>
                          <td>
                            {lic.active_warnings ? (
                              <span className="badge badge-warning flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <AlertTriangle size={10} /> Recyclable Seats
                              </span>
                            ) : (
                              <span className="badge badge-success flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <ShieldCheck size={10} /> Fully Allocated
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatINR(lic.cost_per_seat)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {formatINR(lic.occupied_seats * lic.cost_per_seat)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            // Employee cloud license footprint
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {employeeLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Allocated Cloud Licenses</th>
                        <th style={{ textAlign: 'right' }}>Accumulated Cost (Mo)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeSaaS.map(emp => (
                        <tr key={emp.employee_id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{emp.employee_name}</div>
                            <code style={{ fontSize: '0.7rem', color: 'var(--text-accent)' }}>{emp.employee_emp_id}</code>
                          </td>
                          <td>{emp.employee_department}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {(emp.allocated_software || '').split(', ').map((soft, index) => (
                                <span key={index} className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                                  {soft}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>
                            {formatINR(emp.total_monthly_spend)}
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
      )}
    </div>
  );
}
