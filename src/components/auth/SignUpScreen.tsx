import React, { useState } from 'react';
import { Logo } from '../Logo';
import { AuthView, User } from '../../types';
import { AuthService } from '../../services/authService';

interface SignUpScreenProps {
  onNavigate: (view: AuthView) => void;
  onSignUpSuccess: (user: User) => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onNavigate,
  onSignUpSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendCode = () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid work email address first.');
      return;
    }
    setErrorMessage('');
    setCodeSent(true);
    setVerificationCode('849201'); // Pre-fill mock code for fast testing demo
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your entries.');
      return;
    }

    if (!verificationCode) {
      setErrorMessage(
        'Please enter the 6-digit verification code sent to your email/phone.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await AuthService.signup({
        name: fullName,
        email,
        password,
        role: 'Manager',
      });
      setIsLoading(false);

      if (response.success && response.user) {
        onSignUpSuccess(response.user as User);
      } else {
        setErrorMessage(response.message || 'Failed to create account.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Error connecting to server.');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FB] text-gray-900 font-sans">
      {/* Left Column: Enterprise Branding & Trust Indicators */}
      <div className="hidden lg:flex lg:w-5/12 bg-white border-r border-gray-200/80 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Logo size="lg" />
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
            Nexus ERP
          </h1>

          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Deploy your secure ERP & CRM environment in under two minutes. Access full operational reporting, unified contact books, and automated financial controls.
          </p>

          {/* Enterprise Image */}
          <div className="rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm bg-gray-50 aspect-video relative group">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80"
              alt="Nexus ERP Workspace"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="relative z-10 text-xs text-gray-500 border-t border-gray-100 pt-6">
          <span>Need assistance? Contact our Enterprise Support Team.</span>
        </div>
      </div>

      {/* Right Column: Sign Up Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg my-auto">
          {/* Mobile Logo View */}
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Create Account
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                Back to Sign In
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Provide your details to register as an enterprise administrator.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-500 text-base shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-user text-sm"></i>
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Grid for Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Work Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Work Email
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
                    placeholder="sarah@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-phone text-sm"></i>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Grid for Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-lock text-sm"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-shield text-sm"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Verification Code Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Verification Code
                </label>
                {!codeSent ? (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Send 6-Digit Code
                  </button>
                ) : (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <i className="fa-solid fa-circle-check text-[10px]"></i>
                    Code Sent (849201)
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-key text-sm"></i>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit verification code"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Enter the verification code sent to your work email.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-sm shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                    <span>Creating Enterprise Account...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-check text-xs"></i>
                    <span>Create Account & Launch Workspace</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer link to sign in */}
          <div className="mt-8 text-center text-sm text-gray-600 border-t border-gray-200 pt-6">
            Already have an active account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Sign In here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
