import { useState, useEffect } from 'react';
import {
  Package, Monitor, Smartphone, Mouse, AlertTriangle, TrendingUp, MapPin,
  ArrowRightLeft, CheckSquare, CornerDownLeft, DollarSign, AlertOctagon,
  RefreshCw, ShieldCheck, Activity, Layers, Cpu, Server, HardDrive, Clock
} from 'lucide-react';
import api from '../utils/api';
import { formatINR, formatDate, formatStatus, getStatusBadge } from '../utils/formatters';

const categoryIcons = {
  'Laptops': Package,
  'Monitors': Monitor,
  'Phones': Smartphone,
  'Accessories': Mouse,
  'Servers': Server,
  'Storage': HardDrive
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
      <div className="dashboard-root animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading corporate inventory telemetry...</p>
          </div>
        </div>
        <div className="grid-4 mb-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
        <div className="grid-2">
          <div className="skeleton" style={{ height: 350, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 350, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  if (!data) return <div className="empty-state"><h3>Failed to load dashboard data</h3><p className="text-secondary">Please check your backend connection.</p></div>;

  const { summary, overall, lowStockWarnings, recentAllocations, locationBreakdown, liveActivity } = data;

  const totalCategoryAssets = summary ? summary.reduce((sum, c) => sum + c.total_assets, 0) : 0;
  const colors = ['#0284C7', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

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
      color: requestColors[req.status.toLowerCase()] || '#8B5CF6'
    };
  });

  // 2. Returns Condition Segment Calculations
  const returnsBreakdown = data.returnsBreakdown || [];
  const totalReturns = returnsBreakdown.reduce((sum, r) => sum + r.count, 0);
  const returnColors = {
    'good': '#10B981',
    'damaged': '#EF4444',
    'needs_repair': '#3B82F6',
    'repair': '#3B82F6'
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
    <div className="dashboard-root animate-fade-in">
      {/* Top Header Section */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: 'none', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 className="page-title" style={{ color: '#0f172a', fontWeight: 800, letterSpacing: '-0.03em', fontSize: '1.85rem' }}>Dashboard</h1>
            <span className="badge" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>Enterprise Command Center</span>
          </div>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Unified corporate asset health, real-time audit compliance & infrastructure overview</p>
        </div>

        {/* Real-time Polling Status Pill */}
        <div 
          className="sync-status-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.55rem 1rem',
            background: '#ffffff',
            border: '1px solid',
            borderColor: pulse ? '#10b981' : '#e2e8f0',
            borderRadius: '50px',
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: pulse ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="sync-dot" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.02em' }}>
              Real-Time Sync Active
            </span>
          </div>
          <div style={{ height: '14px', width: '1px', background: '#e2e8f0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.725rem', fontWeight: 500 }}>
            <Clock size={13} />
            <span>Last sync: {lastSynced}</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="grid-4 mb-4">
        {/* Card 1: Total Assets */}
        <div className="kpi-card" style={{ '--kpi-accent': '#0284c7' }}>
          <div className="kpi-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Package size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{overall?.total_assets || 0}</span>
            <span className="kpi-label">Total Assets</span>
          </div>
        </div>

        {/* Card 2: In Stock */}
        <div className="kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="kpi-icon-box" style={{ background: '#d1fae5', color: '#10b981' }}>
            <TrendingUp size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{overall?.in_stock || 0}</span>
            <span className="kpi-label">In Stock Active</span>
          </div>
        </div>

        {/* Card 3: Allocated */}
        <div className="kpi-card" style={{ '--kpi-accent': '#f59e0b' }}>
          <div className="kpi-icon-box" style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <ArrowRightLeft size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{overall?.allocated || 0}</span>
            <span className="kpi-label">Assigned / In Use</span>
          </div>
        </div>

        {/* Card 4: Damaged */}
        <div className="kpi-card" style={{ '--kpi-accent': '#ef4444' }}>
          <div className="kpi-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>
            <AlertTriangle size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{overall?.damaged || 0}</span>
            <span className="kpi-label">Damaged / Repair</span>
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="bento-grid">
        {/* Left Column: Stock by Category & Category Audits */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h3 className="section-title">
                <Layers size={18} style={{ color: '#0284c7' }} />
                Stock Distribution by Category
              </h3>
              <span className="badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
                Total Value: {formatINR(overall?.total_value)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', padding: '1rem 0', marginBottom: '1.5rem' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                <svg width="160" height="160" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                  {donutSegments.map((cat) => (
                    <circle
                      key={cat.category_id}
                      className="donut-segment"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={cat.strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                  ))}
                </svg>
                {/* Center Label */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', letterSpacing: '0.06em' }}>TOTAL UNITS</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalCategoryAssets}</span>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
                {donutSegments.map((cat) => {
                  const percentage = totalCategoryAssets > 0 ? Math.round((cat.total_assets / totalCategoryAssets) * 100) : 0;
                  const IconCmp = categoryIcons[cat.category_name] || Package;
                  return (
                    <div key={cat.category_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${cat.color}15`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconCmp size={14} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{cat.category_name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', marginRight: '0.5rem' }}>{cat.total_assets}</span>
                        <span className="badge" style={{ background: '#ffffff', color: '#64748b', border: '1px solid #e2e8f0', fontSize: '0.7rem' }}>{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Status Ring Audits (Mini Gauges) */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              Category Health & Allocation Gauges
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              {donutSegments.map((cat) => {
                const total = cat.in_stock + cat.allocated + cat.damaged || 1;
                const activePercentage = Math.round((cat.in_stock / total) * 100);

                return (
                  <div key={cat.category_id} className="status-ring-box">
                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                      {cat.category_name}
                    </h5>

                    {/* Mini Gauge */}
                    <div style={{ position: 'relative', width: '56px', height: '56px', margin: '0.75rem auto' }}>
                      <svg width="100%" height="100%" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3.5"
                          strokeDasharray="100"
                          strokeDashoffset={100 - activePercentage}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                        {activePercentage}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.65rem', fontWeight: 600, marginTop: '0.5rem' }}>
                      <span style={{ color: '#10b981', background: '#d1fae5', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>S: {cat.in_stock}</span>
                      <span style={{ color: '#2563eb', background: '#dbeafe', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>A: {cat.allocated}</span>
                      <span style={{ color: '#ef4444', background: '#fee2e2', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>D: {cat.damaged}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Depletion Risk & Location Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Low Stock Alert Box */}
          {lowStockWarnings.length > 0 && (
            <div className="premium-card" style={{ borderTop: '4px solid #f59e0b', background: '#fffbeb', borderColor: '#fde68a' }}>
              <div className="card-header" style={{ borderBottom: '1px solid #fef3c7', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ color: '#b45309' }}>
                  <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                  Stock Depletion Risk Alerts
                </h3>
                <span className="badge" style={{ background: '#f59e0b', color: '#ffffff', fontSize: '0.7rem', fontWeight: 700 }}>
                  {lowStockWarnings.length} Critical
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.5rem 0' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                  <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#fef3c7" strokeWidth="3.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                      strokeDasharray="100"
                      strokeDashoffset={100 - Math.min((lowStockWarnings.length * 25), 90)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>{lowStockWarnings.length}</span>
                    <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#d97706', display: 'block', marginTop: '2px' }}>ITEMS</span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lowStockWarnings.map(w => (
                    <div key={w.category_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.5rem 0.85rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(245,158,11,0.1)' }}>
                      <span style={{ fontWeight: 600, color: '#994500' }}>{w.category_name}</span>
                      <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a' }}>{w.in_stock} Units Left</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stock by Location Card */}
          <div className="premium-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h3 className="section-title">
                <MapPin size={18} style={{ color: '#10b981' }} />
                Inventory Distribution by Location
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', flex: 1 }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
                <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                  {locationSegments.map((loc, idx) => (
                    <circle
                      key={idx}
                      className="donut-segment"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={loc.color}
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={loc.strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', display: 'block', letterSpacing: '0.06em' }}>TOTAL</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalLocationAssets}</span>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '180px' }}>
                {locationSegments.map((loc, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: loc.color }} />
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{loc.location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>{loc.count}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#ffffff', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{loc.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Audited Operations Telemetry Feed Card */}
      <div className="premium-card mb-4" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <div>
            <h3 className="section-title">
              <Activity size={18} style={{ color: '#8b5cf6' }} />
              Live Audited Operations Telemetry
            </h3>
            <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>Real-time streaming ledger of database transactions, physical QR scanner logs, and device triages.</p>
          </div>
          <span className="badge" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ede9fe', padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', animation: 'pulseSync 1.5s infinite' }} />
            Active Real-time Feed
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {(!liveActivity || liveActivity.length === 0) ? (
            <div className="text-center py-5 text-secondary text-sm" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              No recent activity log recorded in this database cycle.
            </div>
          ) : (
            liveActivity.map((activity, idx) => {
              const dateObj = new Date(activity.event_time);
              const relativeTime = getRelativeTimeString(dateObj);

              // Custom colors based on activity types
              const typeConfig = {
                'allocation': { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'ALLOCATION', icon: ArrowRightLeft },
                'return': { color: '#10b981', bg: '#ecfdf5', border: '#bbf7d0', label: 'RETURN', icon: CornerDownLeft },
                'damage': { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'DAMAGE REPORT', icon: AlertOctagon },
                'scan': { color: '#8b5cf6', bg: '#f5f3ff', border: '#ede9fe', label: 'QR SCAN', icon: MapPin }
              };
              const config = typeConfig[activity.type] || { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0', label: 'EVENT', icon: CheckSquare };
              const IconComponent = config.icon;

              return (
                <div key={idx} className="activity-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: config.bg,
                      color: config.color,
                      border: `1px solid ${config.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <span className="badge" style={{ fontSize: '0.65rem', fontWeight: 700, background: config.bg, color: config.color, border: `1px solid ${config.border}`, padding: '0.2rem 0.5rem', borderRadius: '6px', marginRight: '0.75rem' }}>
                        {config.label}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        {activity.detail}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, display: 'block' }}>
                      {relativeTime}
                    </span>
                    <small style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Unified Platform Operations Control Room */}
      <div className="premium-card mb-4" style={{ padding: '1.75rem' }}>
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h3 className="section-title" style={{ fontSize: '1.2rem' }}>
            <Cpu size={20} style={{ color: '#0284c7' }} />
            Unified Platform Operations Control Room
          </h3>
          <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>Real-time status summaries of asset requests, returns condition audits, active SaaS/Cloud spending cycles, and physical damage triage.</p>
        </div>

        <div className="grid-3" style={{ gap: '1.5rem' }}>
          {/* Card A: Asset Request Tickets */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <CheckSquare size={18} style={{ color: '#8b5cf6' }} />
              Request Status Distributions
            </h4>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
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
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalRequests}</span>
                  <span style={{ fontSize: '0.5rem', display: 'block', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>TICKETS</span>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '110px' }}>
                {requestSegments.length === 0 ? (
                  <div className="text-xs text-secondary">No tickets submitted.</div>
                ) : requestSegments.map((req, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: req.color }} />
                      <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#0f172a' }}>{req.status}</span>
                    </div>
                    <span style={{ color: '#475569', fontWeight: 700 }}>{req.count} <small style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>({req.percentage}%)</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card B: Return Condition Audits */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <CornerDownLeft size={18} style={{ color: '#10b981' }} />
              Asset Return Condition Audits
            </h4>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
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
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalReturns}</span>
                  <span style={{ fontSize: '0.5rem', display: 'block', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>RETURNS</span>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '110px' }}>
                {returnSegments.length === 0 ? (
                  <div className="text-xs text-secondary">No returns registered.</div>
                ) : returnSegments.map((ret, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ret.color }} />
                      <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#0f172a' }}>{ret.condition_on_return.replace('_', ' ')}</span>
                    </div>
                    <span style={{ color: '#475569', fontWeight: 700 }}>{ret.count} <small style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>({ret.percentage}%)</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card C: SaaS / Cloud Infrastructure Budget Allocation */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <DollarSign size={18} style={{ color: '#f59e0b' }} />
              Finance: SaaS & Cloud Spending
            </h4>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
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
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1 }}>{totalSaasLicenses}</span>
                  <span style={{ fontSize: '0.5rem', display: 'block', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>LICENSES</span>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '110px' }}>
                {saasSegments.length === 0 ? (
                  <div className="text-xs text-secondary">No software registered.</div>
                ) : saasSegments.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75px', color: '#0f172a' }}>{s.category}</span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.75rem' }}>₹{Math.round(s.total_cost).toLocaleString('en-IN')}</span>
                      <small style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 500 }}>{s.percentage}%</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Damage Incident Triage Row (Concentric Gauges) */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <AlertOctagon size={16} style={{ color: '#ef4444' }} />
            Active Physical Damage Incident Triage Gauges
          </h4>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {['critical', 'moderate', 'minor'].map((sev, idx) => {
              const countObj = damageSeverityBreakdown.find(d => d.severity.toLowerCase() === sev) || { count: 0 };
              const color = sev === 'critical' ? '#ef4444' : sev === 'moderate' ? '#f59e0b' : '#3b82f6';
              const bgLight = sev === 'critical' ? '#fef2f2' : sev === 'moderate' ? '#fffbeb' : '#eff6ff';
              const borderLight = sev === 'critical' ? '#fecaca' : sev === 'moderate' ? '#fde68a' : '#bfdbfe';
              const maxScale = totalDamages > 0 ? (countObj.count / totalDamages) * 100 : 0;

              return (
                <div key={idx} style={{ flex: 1, minWidth: '180px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1.25rem', transition: 'all 0.2s ease' }} className="triage-box">
                  <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                    <svg width="100%" height="100%" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
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
                        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1rem', fontWeight: 800, color }}>
                      {countObj.count}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h5 style={{ margin: 0, textTransform: 'capitalize', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{sev}</h5>
                      <span className="badge" style={{ background: bgLight, color, border: `1px solid ${borderLight}`, fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>Reports</span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
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
        /* Custom Premium Dashboard Styles */
        .dashboard-root {
          padding: 0.5rem 0 2rem 0;
          max-width: 1600px;
          margin: 0 auto;
        }

        .premium-card {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.05);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .premium-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px -6px rgba(15, 23, 42, 0.08);
          border-color: rgba(37, 99, 235, 0.3);
        }

        .kpi-card {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.03);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--kpi-accent, #2563eb);
          border-top-left-radius: 16px;
          border-bottom-left-radius: 16px;
          transition: width 0.2s ease;
        }

        .kpi-card:hover::before {
          width: 8px;
        }

        .kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 25px -5px rgba(15, 23, 42, 0.08);
          border-color: rgba(226, 232, 240, 1);
        }

        .kpi-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .kpi-card:hover .kpi-icon-box {
          transform: scale(1.1) rotate(5deg);
        }

        .kpi-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .kpi-value {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .kpi-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 0.25rem;
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: -0.01em;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 1024px) {
          .bento-grid {
            grid-template-columns: 1fr;
          }
        }

        .activity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.85rem 1.25rem;
          border-radius: 12px;
          gap: 1rem;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .activity-row:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          transform: translateX(4px);
          box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.05);
        }

        .status-ring-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          text-align: center;
          transition: all 0.2s ease;
        }

        .status-ring-box:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.04);
        }

        .triage-box:hover {
          background: #ffffff !important;
          border-color: #cbd5e1 !important;
          box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.04);
          transform: translateY(-2px);
        }

        @keyframes pulseSync {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .sync-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulseSync 2s infinite;
          display: inline-block;
        }

        .donut-segment {
          animation: strokeAnim 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        @keyframes strokeAnim {
          from { stroke-dashoffset: 251.2; }
        }
      `}</style>
    </div>
  );
}
