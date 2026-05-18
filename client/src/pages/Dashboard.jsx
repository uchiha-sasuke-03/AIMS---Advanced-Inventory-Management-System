import { useState, useEffect } from 'react';
import { 
  Package, Monitor, Smartphone, Mouse, AlertTriangle, TrendingUp, MapPin, 
  ArrowRightLeft, CheckSquare, CornerDownLeft, DollarSign, AlertOctagon 
} from 'lucide-react';
import api from '../utils/api';
import { formatINR, formatDate, formatStatus, getStatusBadge } from '../utils/formatters';

const categoryIcons = {
  'Laptops': Package,
  'Monitors': Monitor,
  'Phones': Smartphone,
  'Accessories': Mouse,
};

function getRelativeTimeString(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiJustification, setAiJustification] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    fetchDashboard();
    
    // Auto-polling interval every 5 seconds for absolute real-time dashboard sync
    const interval = setInterval(() => {
      fetchDashboardSilent();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/stock');
      setData(res.data);
      setLastSynced(new Date().toLocaleTimeString());
      if (res.data?.capex?.ai_justification) {
        setAiJustification(res.data.capex.ai_justification);
      }
      triggerAiJustification();
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardSilent = async () => {
    try {
      const res = await api.get('/reports/stock');
      setData(res.data);
      setLastSynced(new Date().toLocaleTimeString());
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    } catch (err) {
      console.error('Dashboard silent refresh error:', err);
    }
  };

  const triggerAiJustification = async () => {
    setAiLoading(true);
    try {
      const res = await api.get('/reports/capex-justification');
      if (res.data?.justification) {
        setAiJustification(res.data.justification);
      }
    } catch (err) {
      console.error('Failed to generate live AI justification:', err);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h1 className="page-title">Dashboard</h1></div>
        <div className="grid-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  if (!data) return <div className="empty-state"><h3>Failed to load dashboard</h3></div>;

  const { summary, overall, lowStockWarnings, recentAllocations, locationBreakdown, liveActivity } = data;
 
  const totalCategoryAssets = summary ? summary.reduce((sum, c) => sum + c.total_assets, 0) : 0;
  const colors = ['#38BDF8', '#10B981', '#F59E0B', '#A855F7'];
  
  let tempAccumulator = 0;
  const donutSegments = summary ? summary.map((cat, idx) => {
    const percentage = totalCategoryAssets > 0 ? (cat.total_assets / totalCategoryAssets) : 0;
    const strokeLength = percentage * 251.2;
    const strokeOffset = 251.2 - strokeLength + tempAccumulator;
    tempAccumulator -= strokeLength;
    return {
      ...cat,
      strokeLength,
      strokeOffset,
      color: colors[idx % colors.length]
    };
  }) : [];

  // Math for Stock by Location Pie/Donut Chart
  const totalLocationAssets = locationBreakdown ? locationBreakdown.reduce((sum, l) => sum + l.count, 0) : 0;
  const locationColors = ['#0EA5E9', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#6366F1'];
  
  let locAccumulator = 0;
  const locationSegments = locationBreakdown ? locationBreakdown.map((loc, idx) => {
    const percentage = totalLocationAssets > 0 ? (loc.count / totalLocationAssets) : 0;
    const strokeLength = percentage * 251.2;
    const strokeOffset = 251.2 - strokeLength + locAccumulator;
    locAccumulator -= strokeLength;
    return {
      ...loc,
      percentage: Math.round(percentage * 100),
      strokeLength,
      strokeOffset,
      color: locationColors[idx % locationColors.length]
    };
  }) : [];

  // 1. Asset Requests Segment Calculations
  const requestsBreakdown = data.requestsBreakdown || [];
  const totalRequests = requestsBreakdown.reduce((sum, r) => sum + r.count, 0);
  const requestColors = {
    'approved': '#10B981',
    'pending': '#F59E0B',
    'declined': '#EF4444',
    'rejected': '#EF4444'
  };
  
  let reqAccumulator = 0;
  const requestSegments = requestsBreakdown.map((req) => {
    const percentage = totalRequests > 0 ? (req.count / totalRequests) : 0;
    const strokeLength = percentage * 251.2;
    const strokeOffset = 251.2 - strokeLength + reqAccumulator;
    reqAccumulator -= strokeLength;
    return {
      ...req,
      percentage: Math.round(percentage * 100),
      strokeLength,
      strokeOffset,
      color: requestColors[req.status.toLowerCase()] || '#A855F7'
    };
  });

  // 2. Returns Condition Segment Calculations
  const returnsBreakdown = data.returnsBreakdown || [];
  const totalReturns = returnsBreakdown.reduce((sum, r) => sum + r.count, 0);
  const returnColors = {
    'good': '#10B981',
    'damaged': '#EF4444',
    'needs_repair': '#3b82f6',
    'repair': '#3b82f6'
  };
  
  let retAccumulator = 0;
  const returnSegments = returnsBreakdown.map((ret) => {
    const percentage = totalReturns > 0 ? (ret.count / totalReturns) : 0;
    const strokeLength = percentage * 251.2;
    const strokeOffset = 251.2 - strokeLength + retAccumulator;
    retAccumulator -= strokeLength;
    return {
      ...ret,
      percentage: Math.round(percentage * 100),
      strokeLength,
      strokeOffset,
      color: returnColors[ret.condition_on_return.toLowerCase()] || '#F59E0B'
    };
  });

  // 3. SaaS / Cloud Financial Spend Calculations
  const saasBreakdown = data.saasBreakdown || [];
  const totalSaasCost = saasBreakdown.reduce((sum, s) => sum + parseFloat(s.total_cost || 0), 0);
  const totalSaasLicenses = saasBreakdown.reduce((sum, s) => sum + s.count, 0);
  const saasColors = ['#0EA5E9', '#A855F7', '#EC4899', '#10B981'];
  
  let saasAccumulator = 0;
  const saasSegments = saasBreakdown.map((s, idx) => {
    const percentage = totalSaasCost > 0 ? (parseFloat(s.total_cost) / totalSaasCost) : 0;
    const strokeLength = percentage * 251.2;
    const strokeOffset = 251.2 - strokeLength + saasAccumulator;
    saasAccumulator -= strokeLength;
    return {
      ...s,
      percentage: Math.round(percentage * 100),
      strokeLength,
      strokeOffset,
      color: saasColors[idx % saasColors.length]
    };
  });

  // 4. Damage Severity Calculations
  const damageSeverityBreakdown = data.damageSeverityBreakdown || [];
  const totalDamages = damageSeverityBreakdown.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Unified corporate asset health & audit compliance overview</p>
        </div>
        
        {/* Real-time Indicator Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.5rem 0.85rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '30px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s ease',
          transform: pulse ? 'scale(1.03)' : 'scale(1)',
          borderColor: pulse ? 'var(--status-success)' : 'var(--border-primary)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--status-success)',
            boxShadow: '0 0 10px #10B981',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite'
          }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Real-Time Sync Active
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', borderLeft: '1px solid var(--border-primary)', paddingLeft: '0.5rem' }}>
            Last sync: {lastSynced}
          </span>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid-4 mb-3">
        <div className="card stat-card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)' }}>
            <Package size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.total_assets || 0}</span>
            <span className="stat-label">Total Assets</span>
          </div>
        </div>
        <div className="card stat-card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--status-success)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.in_stock || 0}</span>
            <span className="stat-label">In Stock</span>
          </div>
        </div>
        <div className="card stat-card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--status-info)' }}>
            <ArrowRightLeft size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.allocated || 0}</span>
            <span className="stat-label">Allocated</span>
          </div>
        </div>
        <div className="card stat-card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--status-danger)' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.damaged || 0}</span>
            <span className="stat-label">Damaged</span>
          </div>
        </div>
      </div>

<div className="grid-2 mb-3" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        {/* 2. Stock by Category Pie/Donut Chart */}
        <div className="card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Stock by Category</h3>
            <span className="text-sm text-secondary">Value: {formatINR(overall?.total_value)}</span>
          </div>
 
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '1rem 0', borderBottom: '1px solid var(--border-primary)', marginBottom: '1.5rem', alignItems: 'center' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0, margin: '0 auto' }}>
              <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="9" />
                {donutSegments.map((cat) => (
                  <circle
                    key={cat.category_id}
                    className="donut-segment"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={cat.color}
                    strokeWidth="9"
                    strokeDasharray="251.2"
                    strokeDashoffset={cat.strokeOffset}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 1s ease',
                    }}
                  />
                ))}
              </svg>
              {/* Absolute center details */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}>
                <span className="text-secondary" style={{ fontSize: '0.55rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCategoryAssets}</span>
              </div>
            </div>
 
            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', minWidth: '170px' }}>
              {donutSegments.map((cat) => {
                const percentage = totalCategoryAssets > 0 ? Math.round((cat.total_assets / totalCategoryAssets) * 100) : 0;
                return (
                  <div key={cat.category_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 600 }}>{cat.category_name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <strong>{cat.total_assets}</strong> <small>({percentage}%)</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
 
          {/* Status Gauge Comparison (Concentric Rings instead of bars) */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category Status Ring Audits</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
              {donutSegments.map((cat) => {
                const total = cat.in_stock + cat.allocated + cat.damaged || 1;
                const activePercentage = Math.round((cat.in_stock / total) * 100);
                
                return (
                  <div key={cat.category_id} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center', fontWeight: 700 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color }} />
                      {cat.category_name}
                    </h5>
                    
                    {/* Tiny gauge */}
                    <div style={{ position: 'relative', width: '50px', height: '50px', margin: '0.5rem auto' }}>
                      <svg width="100%" height="100%" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-primary)" strokeWidth="3" />
                        <circle 
                          cx="18" 
                          cy="18" 
                          r="16" 
                          fill="none" 
                          stroke="var(--status-success)" 
                          strokeWidth="3.5" 
                          strokeDasharray="100" 
                          strokeDashoffset={100 - activePercentage}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.65rem', fontWeight: 800 }}>
                        {activePercentage}%
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--status-success)' }}>S: <strong>{cat.in_stock}</strong></span>
                      <span style={{ color: 'var(--status-info)' }}>A: <strong>{cat.allocated}</strong></span>
                      <span style={{ color: 'var(--status-danger)' }}>D: <strong>{cat.damaged}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
 
        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Low stock alerts circular rings */}
          {lowStockWarnings.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'var(--bg-glass)' }}>
              <div className="card-header">
                <h3 style={{ color: 'var(--status-warning)', fontSize: '0.9rem', fontWeight: 700 }}>
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                  Stock Depletion Risk Gauge
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 1.25rem' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <path
                      fill="none"
                      stroke="var(--bg-tertiary)"
                      strokeWidth="3.5"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      fill="none"
                      stroke="var(--status-warning)"
                      strokeWidth="3.5"
                      strokeDasharray="100, 100"
                      strokeDashoffset={100 - Math.min((lowStockWarnings.length * 20), 85)}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-dashoffset 1s ease'
                      }}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-warning)', display: 'block', lineHeight: 1 }}>
                      {lowStockWarnings.length}
                    </span>
                    <span style={{ fontSize: '0.5rem', display: 'block', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: '2px' }}>ALERTS</span>
                  </div>
                </div>
                <div style={{ width: '100%', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lowStockWarnings.map(w => (
                    <div key={w.category_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.35rem 0.625rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                      <span style={{ fontWeight: 600 }}>{w.category_name}</span>
                      <span style={{ color: 'var(--status-warning)', fontWeight: 700 }}>{w.in_stock} Units Left</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
 
          {/* 3. Animated Pie/Donut Chart for Stock by Location */}
          <div className="card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)' }}>
            <div className="card-header">
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}><MapPin size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Stock by Location</h3>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="9" />
                    {locationSegments.map((loc, idx) => (
                      <circle
                        key={idx}
                        className="donut-segment"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={loc.color}
                        strokeWidth="9"
                        strokeDasharray="251.2"
                        strokeDashoffset={loc.strokeOffset}
                        strokeLinecap="round"
                        style={{
                          transition: 'stroke-dashoffset 1s ease',
                        }}
                      />
                    ))}
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}>
                    <span className="text-secondary" style={{ fontSize: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LOCS</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{totalLocationAssets}</span>
                  </div>
                </div>

                {/* List Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '140px' }}>
                  {locationSegments.map((loc, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: loc.color }} />
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>{loc.location}</span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)' }}><strong>{loc.count}</strong> <small style={{ fontSize: '0.6rem' }}>({loc.percentage}%)</small></span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Audited Operations Telemetry Card */}
      <div className="card mb-3 animate-fade-in" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Live Audited Operations Telemetry</h3>
            <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>Real-time streaming ledger of database transactions, physical QR scanner logs, and device triages.</p>
          </div>
          <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A855F7', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            Active Real-time Feed
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {(!liveActivity || liveActivity.length === 0) ? (
            <div className="text-center py-4 text-secondary text-sm">
              No recent activity log recorded in this database cycle.
            </div>
          ) : (
            liveActivity.map((activity, idx) => {
              const dateObj = new Date(activity.event_time);
              const relativeTime = getRelativeTimeString(dateObj);
              
              // Custom colors based on activity types
              const typeConfig = {
                'allocation': { color: 'var(--accent-primary)', label: 'ALLOCATION', icon: ArrowRightLeft },
                'return': { color: 'var(--status-success)', label: 'RETURN', icon: CornerDownLeft },
                'damage': { color: 'var(--status-danger)', label: 'DAMAGE REPORT', icon: AlertOctagon },
                'scan': { color: '#A855F7', label: 'QR SCAN', icon: MapPin }
              };
              const config = typeConfig[activity.type] || { color: 'var(--text-secondary)', label: 'EVENT', icon: CheckSquare };
              const IconComponent = config.icon;
              
              return (
                <div 
                  key={idx} 
                  className="activity-row"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    gap: '1rem',
                    animation: 'slideIn 0.3s ease forwards',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      background: `rgba(${activity.type === 'allocation' ? '59, 130, 246' : activity.type === 'return' ? '16, 185, 129' : activity.type === 'damage' ? '239, 68, 68' : '168, 85, 247'}, 0.12)`, 
                      color: config.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComponent size={15} />
                    </div>
                    <div>
                      <span className="badge" style={{ fontSize: '0.6rem', fontWeight: 700, background: 'var(--bg-secondary)', color: config.color, border: `1px solid ${config.color}33`, padding: '0.15rem 0.4rem', borderRadius: '4px', verticalAlign: 'middle', marginRight: '0.5rem' }}>
                        {config.label}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {activity.detail}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {relativeTime}
                    </span>
                    <small style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '1px' }}>
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Unified Platform Operations Control Room */}
      <div className="card mb-3 animate-fade-in" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Unified Platform Operations Control Room</h3>
        <p className="text-xs text-secondary mb-4">Real-time status summaries of requests, returns, physical damage triage, and active SaaS/Cloud spending cycles.</p>
        
        <div className="grid-3" style={{ gap: '1.25rem' }}>
          {/* Card A: Asset Request Tickets */}
          <div className="card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={16} style={{ color: 'var(--accent-primary)' }} />
              Request Status Distributions
            </h4>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="10" />
                  {requestSegments.map((req, idx) => (
                    <circle
                      key={idx}
                      className="donut-segment"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={req.color}
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={req.strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{totalRequests}</span>
                  <span style={{ fontSize: '0.45rem', display: 'block', color: 'var(--text-tertiary)' }}>REQ TIX</span>
                </div>
              </div>
              
              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '100px' }}>
                {requestSegments.length === 0 ? (
                  <div className="text-xs text-secondary">No tickets submitted.</div>
                ) : requestSegments.map((req, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: req.color }} />
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{req.status}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}><strong>{req.count}</strong> <small style={{ fontSize: '0.6rem' }}>({req.percentage}%)</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card B: Return Condition Audits */}
          <div className="card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CornerDownLeft size={16} style={{ color: 'var(--status-success)' }} />
              Asset Return Audits
            </h4>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="10" />
                  {returnSegments.map((ret, idx) => (
                    <circle
                      key={idx}
                      className="donut-segment"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={ret.color}
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={ret.strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{totalReturns}</span>
                  <span style={{ fontSize: '0.45rem', display: 'block', color: 'var(--text-tertiary)' }}>RETURNS</span>
                </div>
              </div>
              
              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '100px' }}>
                {returnSegments.length === 0 ? (
                  <div className="text-xs text-secondary">No returns registered.</div>
                ) : returnSegments.map((ret, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ret.color }} />
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{ret.condition_on_return.replace('_', ' ')}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}><strong>{ret.count}</strong> <small style={{ fontSize: '0.6rem' }}>({ret.percentage}%)</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card C: SaaS / Cloud Infrastructure Budget Allocation */}
          <div className="card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={16} style={{ color: '#EAB308' }} />
              Finance: SaaS & Cloud Spending
            </h4>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="10" />
                  {saasSegments.map((s, idx) => (
                    <circle
                      key={idx}
                      className="donut-segment"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={s.strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', lineHeight: 1 }}>{totalSaasLicenses}</span>
                  <span style={{ fontSize: '0.45rem', display: 'block', color: 'var(--text-tertiary)', marginTop: '2px' }}>LICENSES</span>
                </div>
              </div>
              
              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '100px' }}>
                {saasSegments.length === 0 ? (
                  <div className="text-xs text-secondary">No software registered.</div>
                ) : saasSegments.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75px' }}>{s.category}</span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.7rem' }}>₹{Math.round(s.total_cost).toLocaleString('en-IN')}</span>
                      <small style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)' }}>{s.percentage}% cost</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Damage Incident Triage Row (Concentric Gauges) */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-primary)', paddingTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <AlertOctagon size={14} style={{ color: 'var(--status-danger)' }} />
            Active Physical Damage Severity Gauges
          </h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {['critical', 'moderate', 'minor'].map((sev, idx) => {
              const countObj = damageSeverityBreakdown.find(d => d.severity.toLowerCase() === sev) || { count: 0 };
              const color = sev === 'critical' ? '#EF4444' : sev === 'moderate' ? '#F59E0B' : '#3b82f6';
              const maxScale = totalDamages > 0 ? (countObj.count / totalDamages) * 100 : 0;
              
              return (
                <div key={idx} style={{ flex: 1, minWidth: '150px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', padding: '0.75rem 1.25rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative', width: '45px', height: '45px', flexShrink: 0 }}>
                    <svg width="100%" height="100%" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-secondary)" strokeWidth="3" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="3.5" 
                        strokeDasharray="100" 
                        strokeDashoffset={100 - (maxScale || 0)}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.85rem', fontWeight: 800, color }}>
                      {countObj.count}
                    </div>
                  </div>
                  <div>
                    <h5 style={{ margin: 0, textTransform: 'capitalize', fontSize: '0.8rem', fontWeight: 700 }}>{sev} Reports</h5>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                      {totalDamages > 0 ? Math.round(maxScale) : 0}% of all incident tickets
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drawPath {
          from {
            stroke-dashoffset: 800;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            transform: scale(0.95);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            transform: scale(0.95);
          }
        }
        @keyframes strokeAnim {
          from {
            stroke-dashoffset: 251.2;
          }
        }
        .donut-segment {
          animation: strokeAnim 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .chart-marker-group:hover circle {
          stroke-width: 4.5px;
          transform: scale(1.1);
          transition: transform 0.2s ease, stroke-width 0.2s ease;
        }
      `}</style>
    </div>
  );
}
