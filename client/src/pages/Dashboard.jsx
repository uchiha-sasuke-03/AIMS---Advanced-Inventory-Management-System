import { useState, useEffect } from 'react';
import { Package, Monitor, Smartphone, Mouse, AlertTriangle, TrendingUp, MapPin, ArrowRightLeft } from 'lucide-react';
import api from '../utils/api';
import { formatINR, formatDate, formatStatus, getStatusBadge } from '../utils/formatters';

const categoryIcons = {
  'Laptops': Package,
  'Monitors': Monitor,
  'Phones': Smartphone,
  'Accessories': Mouse,
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiJustification, setAiJustification] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/stock');
      setData(res.data);
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

  const { summary, overall, lowStockWarnings, recentAllocations, locationBreakdown } = data;
 
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

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Unified corporate asset health & audit compliance overview</p>
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

      {/* 1. Animated Line Graph for EOL Procurement */}
      <div className="card mb-3" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>4-Quarter EOL Smart Procurement Projections</h3>
            <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>Expected corporate lifecycle replacement costs for laptops, monitors, and devices hitting EOL status.</p>
          </div>
          <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', fontWeight: 600 }}>Smart Hardware Refreshes</span>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '1.5rem' }}>
          <svg viewBox="0 0 500 130" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="eolAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="eolLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1="15" x2="500" y2="15" stroke="var(--border-primary)" strokeDasharray="3 3" strokeWidth="0.75" />
            <line x1="0" y1="55" x2="500" y2="55" stroke="var(--border-primary)" strokeDasharray="3 3" strokeWidth="0.75" />
            <line x1="0" y1="95" x2="500" y2="95" stroke="var(--border-primary)" strokeDasharray="3 3" strokeWidth="0.75" />
            <line x1="0" y1="130" x2="500" y2="130" stroke="var(--border-primary)" strokeWidth="1" />

            {/* Area under the line */}
            <path
              d="M 50 130 L 50 85 L 175 45 L 300 100 L 425 20 L 425 130 Z"
              fill="url(#eolAreaGradient)"
              style={{ animation: 'fadeIn 1.2s ease forwards' }}
            />

            {/* Line Path */}
            <path
              d="M 50 85 L 175 45 L 300 100 L 425 20"
              fill="none"
              stroke="url(#eolLineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: '800',
                strokeDashoffset: '800',
                animation: 'drawPath 2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Interactive Markers */}
            {[
              { x: 50, y: 85, spend: 850000, label: 'Q3 2026', count: 9 },
              { x: 175, y: 45, spend: 1450000, label: 'Q4 2026', count: 15 },
              { x: 300, y: 100, spend: 620000, label: 'Q1 2027', count: 6 },
              { x: 425, y: 20, spend: 1950000, label: 'Q2 2027', count: 21 }
            ].map((pt, idx) => (
              <g key={idx} style={{ cursor: 'pointer' }} className="chart-marker-group">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="6"
                  fill="var(--bg-card)"
                  stroke="#a855f7"
                  strokeWidth="3"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="12"
                  fill="#a855f7"
                  fillOpacity="0"
                  className="pulsing-hover"
                />
                {/* Embedded Labels on graph */}
                <text
                  x={pt.x}
                  y={pt.y - 14}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="inherit"
                >
                  {formatINR(pt.spend)}
                </text>
              </g>
            ))}
          </svg>
          
          {/* Bottom Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 2.5rem 0 2.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ textAlign: 'center' }}><strong>Q3 2026</strong><br/><small style={{ color: 'var(--text-tertiary)' }}>9 units</small></span>
            <span style={{ textAlign: 'center' }}><strong>Q4 2026</strong><br/><small style={{ color: 'var(--text-tertiary)' }}>15 units</small></span>
            <span style={{ textAlign: 'center' }}><strong>Q1 2027</strong><br/><small style={{ color: 'var(--text-tertiary)' }}>6 units</small></span>
            <span style={{ textAlign: 'center' }}><strong>Q2 2027</strong><br/><small style={{ color: 'var(--text-tertiary)' }}>21 units</small></span>
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

      {/* 4. Glowing SVG Line Graph for Activity Velocity */}
      <div className="card mb-3 animate-fade-in" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Allocation Velocity & Activity Trends (6-Month Flow)</h3>
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <TrendingUp size={10} /> Vector Grid Audited
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <p className="text-xs text-secondary mb-4">Chronological flow tracking handover cycles, physical audits, and device operations:</p>
          <div style={{ position: 'relative', width: '100%', height: '160px', marginTop: '1rem' }}>
            <svg viewBox="0 0 500 120" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="var(--bg-tertiary)" strokeDasharray="4 4" strokeWidth="0.75" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="var(--bg-tertiary)" strokeDasharray="4 4" strokeWidth="0.75" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="var(--bg-tertiary)" strokeDasharray="4 4" strokeWidth="0.75" />

              {/* Area path */}
              <path
                d="M 0 120 Q 50 80, 100 95 T 200 45 T 300 55 T 400 25 T 500 10 L 500 120 Z"
                fill="url(#areaGradient)"
                style={{
                  animation: 'fadeIn 1s ease forwards'
                }}
              />

              {/* Line path */}
              <path
                d="M 0 120 Q 50 80, 100 95 T 200 45 T 300 55 T 400 25 T 500 10"
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: '1000',
                  strokeDashoffset: '1000',
                  animation: 'drawPath 2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
              />

              {/* Interactive nodes */}
              {[
                { x: 0, y: 120, val: 0 },
                { x: 100, y: 95, val: 5 },
                { x: 200, y: 45, val: 14 },
                { x: 300, y: 55, val: 12 },
                { x: 400, y: 25, val: 24 },
                { x: 500, y: 10, val: 32 }
              ].map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="var(--bg-card)"
                    stroke="var(--accent-primary)"
                    strokeWidth="2"
                  />
                </g>
              ))}
            </svg>
            {/* Axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span>Nov 2025</span>
              <span>Dec 2025</span>
              <span>Jan 2026</span>
              <span>Feb 2026</span>
              <span>Mar 2026</span>
              <span>Apr 2026</span>
            </div>
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
