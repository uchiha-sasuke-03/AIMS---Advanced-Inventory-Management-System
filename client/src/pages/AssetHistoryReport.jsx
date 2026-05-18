import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { 
  Package, Calendar, MapPin, Tag, ShieldAlert, CircleDot, 
  ArrowLeft, Clock, RefreshCw, AlertCircle, IndianRupee, Loader2
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function AssetHistoryReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetHistory();
  }, [id]);

  const fetchAssetHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assets/${id}/history`);
      setData(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load asset history', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (!data || !data.asset) {
    return (
      <div className="page-container text-center" style={{ padding: '4rem' }}>
        <AlertCircle size={48} className="text-danger mb-3" style={{ margin: '0 auto 1rem auto' }} />
        <h3>Asset Report Not Found</h3>
        <p className="text-secondary mb-4">The scanned physical asset tag might correspond to a deleted or unindexed inventory item.</p>
        <button className="btn btn-primary" onClick={() => navigate('/assets')}>Back to Assets</button>
      </div>
    );
  }

  const { asset, activeAllocation, allocationHistory, damageReports } = data;

  // --- Depreciation Straight-Line Model Calculations ---
  const purchasePrice = parseFloat(asset.price) || 0;
  const purchaseDateStr = asset.purchase_date;
  const category = (asset.category_name || '').toLowerCase();
  
  // Set useful lifespan (months) based on category type
  let lifespanMonths = 24; // Default accessories
  if (category.includes('laptop') || category.includes('computer') || category.includes('pc')) {
    lifespanMonths = 48; // 4 Years
  } else if (category.includes('monitor') || category.includes('screen') || category.includes('display')) {
    lifespanMonths = 60; // 5 Years
  } else if (category.includes('phone') || category.includes('mobile') || category.includes('tablet')) {
    lifespanMonths = 36; // 3 Years
  }

  let monthsElapsed = 0;
  let currentValue = purchasePrice;
  let totalDepreciation = 0;
  let monthlyDepreciationRate = 0;
  let depreciationPercentage = 0;

  if (purchasePrice > 0 && purchaseDateStr) {
    const purchaseDate = new Date(purchaseDateStr);
    const today = new Date();
    
    // Calculate difference in months
    monthsElapsed = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());
    monthsElapsed = Math.max(0, monthsElapsed); // Avoid negative months
    
    monthlyDepreciationRate = purchasePrice / lifespanMonths;
    totalDepreciation = monthlyDepreciationRate * monthsElapsed;
    totalDepreciation = Math.min(purchasePrice, totalDepreciation); // Cap depreciation at purchase price
    
    currentValue = Math.max(0, purchasePrice - totalDepreciation);
    depreciationPercentage = (totalDepreciation / purchasePrice) * 100;
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn-ghost flex items-center justify-center" onClick={() => navigate('/assets')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>IT Physical Asset Scan Report</h1>
          <p className="page-subtitle">Real-time status, historical logs, and financial details for physical inventory</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* 1. ASSET PROFILE SUMMARY CARD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="flex justify-between items-start mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                  {asset.category_name || 'Hardware'}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.2 }}>{asset.name}</h2>
                <p className="text-secondary text-sm">{asset.model || 'Standard Model'}</p>
              </div>
              <span className={`badge badge-${
                asset.status === 'in_stock' ? 'secondary' : asset.status === 'allocated' ? 'success' : asset.status === 'damaged' ? 'danger' : 'warning'
              }`} style={{ textTransform: 'uppercase' }}>
                {asset.status === 'in_stock' ? 'In Stock' : asset.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={16} className="text-secondary" />
                <div>
                  <div className="text-xs text-secondary">Serial Number</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{asset.serial_number}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} className="text-secondary" />
                <div>
                  <div className="text-xs text-secondary">Location</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{asset.location || 'HQ'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} className="text-secondary" />
                <div>
                  <div className="text-xs text-secondary">Purchase Date</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {purchaseDateStr ? new Date(purchaseDateStr).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CircleDot size={16} className="text-secondary" />
                <div>
                  <div className="text-xs text-secondary">Asset ID</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>TAG-{String(asset.id).padStart(4, '0')}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Active Allocation</h4>
            {activeAllocation ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: 38, height: 38, borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-glow) 100%)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
                }}>
                  {activeAllocation.user_photo ? (
                    <img 
                      src={`http://localhost:5000/api/uploads${activeAllocation.user_photo}`} 
                      alt={activeAllocation.user_name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    activeAllocation.user_name.charAt(0)
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{activeAllocation.user_name}</div>
                  <div className="text-xs text-secondary">{activeAllocation.user_designation || 'Staff'} - {activeAllocation.user_department}</div>
                  <span className="text-xs text-secondary" style={{ display: 'block', marginTop: '0.2rem' }}>
                    Assigned: {new Date(activeAllocation.allocated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary italic">No active allocation. Item is in storage warehouse.</p>
            )}
          </div>
        </div>

        {/* 2. STRAIGHT-LINE DEPRECIATION TRACKER */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Depreciation & Asset Valuation</h3>
              <IndianRupee size={20} className="text-primary" />
            </div>
            
            <p className="text-xs text-secondary mb-4">
              Calculated using the <strong>Straight-Line Depreciation Method</strong> over an industry-standard lifespan of <strong>{lifespanMonths} months</strong>.
            </p>

            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="text-xs text-secondary">Asset Residual Value</span>
                <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.25rem' }}>{formatINR(currentValue)}</span>
              </div>
              
              {/* Modern progress value bar */}
              <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '0.5rem' }}>
                <div style={{ 
                  width: `${100 - depreciationPercentage}%`, 
                  background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--primary-glow) 100%)',
                  borderRadius: '4px 0 0 4px'
                }} />
                <div style={{ 
                  width: `${depreciationPercentage}%`, 
                  background: 'rgba(255, 255, 255, 0.08)' 
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <span>Residual Book Value ({Math.round(100 - depreciationPercentage)}%)</span>
                <span>Depreciated Value ({Math.round(depreciationPercentage)}%)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '0.75rem', borderRadius: '8px' }}>
              <span className="text-xs text-secondary block" style={{ display: 'block', marginBottom: '0.2rem' }}>Original Cost</span>
              <strong style={{ fontSize: '0.9rem' }}>{formatINR(purchasePrice)}</strong>
            </div>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '0.75rem', borderRadius: '8px' }}>
              <span className="text-xs text-secondary block" style={{ display: 'block', marginBottom: '0.2rem' }}>Elapsed Lifespan</span>
              <strong style={{ fontSize: '0.9rem' }}>{monthsElapsed} / {lifespanMonths} Months</strong>
            </div>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '0.75rem', borderRadius: '8px' }}>
              <span className="text-xs text-secondary block" style={{ display: 'block', marginBottom: '0.2rem' }}>Total Depreciated</span>
              <strong className="text-danger" style={{ fontSize: '0.9rem' }}>-{formatINR(totalDepreciation)}</strong>
            </div>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '0.75rem', borderRadius: '8px' }}>
              <span className="text-xs text-secondary block" style={{ display: 'block', marginBottom: '0.2rem' }}>Monthly Rate</span>
              <strong style={{ fontSize: '0.9rem' }}>{formatINR(monthlyDepreciationRate)}/mo</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* 3. ALLOCATION LOGS TIMELINE */}
        <div className="card">
          <h3 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Clock size={18} className="text-primary" />
            <span>Hardware Allocation History</span>
          </h3>

          {allocationHistory.length === 0 && !activeAllocation ? (
            <p className="text-sm text-secondary italic">This asset has never been allocated to any employee.</p>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px dashed var(--border-primary)', margin: '0.5rem 0.5rem 0.5rem 1rem' }}>
              {/* If active allocation exists, show it first */}
              {activeAllocation && (
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  {/* Timeline dot */}
                  <div style={{ 
                    position: 'absolute', left: '-29px', top: '4px', width: '12px', height: '12px', 
                    borderRadius: '50%', background: '#10b981', border: '3px solid var(--bg-primary)',
                    boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)'
                  }} />
                  <span className="text-xs text-success" style={{ fontWeight: 600 }}>ACTIVE ALLOCATION</span>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0.1rem 0' }}>Assigned to {activeAllocation.user_name}</h4>
                  <p className="text-xs text-secondary">{activeAllocation.user_designation || 'Staff'} - {activeAllocation.user_department}</p>
                  <p className="text-xs text-secondary mt-1">
                    Allocated on {new Date(activeAllocation.allocated_at).toLocaleDateString()} (by Admin: {activeAllocation.allocated_by_name || 'System'})
                  </p>
                  {activeAllocation.notes && (
                    <p className="text-xs text-secondary mt-1 italic" style={{ padding: '0.4rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                      "{activeAllocation.notes}"
                    </p>
                  )}
                </div>
              )}

              {/* Historical timelines */}
              {allocationHistory.map((al, idx) => (
                <div key={al.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  {/* Timeline dot */}
                  <div style={{ 
                    position: 'absolute', left: '-29px', top: '4px', width: '12px', height: '12px', 
                    borderRadius: '50%', background: 'var(--border-primary)', border: '3px solid var(--bg-primary)'
                  }} />
                  <span className="text-xs text-secondary" style={{ fontWeight: 600 }}>COMPLETED CYCLE</span>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0.1rem 0' }}>Assigned to {al.user_name}</h4>
                  <p className="text-xs text-secondary">{al.user_designation || 'Staff'} - {al.user_department}</p>
                  
                  <div className="text-xs text-secondary mt-1" style={{ fontSize: '0.75rem' }}>
                    <strong>Allocated</strong>: {new Date(al.allocated_at).toLocaleDateString()} &bull; <strong>Returned</strong>: {new Date(al.returned_at).toLocaleDateString()}
                  </div>
                  {al.condition_on_return && (
                    <span className="badge badge-secondary" style={{ display: 'inline-block', fontSize: '0.65rem', marginTop: '0.2rem' }}>
                      Return Condition: {al.condition_on_return}
                    </span>
                  )}
                  {al.notes && (
                    <p className="text-xs text-secondary mt-1 italic" style={{ padding: '0.4rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                      "{al.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. MAINTENANCE LOG (DAMAGE REPORTS) */}
        <div className="card">
          <h3 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <ShieldAlert size={18} className="text-danger" />
            <span>Maintenance & Damage Logs</span>
          </h3>

          {damageReports.length === 0 ? (
            <p className="text-sm text-secondary italic">This asset has no historical or unresolved damage reports. Excellent maintenance record.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {damageReports.map(dr => (
                <div 
                  key={dr.id} 
                  className="card" 
                  style={{ 
                    padding: '1rem', background: 'var(--bg-secondary)', 
                    border: `1px solid ${dr.resolved ? 'var(--border-primary)' : 'rgba(239, 68, 68, 0.2)'}` 
                  }}
                >
                  <div className="flex justify-between items-center mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge badge-${
                      dr.severity === 'critical' || dr.severity === 'high' ? 'danger' : 'warning'
                    }`} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      {dr.severity} Severity
                    </span>
                    <span className={`badge badge-${dr.resolved ? 'success' : 'danger'}`}>
                      {dr.resolved ? 'Resolved' : 'Active issue'}
                    </span>
                  </div>

                  <p className="text-xs text-secondary mb-1">
                    Reported by: <strong>{dr.reported_by_name}</strong> ({dr.reported_by_department}) on {new Date(dr.reported_at).toLocaleDateString()}
                  </p>
                  
                  <div className="text-sm mt-2 mb-2" style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    "{dr.description}"
                  </div>

                  {dr.resolved && dr.resolution_note && (
                    <div className="mt-2 text-xs" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '0.5rem' }}>
                      <strong className="text-success">Resolution Comment:</strong>
                      <p className="text-secondary italic mt-0.5">"{dr.resolution_note}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
