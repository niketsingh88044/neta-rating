import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="logo">Neta Rating</Link>
        <nav className="nav-links">
          <NavLink to="/netas">Browse</NavLink>
          {user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
          {user && !user.isAdmin && <NavLink to="/apply-admin">Apply for admin</NavLink>}
          {user ? (
            <>
              <NavLink to="/profile">Profile</NavLink>
              <span className="muted">Hi, {user.name}</span>
              <button className="link" onClick={() => { logout(); nav('/'); }}>Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/signup">Sign up</NavLink>
              <NavLink to="/admin/login" className="nav-admin-link">Admin</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
