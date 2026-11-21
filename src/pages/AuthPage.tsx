import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Car, KeyRound, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useService } from '../context/ServiceContext';
import type { DealershipRole, SupportedLanguage } from '../types/domain';

interface AuthPageProps {
  mode: 'dealership-login' | 'customer-login' | 'customer-register' | 'forgot-password';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const {
    loginWithGoogle,
    loginWithEmail,
    registerCustomerAccount,
    sendPasswordReset,
    enterDemoSession,
  } = useService();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const isDealership = mode === 'dealership-login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !email.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }

    if (mode === 'forgot-password') {
      setSubmitting(true);
      try {
        await sendPasswordReset(email);
        setResetSent(true);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Unable to send reset email.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'customer-register') {
      if (!name.trim() || !phone.trim()) {
        setFormError('Full name and mobile phone number are required.');
        return;
      }
      setSubmitting(true);
      try {
        await registerCustomerAccount({
          name,
          email,
          phone,
          password,
          preferredLanguage: language,
        });
        navigate('/customer/tracking');
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Registration failed.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      await loginWithEmail(email, password, isDealership ? 'dealership' : 'customer');
      navigate(isDealership ? '/dealership/dashboard' : '/customer/tracking');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      await loginWithGoogle(isDealership ? 'dealership' : 'customer');
      navigate(isDealership ? '/dealership/dashboard' : '/customer/tracking');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Google sign-in cancelled or failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoDealership = (role: DealershipRole) => {
    enterDemoSession(role);
    if (role === 'technician') navigate('/dealership/technician');
    else if (role === 'advisor') navigate('/dealership/advisor');
    else if (role === 'parts_manager') navigate('/dealership/parts-exchange');
    else navigate('/dealership/dashboard');
  };

  const handleDemoCustomer = (customerId: string) => {
    enterDemoSession('customer', customerId);
    navigate('/customer/tracking');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0A1628] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal Hub
        </Link>
        <span className="text-sm font-bold text-[#0A1628]">Service Status Companion</span>
        <Link
          to={isDealership ? '/customer/login' : '/dealership/login'}
          className="text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap"
        >
          {isDealership ? 'Switch to Customer Portal' : 'Switch to Dealership Portal'}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Auth Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                  isDealership ? 'bg-[#0A1628]' : 'bg-[#2563EB]'
                }`}
              >
                {mode === 'forgot-password' ? (
                  <KeyRound className="w-5 h-5" />
                ) : mode === 'customer-register' ? (
                  <UserPlus className="w-5 h-5" />
                ) : isDealership ? (
                  <Building2 className="w-5 h-5" />
                ) : (
                  <Car className="w-5 h-5" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0A1628]">
                  {mode === 'dealership-login' && 'Dealership Employee Sign In'}
                  {mode === 'customer-login' && 'Customer Portal Sign In'}
                  {mode === 'customer-register' && 'Create Customer Account'}
                  {mode === 'forgot-password' && 'Reset Account Password'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mode === 'dealership-login' &&
                    'Role-based access for Admin, Service Advisor, Technician, and Parts Manager'}
                  {mode === 'customer-login' &&
                    'Track active repairs, review inspection photos, and approve estimates'}
                  {mode === 'customer-register' &&
                    'Register your contact profile to link your vehicles and repair orders'}
                  {mode === 'forgot-password' &&
                    'Enter your registered email to receive a Firebase password reset link'}
                </p>
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div className="mb-6">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#0A1628] hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  Continue with Google (Firebase Auth)
                </button>
                <div className="relative my-5 flex items-center">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="mx-3 text-xs text-slate-400">or with email &amp; password</span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>
              </div>
            )}

            {formError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                {formError}
              </div>
            )}

            {resetSent && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
                Password reset email dispatched. Check your inbox and return to sign in.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'customer-register' && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Meera Krishnan"
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="auth-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Mobile Number (SMS / WhatsApp)
                      </label>
                      <input
                        id="auth-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 415 555 0199"
                        required
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-lang" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Preferred Update Language
                      </label>
                      <select
                        id="auth-lang"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                      >
                        <option value="en">English</option>
                        <option value="ta">Tamil (தமிழ்)</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isDealership ? 'employee@apexmotors.com' : 'owner@example.com'}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {mode !== 'forgot-password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-xs text-[#2563EB] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
              >
                {submitting
                  ? 'Processing...'
                  : mode === 'forgot-password'
                    ? 'Send Password Reset Email'
                    : mode === 'customer-register'
                      ? 'Create Account'
                      : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              {mode === 'dealership-login' ? (
                <span>Employee accounts are provisioned by Dealership Admin in Employee Management.</span>
              ) : mode === 'customer-register' ? (
                <span>
                  Already registered?{' '}
                  <Link to="/customer/login" className="font-semibold text-[#2563EB] hover:underline">
                    Sign in here
                  </Link>
                </span>
              ) : (
                <span>
                  New vehicle owner?{' '}
                  <Link to="/customer/register" className="font-semibold text-[#2563EB] hover:underline">
                    Create a customer account
                  </Link>
                </span>
              )}
            </div>
          </div>

          {/* Right: Interactive Demo Role Access */}
          <div className="lg:col-span-5 bg-[#0A1628] text-white rounded-xl p-7">
            <div className="flex items-center gap-2 text-xs font-medium text-[#60A5FA] mb-2">
              <Mail className="w-3.5 h-3.5" />
              <span>Interactive Evaluation Access</span>
            </div>
            <h2 className="text-base font-bold">Instant Role-Based Workspace</h2>
            <p className="text-xs text-slate-300 leading-relaxed mt-2 mb-5">
              Test the complete connected workflow across every dealership role and customer account.
              Changes sync live across portals; sign in with Google above to persist directly to your
              provisioned Cloud Firestore database.
            </p>

            {isDealership || mode === 'forgot-password' ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleDemoDealership('admin')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold">Admin — Nivekhitha Sundaram</p>
                  <p className="text-xs text-slate-300 mt-0.5">Full dealership KPIs, staff CRUD, reports &amp; settings</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoDealership('advisor')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold">Service Advisor — Priya Subramanian</p>
                  <p className="text-xs text-slate-300 mt-0.5">Appointments, RO creation, technician dispatch &amp; ETAs</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoDealership('technician')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold">Technician — Arjun Menon</p>
                  <p className="text-xs text-slate-300 mt-0.5">Assigned bays, checklists, media upload &amp; approvals</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoDealership('parts_manager')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold">Parts Manager — Kavita Nair</p>
                  <p className="text-xs text-slate-300 mt-0.5">Circular Parts Exchange, credits &amp; CO2 metrics</p>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleDemoCustomer('cust_1')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold">Ananya Rao (English)</p>
                  <p className="text-xs text-slate-300 mt-0.5">2023 Volvo XC60 (Pending Approval) · 2021 Audi Q5 (Ready)</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoCustomer('cust_2')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold">Rohan Mehta (हिन्दी)</p>
                  <p className="text-xs text-slate-300 mt-0.5">2022 BMW 330i xDrive · Diagnosis (Delayed ETA)</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoCustomer('cust_3')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <p className="text-sm font-semibold">Karthik Natarajan (தமிழ்)</p>
                  <p className="text-xs text-slate-300 mt-0.5">2024 Hyundai IONIQ 5 · Repair In Progress</p>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
