import React, { useState } from 'react';
import { Logo } from '../Logo';
import { AuthView, User } from '../../types';
import { AuthService } from '../../services/authService';

interface LoginScreenProps {
  onNavigate: (view: AuthView) => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigate,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('director@nexuserp.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.login({ email, password });
      setIsLoading(false);

      if (response.success && response.user) {
        onLoginSuccess(response.user as User);
      } else {
        setErrorMessage(response.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Connection error to MySQL authentication server.');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FB] text-gray-900 font-sans">
      {/* Left Column: Branding & Value Proposition (Split Screen) */}
      <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-gray-200/80 p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient subtle accent glow - strict subtle tint, no bright gradients */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-100/80 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <Logo size="lg" />
        </div>

        {/* Hero Copy & Enterprise Image */}
        <div className="relative z-10 my-auto max-w-lg">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
            Unified Enterprise Governance and Resource Management
          </h1>

          <p className="text-gray-600 text-base leading-relaxed mb-6">
            Manage global operations, supply chain, financial ledgers, and customer intelligence from a single high-performance application shell.
          </p>

          {/* Enterprise Image */}
          <div className="rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm bg-gray-50 aspect-video relative group">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80"
              alt="Nexus Enterprise Operations"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-6">
          <span>&copy; 2026, Nexus System International</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo View */}
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          {/* Title Header */}
          <div className="mb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Sign in to Nexus ERP
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Enter your credentials to access your enterprise workspace.
            </p>
          </div>

          {/* Form Alert Message if error */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-500 text-base shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-envelope text-sm"></i>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      'Password reset link will be sent to your registered work email.'
                    )
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-lock text-sm"></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i
                    className={`fa-solid ${
                      showPassword ? 'fa-eye-slash' : 'fa-eye'
                    } text-sm`}
                  ></i>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                  Remember this device
                </span>
              </label>
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <i className="fa-solid fa-circle-check text-green-500 text-[10px]"></i>
                SSL 256-Bit Encrypted
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-sm shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F8F9FB] px-3 text-gray-400 font-medium">
                New Enterprise Client?
              </span>
            </div>
          </div>

          {/* Link to Sign Up */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 transition-all shadow-sm cursor-pointer"
            >
              <i className="fa-solid fa-user-plus text-gray-500 text-xs"></i>
              <span>Create New Enterprise Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
