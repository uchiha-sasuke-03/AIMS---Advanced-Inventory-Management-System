import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Upload } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function DamageReport() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    asset_id: '',
    description: '',
    severity: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await api.get('/assets?limit=200');
      setAssets(res.data.assets.filter(a => a.status !== 'retired'));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.description.length < 20) {
      toast.error('Description must be at least 20 characters long.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('asset_id', form.asset_id);
      formData.append('description', form.description);
      formData.append('severity', form.severity);
      if (photo) formData.append('photo', photo);

      await api.post('/damage-reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Damage report submitted successfully!');
      setForm({ asset_id: '', description: '', severity: '' });
      setPhoto(null);
      setPhotoPreview(null);
      navigate('/damage-reports');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit damage report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Damage</h1>
          <p className="page-subtitle">File a damage report for a company asset</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="asset_id">Asset *</label>
            <select id="asset_id" value={form.asset_id} onChange={e => setForm(p => ({...p, asset_id: e.target.value}))} required>
              <option value="">Select an asset</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.model} [{a.serial_number}] — {a.location}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="severity">Severity *</label>
            <select id="severity" value={form.severity} onChange={e => setForm(p => ({...p, severity: e.target.value}))} required>
              <option value="">Select severity level</option>
              <option value="low">Low — Minor cosmetic issue</option>
              <option value="medium">Medium — Functional but impaired</option>
              <option value="high">High — Significantly impaired</option>
              <option value="critical">Critical — Non-functional</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description * (minimum 20 characters)</label>
            <textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={e => setForm(p => ({...p, description: e.target.value}))}
              placeholder="Describe the damage in detail — what happened, when it was noticed, and the current state of the asset..."
              required
              minLength={20}
            />
            <span className={`text-xs ${form.description.length < 20 ? 'text-secondary' : ''}`} style={{ color: form.description.length >= 20 ? 'var(--status-success)' : undefined }}>
              {form.description.length}/20 minimum characters
            </span>
          </div>

          <div className="form-group">
            <label>Photo Evidence (optional)</label>
            <div style={{
              border: '2px dashed var(--border-primary)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--bg-tertiary)',
              transition: 'all 0.2s'
            }}
              onClick={() => document.getElementById('photo-input').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  setPhoto(file);
                  const reader = new FileReader();
                  reader.onloadend = () => setPhotoPreview(reader.result);
                  reader.readAsDataURL(file);
                }
              }}
            >
              <input id="photo-input" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              {photoPreview ? (
                <div>
                  <img src={photoPreview} alt="Preview" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, marginBottom: '0.5rem' }} />
                  <p className="text-xs text-secondary">{photo?.name}</p>
                  <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); }}>
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '0.5rem' }} />
                  <p className="text-sm text-secondary">Click or drag photo here</p>
                  <p className="text-xs text-secondary">JPEG, PNG, GIF, WebP — Max 5MB</p>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
            {loading ? <span className="spinner" /> : <><AlertTriangle size={16} /> Submit Report</>}
          </button>
        </form>
      </div>
    </div>
  );
}
