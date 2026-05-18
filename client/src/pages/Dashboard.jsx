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

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your company's asset inventory</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid-4 mb-3">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)' }}>
            <Package size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.total_assets || 0}</span>
            <span className="stat-label">Total Assets</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--status-success)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.in_stock || 0}</span>
            <span className="stat-label">In Stock</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--status-info)' }}>
            <ArrowRightLeft size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.allocated || 0}</span>
            <span className="stat-label">Allocated</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--status-danger)' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{overall?.damaged || 0}</span>
            <span className="stat-label">Damaged</span>
          </div>
        </div>
      </div>

      {/* Financial Valuation Insights Panel */}
      <div className="card mb-3">
        <div className="card-header" style={{ padding: '1rem 1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Financial Valuation & Depreciation (Indian IT Act Rules)</h3>
          <span className="badge badge-success">Live Audited Valuation</span>
        </div>
        <div className="grid-4" style={{ padding: '1.25rem', gap: '1.25rem' }}>
          <div className="fin-metric">
            <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Initial Purchase Cost</span>
            <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)', margin: '0.25rem 0', fontSize: '1.5rem' }}>{formatINR(overall?.total_value || 0)}</h4>
            <p className="text-xs text-secondary" style={{ margin: 0 }}>Original aggregate value of all active assets</p>
          </div>
          <div className="fin-metric" style={{ borderLeft: '1px solid var(--border-primary)', paddingLeft: '1.25rem' }}>
            <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Current Net Book Value (WDV)</span>
            <h4 className="text-lg font-bold" style={{ color: 'var(--status-success)', margin: '0.25rem 0', fontSize: '1.5rem' }}>{formatINR(overall?.total_book_value || 0)}</h4>
            <p className="text-xs text-secondary" style={{ margin: 0 }}>Real-time valuation based on age & category rates</p>
          </div>
          <div className="fin-metric" style={{ borderLeft: '1px solid var(--border-primary)', paddingLeft: '1.25rem' }}>
            <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Accumulated Depreciation</span>
            <h4 className="text-lg font-bold" style={{ color: 'var(--status-danger)', margin: '0.25rem 0', fontSize: '1.5rem' }}>{formatINR((overall?.total_value || 0) - (overall?.total_book_value || 0))}</h4>
            <p className="text-xs text-secondary" style={{ margin: 0 }}>Total value written off since purchase dates</p>
          </div>
          <div className="fin-metric" style={{ borderLeft: '1px solid var(--border-primary)', paddingLeft: '1.25rem' }}>
            <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>EOL Refresh Needed</span>
            <h4 className="text-lg font-bold" style={{ color: 'var(--status-warning)', margin: '0.25rem 0', fontSize: '1.5rem' }}>
              {overall?.eol_count || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>units</span>
            </h4>
            <p className="text-xs text-secondary" style={{ margin: 0 }}>
              {overall?.approaching_eol_count || 0} units approaching 3-year refresh cycle
            </p>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-3" style={{ gap: '1.25rem' }}>
        {/* Predictive CapEx Procurement Planner */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Q3 CapEx Procurement Forecasting (NVIDIA Llama 3.1 NIM)</h3>
            <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>₹ Budget Forecast</span>
          </div>
          <div style={{ padding: '1rem' }}>
            <div className="flex justify-between items-center mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary text-sm">Predicted Replacements:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.capex?.replacements_count || 0} Assets</span>
            </div>
            <div className="flex justify-between items-center mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary text-sm">Forecasted CapEx Budget:</span>
              <span style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: '1.1rem' }}>{formatINR(data.capex?.replacements_budget || 0)}</span>
            </div>
            
            <label className="text-secondary text-xs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem', fontWeight: 500 }}>
              <span>AI PROCUREMENT JUSTIFICATION (CFO LETTER):</span>
              {aiLoading && (
                <span style={{ 
                  color: 'var(--accent-primary)', 
                  fontSize: '0.7rem', 
                  fontWeight: 600,
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <span className="spinner-border spinner-border-sm" role="status" style={{ display: 'inline-block', width: '8px', height: '8px', border: '1.5px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
                  NIM Generating...
                </span>
              )}
            </label>
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              color: 'var(--text-secondary)',
              position: 'relative',
              maxHeight: '110px',
              overflowY: 'auto',
              transition: 'opacity 0.3s ease',
              opacity: aiLoading ? 0.7 : 1
            }}>
              {aiJustification || "Generating IT Procurement justification email draft..."}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ padding: 0, height: 'auto', fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                onClick={() => {
                  navigator.clipboard.writeText(aiJustification || '');
                  alert("AI CFO Justification letter copied to clipboard!");
                }}
              >
                Copy Justification Text
              </button>
              <span style={{ color: 'var(--border-primary)', fontSize: '0.75rem' }}>|</span>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ 
                  padding: 0, 
                  height: 'auto', 
                  fontSize: '0.75rem', 
                  color: aiLoading ? 'var(--text-secondary)' : 'var(--accent-primary)', 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '0.25rem',
                  border: 'none',
                  background: 'none',
                  cursor: aiLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={aiLoading}
                onClick={triggerAiJustification}
              >
                ⚡ {aiLoading ? 'Requesting NIM...' : 'Regenerate live AI Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Corporate ESG & Green IT Carbon Auditor */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Corporate ESG & Green IT Carbon Auditor</h3>
            <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>🌲 Net-Zero</span>
          </div>
          <div style={{ padding: '1rem' }}>
            <div className="flex justify-between items-center mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary text-sm">Inventory Carbon Footprint:</span>
              <span style={{ fontWeight: 600, color: 'var(--status-danger)' }}>{((data.esg?.total_carbon_debt || 0) / 1000).toFixed(2)} Metric Tonnes CO2e</span>
            </div>
            <div className="flex justify-between items-center mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary text-sm">E-Waste Avoidance (Triage Diverted):</span>
              <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{data.esg?.ewaste_avoidance_rate || 0}% Diverted</span>
            </div>
            <div className="flex justify-between items-center mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary text-sm">Trees Offset Planting Requirement:</span>
              <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{data.esg?.trees_offset_needed || 0} Mature Trees</span>
            </div>
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              color: 'var(--text-secondary)'
            }}>
              🌲 <span style={{ fontWeight: 500, color: '#10B981' }}>Offset Strategy:</span> Corporate ESG standards recommend planting {data.esg?.trees_offset_needed || 0} trees across your campuses in Bengaluru and Noida to fully neutralize physical lifecycle emissions.
            </div>
          </div>
        </div>
      </div>

      {/* Smart EOL Budget Projection Chart */}
      <div className="card mb-3">
        <div className="card-header" style={{ paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>4-Quarter EOL Smart Procurement Projections</h3>
          <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7' }}>Smart Hardware Refreshes</span>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <p className="text-xs text-secondary mb-3" style={{ marginBottom: '1rem' }}>Projected hardware replacement costs due to aging MacBooks, workstations, and monitors hitting their 3-year corporate EOL cycle:</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-primary)', gap: '1.5rem', marginTop: '1.5rem' }}>
            {[
              { quarter: 'Q3 2026', spend: 850000, color: 'linear-gradient(to top, #0ea5e9, #38bdf8)', count: 9 },
              { quarter: 'Q4 2026', spend: 1450000, color: 'linear-gradient(to top, #6d28d9, #a855f7)', count: 15 },
              { quarter: 'Q1 2027', spend: 620000, color: 'linear-gradient(to top, #047857, #10b981)', count: 6 },
              { quarter: 'Q2 2027', spend: 1950000, color: 'linear-gradient(to top, #b45309, #fbbf24)', count: 21 }
            ].map(proj => {
              const maxSpend = 2000000;
              const barHeight = (proj.spend / maxSpend) * 100;
              return (
                <div key={proj.quarter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                  <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'Share Tech Mono' }}>
                    {formatINR(proj.spend)}
                  </span>
                  <div style={{ 
                    height: '80px', width: '100%', background: 'var(--bg-input)', 
                    borderRadius: '4px', display: 'flex', alignItems: 'flex-end',
                    boxShadow: 'var(--shadow-inset)', border: '1px solid var(--border-primary)',
                    overflow: 'hidden'
                  }}>
                    <div className="grow-bar" style={{ 
                       height: `${barHeight}%`, width: '100%', 
                       background: proj.color, borderRadius: '2px',
                       boxShadow: '0 0 8px rgba(14, 165, 229, 0.15)'
                    }} />
                  </div>
                  <span className="text-xs" style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                    {proj.quarter} <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>({proj.count} units)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2 mb-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Category Breakdown Graph */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Stock by Category</h3>
            <span className="text-sm text-secondary">Total Value: {formatINR(overall?.total_value)}</span>
          </div>
 
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '1rem 0', borderBottom: '1px solid var(--border-primary)', marginBottom: '1.5rem' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0, margin: '0 auto' }}>
              <svg width="150" height="150" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-primary)" strokeWidth="8" />
                {donutSegments.map((cat, idx) => (
                  <circle
                    key={cat.category_id}
                    className="donut-segment"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={cat.color}
                    strokeWidth="8"
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
                <span className="text-secondary" style={{ fontSize: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL UNITS</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalCategoryAssets}</span>
              </div>
            </div>
 
            {/* Legend and stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', minWidth: '180px' }}>
              {donutSegments.map((cat) => {
                const percentage = totalCategoryAssets > 0 ? Math.round((cat.total_assets / totalCategoryAssets) * 100) : 0;
                return (
                  <div key={cat.category_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 500 }}>{cat.category_name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      <strong>{cat.total_assets} units</strong> <span className="text-secondary">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
 
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Comparison by Category</h4>
            <div className="grid-4" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              {donutSegments.map((cat) => {
                const maxVal = Math.max(cat.in_stock, cat.allocated, cat.damaged, 1);
                return (
                  <div key={cat.category_id} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color }} />
                      {cat.category_name}
                    </h5>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '60px', marginBottom: '0.25rem' }}>
                      {/* In Stock */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--status-success)', marginBottom: '0.15rem' }}>{cat.in_stock}</span>
                        <div style={{ height: '40px', width: '6px', background: 'var(--bg-primary)', borderRadius: '3px', display: 'flex', alignItems: 'flex-end' }}>
                          <div className="grow-bar" style={{ height: `${(cat.in_stock / maxVal) * 100}%`, width: '100%', background: 'var(--status-success)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      {/* Allocated */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--status-info)', marginBottom: '0.15rem' }}>{cat.allocated}</span>
                        <div style={{ height: '40px', width: '6px', background: 'var(--bg-primary)', borderRadius: '3px', display: 'flex', alignItems: 'flex-end' }}>
                          <div className="grow-bar" style={{ height: `${(cat.allocated / maxVal) * 100}%`, width: '100%', background: 'var(--status-info)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      {/* Damaged */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--status-danger)', marginBottom: '0.15rem' }}>{cat.damaged}</span>
                        <div style={{ height: '40px', width: '6px', background: 'var(--bg-primary)', borderRadius: '3px', display: 'flex', alignItems: 'flex-end' }}>
                          <div className="grow-bar" style={{ height: `${(cat.damaged / maxVal) * 100}%`, width: '100%', background: 'var(--status-danger)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.5rem', color: 'var(--text-tertiary)' }}>
                      <span>Stock</span>
                      <span>Alloc</span>
                      <span>Dmg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
 
        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Low Stock Warnings */}
          {lowStockWarnings.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              <div className="card-header">
                <h3 style={{ color: 'var(--status-warning)' }}>
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                  Low Stock Alerts
                </h3>
              </div>
              {lowStockWarnings.map(w => (
                <div key={w.category_id} className="low-stock-item">
                  <span>{w.category_name}</span>
                  <span className="badge badge-warning">{w.in_stock} left</span>
                </div>
              ))}
            </div>
          )}
 
          {/* Locations Graph */}
          <div className="card">
            <div className="card-header">
              <h3><MapPin size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> By Location</h3>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-primary)', gap: '0.25rem' }}>
                {locationBreakdown.map((loc, idx) => {
                  const maxVal = Math.max(...locationBreakdown.map(l => l.count), 1);
                  const totalHeight = (loc.count / maxVal) * 100;
                  const availableHeight = (loc.in_stock / loc.count) * 100;
                  return (
                    <div key={loc.location} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                      {/* Tooltip on hover */}
                      <div className="chart-tooltip" style={{ position: 'absolute', bottom: '110%', background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', display: 'none', flexDirection: 'column', zIndex: 10, whiteSpace: 'nowrap' }}>
                        <span>Total: {loc.count}</span>
                        <span style={{ color: 'var(--status-success)' }}>Available: {loc.in_stock}</span>
                      </div>
                      
                      <div style={{ height: '80px', width: '12px', background: 'var(--bg-input)', borderRadius: '3px', display: 'flex', alignItems: 'flex-end', cursor: 'pointer', position: 'relative' }}
                           onMouseEnter={(e) => { e.currentTarget.parentElement.querySelector('.chart-tooltip').style.display = 'flex' }}
                           onMouseLeave={(e) => { e.currentTarget.parentElement.querySelector('.chart-tooltip').style.display = 'none' }}
                      >
                        {/* Total Assets Bar (light opacity background) */}
                        <div className="grow-bar" style={{ height: `${totalHeight}%`, width: '100%', background: 'var(--bg-tertiary)', borderRadius: '3px', display: 'flex', alignItems: 'flex-end', position: 'absolute', bottom: 0 }}>
                          {/* Available Assets Bar (active gradient) */}
                          <div className="grow-bar-inner" style={{ height: `${availableHeight}%`, width: '100%', background: 'linear-gradient(to top, #10B981, #34D399)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.5rem', transform: 'rotate(-25deg)', transformOrigin: 'top center', whiteSpace: 'nowrap' }}>{loc.location}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem', fontSize: '0.65rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '1px' }} />
                  <span className="text-secondary">Total</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', background: 'linear-gradient(to top, #10B981, #34D399)', borderRadius: '1px' }} />
                  <span className="text-secondary">Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Allocations */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Allocations</h3>
        </div>
        {recentAllocations.length === 0 ? (
          <p className="text-sm text-secondary">No recent allocations</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAllocations.map(al => (
                <tr key={al.id}>
                  <td>{al.asset_name}</td>
                  <td>{al.employee_name}</td>
                  <td>{formatDate(al.allocated_at)}</td>
                  <td>
                    <span className={`badge ${al.returned_at ? 'badge-success' : 'badge-info'}`}>
                      {al.returned_at ? 'Returned' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
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
        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .category-card {
          background: var(--bg-tertiary);
          border-radius: var(--border-radius-sm);
          padding: 1rem;
          border: 1px solid var(--border-primary);
        }
        .category-card-header {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.75rem;
        }
        .category-icon {
          width: 36px;
          height: 36px;
          background: rgba(59, 130, 246, 0.12);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }
        .category-card h4 {
          font-size: 0.875rem;
          font-weight: 600;
        }
        .category-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .cat-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .cat-stat-value {
          font-size: 1.125rem;
          font-weight: 700;
        }
        .cat-stat-label {
          font-size: 0.625rem;
          color: var(--text-tertiary);
        }
        .utilization-bar {
          height: 4px;
          background: var(--bg-primary);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.375rem;
        }
        .utilization-fill {
          height: 100%;
          background: var(--accent-gradient);
          border-radius: 2px;
          transition: width 0.6s ease;
        }
        @keyframes strokeAnim {
          from {
            stroke-dashoffset: 251.2;
          }
        }
        .donut-segment {
          animation: strokeAnim 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes growUp {
          from {
            height: 0%;
          }
        }
        .grow-bar {
          animation: growUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .grow-bar-inner {
          animation: growUp 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .low-stock-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-primary);
          font-size: 0.875rem;
        }
        .low-stock-item:last-child { border-bottom: none; }
        .location-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-primary);
        }
        .location-item:last-child { border-bottom: none; }
      `}</style>
    </div>
  );
}
