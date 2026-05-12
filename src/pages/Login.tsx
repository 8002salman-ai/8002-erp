import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2, KeyRound, Send, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthStore, useDataStore } from '../store/useStore';
import { Button, Toast, Modal } from '../components/ui';

const ADMIN_NOTIFY_EMAIL = '8002salman@gmail.com';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { settings, users } = useDataStore();

  const defaultAdmin = {
    email: settings.businessEmail || 'admin@8002erp.com',
    password: settings.adminPassword || 'Admin123@@@',
    name: '8002 Admin',
    role: 'ADMIN' as const,
  };

  const [email, setEmail] = useState(defaultAdmin.email);
  const [password, setPassword] = useState(defaultAdmin.password);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = login(loginEmail, loginPassword);
    if (result.success) {
      setToast({ message: 'Welcome back!', type: 'success' });
      setTimeout(() => navigate('/'), 500);
    } else {
      setError(result.error || 'Invalid credentials');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickAdminSignIn = async () => {
    setEmail(defaultAdmin.email);
    setPassword(defaultAdmin.password);
    await performLogin(defaultAdmin.email, defaultAdmin.password);
  };

  const handleForgotPassword = async () => {
    setForgotError('');
    if (!forgotEmail.trim()) { setForgotError('Please enter your email address'); return; }
    setForgotLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const allUsers = [defaultAdmin, ...users];
    const foundUser = allUsers.find(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
    if (!foundUser) { setForgotError('No account found with this email address'); setForgotLoading(false); return; }
    const subject = encodeURIComponent(`[${settings.businessName}] Password Recovery Request`);
    const body = encodeURIComponent(
      `Password Recovery Request\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `User Details:\n• Name: ${foundUser.name}\n• Email: ${foundUser.email}\n• Role: ${foundUser.role}\n• Password: ${foundUser.password}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRequested: ${new Date().toLocaleString()}\nSystem: ${settings.businessName}\n`
    );
    window.open(`mailto:${ADMIN_NOTIFY_EMAIL}?subject=${subject}&body=${body}`, '_blank');
    setForgotSent(true);
    setForgotLoading(false);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false); setForgotEmail(''); setForgotError(''); setForgotSent(false); setForgotLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      {/* ========== LEFT SIDE - BRANDING ========== */}
      <div style={{
        display: 'none', width: '50%', backgroundColor: '#0f172a', padding: '48px',
        flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
      }} className="lg:!flex">
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(220,38,38,0.3), transparent, #0f172a)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 style={{ width: 28, height: 28, color: 'white' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 24 }}>{settings.businessName}</span>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: 24 }}>
            Powerful Business<br /><span style={{ color: '#ef4444' }}>Accounting</span> System
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 18, lineHeight: 1.6, marginBottom: 32, maxWidth: 420 }}>
            Track sales, manage expenses, calculate taxes, and generate professional reports.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Real-time profit tracking', 'Multi-marketplace support', 'VA commission management', 'Tax-ready reports'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#cbd5e1' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ position: 'relative', zIndex: 10, color: '#64748b', fontSize: 14 }}>
          © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
        </p>
      </div>

      {/* ========== RIGHT SIDE - LOGIN FORM ========== */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, backgroundColor: '#ffffff'
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Mobile Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }} className="lg:!hidden">
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 style={{ width: 28, height: 28, color: 'white' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 24 }}>{settings.businessName}</span>
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Welcome back</h2>
            <p style={{ color: '#64748b', fontSize: 16 }}>Sign in to access your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 8 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#94a3b8' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="username"
                  style={{
                    width: '100%', paddingLeft: 48, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
                    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                    fontSize: 15, color: '#0f172a', outline: 'none'
                  }}
                  placeholder="Email address" required
                  autoFocus
                  onFocus={e => e.target.style.borderColor = '#dc2626'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: '100%', paddingLeft: 48, paddingRight: 48, paddingTop: 14, paddingBottom: 14,
                    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                    fontSize: 15, color: '#0f172a', outline: 'none'
                  }}
                  placeholder="Password" required
                  onFocus={e => e.target.style.borderColor = '#dc2626'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                  {showPassword ? <EyeOff style={{ width: 20, height: 20 }} /> : <Eye style={{ width: 20, height: 20 }} />}
                </button>
              </div>
            </div>

            {/* ======= FORGOT PASSWORD LINK ======= */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, marginTop: -8 }}>
              <button
                type="button"
                onClick={() => { setShowForgotModal(true); setForgotEmail(email); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: '#dc2626',
                  padding: '4px 0', textDecoration: 'underline',
                  textUnderlineOffset: '3px'
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 20
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" loading={loading} className="w-full" size="lg"
              style={{ width: '100%', paddingTop: 14, paddingBottom: 14, fontSize: 16 }}>
              <span>Sign In</span>
              <ArrowRight style={{ width: 20, height: 20 }} />
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleQuickAdminSignIn}
              loading={loading}
              className="w-full mt-3"
              size="lg"
              style={{ width: '100%', paddingTop: 14, paddingBottom: 14, fontSize: 15 }}
            >
              One-Click Admin Sign In
            </Button>
          </form>

        </div>
      </div>

      {/* ========== FORGOT PASSWORD MODAL ========== */}
      <Modal isOpen={showForgotModal} onClose={closeForgotModal} title={forgotSent ? undefined : 'Forgot Password'} size="sm">
        {!forgotSent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound style={{ width: 32, height: 32, color: '#dc2626' }} />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Reset your password</h3>
              <p style={{ fontSize: 14, color: '#64748b' }}>
                Enter your email. We'll prepare a message with your credentials to send to the administrator.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 6 }}>Your Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#94a3b8' }} />
                <input
                  type="email" value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                  style={{
                    width: '100%', paddingLeft: 48, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                    fontSize: 15, color: '#0f172a', outline: 'none'
                  }}
                  placeholder="Enter your email..." autoFocus
                  onFocus={e => e.target.style.borderColor = '#dc2626'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>
            {forgotError && (
              <div style={{ padding: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14 }}>
                {forgotError}
              </div>
            )}
            <div style={{ padding: 12, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: '#1d4ed8' }}>
                <strong>How it works:</strong> Your email client will open with a pre-filled message to <strong>{ADMIN_NOTIFY_EMAIL}</strong> containing your login details. Just hit Send.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="secondary" onClick={closeForgotModal} className="flex-1">
                <ArrowLeft style={{ width: 16, height: 16 }} /> Back
              </Button>
              <Button onClick={handleForgotPassword} loading={forgotLoading} className="flex-1">
                <Send style={{ width: 16, height: 16 }} /> Send Request
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle style={{ width: 32, height: 32, color: '#10b981' }} />
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Email Client Opened!</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
                Your email app should have opened. Click <strong>Send</strong> to deliver your credentials to the admin.
              </p>
              <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Credentials sent to:</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{ADMIN_NOTIFY_EMAIL}</p>
              </div>
            </div>
            <div style={{ padding: 12, backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, textAlign: 'left' }}>
              <p style={{ fontSize: 12, color: '#92400e' }}>
                <strong>Didn't open?</strong> Manually email <strong>{ADMIN_NOTIFY_EMAIL}</strong> with your account email.
              </p>
            </div>
            <Button onClick={closeForgotModal} className="w-full">Back to Login</Button>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Login;
