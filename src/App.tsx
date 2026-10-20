import React, { useState, useEffect } from 'react';
import { AuthView, User } from './types';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignUpScreen } from './components/auth/SignUpScreen';
import { DashboardShell } from './components/layout/DashboardShell';
import { AuthService } from './services/authService';
import { AUTH_EXPIRED_EVENT, SESSION_TIMEOUT_EVENT } from './services/http';
import { BrandingProvider } from './context/BrandingContext';

export default function App() {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [activeNavItem, setActiveNavItem] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nexus_active_nav') || 'dashboard';
    }
    return 'dashboard';
  });
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [sessionTimeoutReason, setSessionTimeoutReason] = useState<string | null>(null);

  // Logged-in user state
  const [user, setUser] = useState<User>({
    id: 'USR-001',
    name: 'Dominion',
    email: 'director@nexuserp.com',
    role: 'Director',
    organization: 'Nexus ERP Enterprise',
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await AuthService.getCurrentUser();
        if (response.success && response.user) {
          setUser(response.user as User);
          setCurrentView('dashboard');
          // Restore previously active nav item if saved
          const savedNav = sessionStorage.getItem('nexus_active_nav');
          if (savedNav) {
            setActiveNavItem(savedNav);
          }
        } else {
          setCurrentView('login');
        }
      } catch (err) {
        setCurrentView('login');
      } finally {
        setIsInitializing(false);
      }
    };

    checkSession();
  }, []);

  // Any API call that comes back 401 (expired/revoked session) returns the user to the login screen.
  useEffect(() => {
    const onExpired = () => {
      setCurrentView('login');
      setActiveNavItem('dashboard');
      sessionStorage.removeItem('nexus_active_nav');
    };

    const onSessionTimeout = (e: any) => {
      setSessionTimeoutReason(
        e.detail?.reason === 'infrastructure'
          ? 'Your connection to the ERP server timed out due to inactivity.'
          : 'Your session has expired.'
      );
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener(SESSION_TIMEOUT_EVENT, onSessionTimeout);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener(SESSION_TIMEOUT_EVENT, onSessionTimeout);
    };
  }, []);

  const handleSelectNav = (id: string) => {
    setActiveNavItem(id);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nexus_active_nav', id);
    }
  };

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentView('dashboard');
    setSessionTimeoutReason(null);
  };

  const handleSignUpSuccess = (newUser: User) => {
    setUser(newUser);
    setCurrentView('dashboard');
    setSessionTimeoutReason(null);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentView('login');
    setActiveNavItem('dashboard');
    sessionStorage.removeItem('nexus_active_nav');
    setSessionTimeoutReason(null);
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    setUser((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleReconnect = () => {
    setSessionTimeoutReason(null);
    window.location.reload();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4 border border-blue-200/60 shadow-sm">
          <i className="fa-solid fa-layer-group fa-spin text-2xl"></i>
        </div>
        <p className="text-sm font-semibold text-gray-800">Authenticating Session...</p>
        <p className="text-xs text-gray-500 mt-1">Verifying credentials against database</p>
      </div>
    );
  }

  return (
    <BrandingProvider>
      <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans antialiased">
        {/* Session Timeout Modal */}
        {sessionTimeoutReason && (
          <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center border border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 text-xl">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Session Inactive</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                {sessionTimeoutReason} Click below to reconnect your session and resume where you left off.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReconnect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <i className="fa-solid fa-rotate text-xs"></i>
                  <span>Reconnect Session</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Log In Again
                </button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'login' && (
          <LoginScreen
            onNavigate={(view) => setCurrentView(view)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentView === 'signup' && (
          <SignUpScreen
            onNavigate={(view) => setCurrentView(view)}
            onSignUpSuccess={handleSignUpSuccess}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardShell
            user={user}
            onLogout={handleLogout}
            activeNavItem={activeNavItem}
            onSelectNavItem={handleSelectNav}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </div>
    </BrandingProvider>
  );
}
