import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyBanner() {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user || user.emailVerified || user.isAdmin) return null;
  if (loc.pathname === '/verify-email') return null;

  return (
    <div className="verify-banner">
      <div className="container verify-banner-inner">
        <span>
          <strong>Verify your email</strong> to rate netas and apply for admin access.
          We sent a 6-digit code to <em>{user.email}</em>.
        </span>
        <Link className="btn" to="/verify-email">Enter code</Link>
      </div>
    </div>
  );
}
