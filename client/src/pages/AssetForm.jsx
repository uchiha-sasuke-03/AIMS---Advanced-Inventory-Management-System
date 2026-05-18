import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function AssetForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    price: '',
    location: ''
  });

  const locations = ['Bengaluru', 'Pune', 'Hyderabad', 'Noida', 'Chennai', 'Mumbai'];

  useEffect(() => {
    fetchCategories();
    if (isEditing) fetchAsset();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories/list');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAsset = async () => {
    try {
      const res = await api.get(`/assets/${id}`);
      const a = res.data;
      setForm({
        category_id: a.category_id || '',
        name: a.name || '',
        model: a.model || '',
        serial_number: a.serial_number || '',
        purchase_date: a.purchase_date ? a.purchase_date.split('T')[0] : '',
        price: a.price || '',
        location: a.location || ''
      });
    } catch (err) {
      toast.error('Failed to load asset');
      navigate('/assets');
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, price: form.price ? parseFloat(form.price) : null, category_id: parseInt(form.category_id) };
      if (isEditing) {
        await api.put(`/assets/${id}`, payload);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/assets', payload);
        toast.success('Asset created successfully');
      }
      navigate('/assets');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditing ? 'Edit Asset' : 'Add New Asset'}</h1>
          <p className="page-subtitle">{isEditing ? 'Update asset information' : 'Register a new asset in the inventory'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/assets')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Asset Name *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Dell Latitude 5540" required />
            </div>
            <div className="form-group">
              <label htmlFor="category_id">Category *</label>
              <select id="category_id" name="category_id" value={form.category_id} onChange={handleChange} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="model">Model</label>
              <input id="model" name="model" value={form.model} onChange={handleChange} placeholder="e.g. Latitude 5540 i7" />
            </div>
            <div className="form-group">
              <label htmlFor="serial_number">Serial Number *</label>
              <input id="serial_number" name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="e.g. DL-BLR-2024-003" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Purchase Price (₹)</label>
              <input id="price" name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} placeholder="e.g. 95000" />
            </div>
            <div className="form-group">
              <label htmlFor="purchase_date">Purchase Date</label>
              <input id="purchase_date" name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <select id="location" name="location" value={form.location} onChange={handleChange}>
              <option value="">Select location</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="flex gap-1 mt-3">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <><Save size={16} /> {isEditing ? 'Update Asset' : 'Create Asset'}</>}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/assets')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
