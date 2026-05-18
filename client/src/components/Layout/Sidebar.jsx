import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, PlusCircle, ArrowLeftRight,
  RotateCcw, AlertTriangle, History, Users, Bot, LogOut,
  FileQuestion, Cloud
} from 'lucide-react';
import './Layout.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/assets', icon: Package, label: 'Assets' },
  { to: '/assets/new', icon: PlusCircle, label: 'Add Asset' },
  { to: '/allocations', icon: ArrowLeftRight, label: 'Allocations' },
  { to: '/returns', icon: RotateCcw, label: 'Returns' },
  { to: '/damage-reports', icon: AlertTriangle, label: 'Damage Log' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/requests', icon: FileQuestion, label: 'Asset Requests' },
  { to: '/saas', icon: Cloud, label: 'SaaS, PaaS, IaaS + Cloud' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Package size={24} />
        </div>
        <div>
          <h1 className="brand-title">AIMS</h1>
          <span className="brand-subtitle">Asset Manager</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name || 'Admin'}</span>
            <span className="user-role">{user?.role || 'admin'}</span>
          </div>
        </div>
        <button className="btn-ghost logout-btn" onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
