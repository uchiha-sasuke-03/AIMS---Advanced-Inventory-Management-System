import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />
      <div className="login-card animate-slide-up">
        <div className="login-header">
          <div className="login-icon">
            <Package size={32} />
          </div>
          <h1>AIMS</h1>
          <p>Asset Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@techcorp.co.in"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none', border: 'none',
                  color: 'var(--text-tertiary)', cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>

          <p className="login-hint">
            Default: <code>admin@techcorp.co.in</code> / <code>Admin@123</code>
          </p>
        </form>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }
        .login-bg-pattern {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
        }
        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-xl);
          padding: 2.5rem;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(20px);
          box-shadow: var(--shadow-lg);
          position: relative;
          z-index: 1;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-icon {
          width: 64px;
          height: 64px;
          background: var(--accent-gradient);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 1rem;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }
        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-header p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .login-error {
          padding: 0.625rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--border-radius-sm);
          color: var(--status-danger);
          font-size: 0.8125rem;
          margin-bottom: 0.5rem;
        }
        .login-hint {
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-top: 1rem;
        }
        .login-hint code {
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.6875rem;
        }
      `}</style>
    </div>
  );
}
