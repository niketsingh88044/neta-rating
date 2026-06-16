import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import NetaList from './pages/NetaList.jsx';
import NetaDetail from './pages/NetaDetail.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Admin from './pages/Admin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import ApplyAdmin from './pages/ApplyAdmin.jsx';
import Profile from './pages/Profile.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import VerifyBanner from './components/VerifyBanner.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="container">Loading...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="container">Loading...</div>;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (!user.isAdmin) {
    return (
      <div className="auth-card">
        <h1>Admin only</h1>
        <p className="muted">
          You're signed in as <strong>{user.name}</strong>, but this area is restricted to administrators.
        </p>
        <p className="small muted">
          If you have an admin account, sign out first and use the <Link to="/admin/login">admin login</Link>.
        </p>
        <Link className="btn" to="/">Back to home</Link>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <VerifyBanner />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/netas" element={<NetaList />} />
          <Route path="/netas/:id" element={<Protected><NetaDetail /></Protected>} />
          <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/apply-admin" element={<Protected><ApplyAdmin /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
