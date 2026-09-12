import React, { useState, useEffect } from 'react';
import { AuthView, User } from './types';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignUpScreen } from './components/auth/SignUpScreen';
import { DashboardShell } from './components/layout/DashboardShell';
import { AuthService } from './services/authService';

export default function App() {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [activeNavItem, setActiveNavItem] = useState<string>('dashboard');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

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

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentView('dashboard');
  };

  const handleSignUpSuccess = (newUser: User) => {
    setUser(newUser);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentView('login');
    setActiveNavItem('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4 border border-blue-200/60 shadow-sm">
          <i className="fa-solid fa-layer-group fa-spin text-2xl"></i>
        </div>
        <p className="text-sm font-semibold text-gray-800">Authenticating Session...</p>
        <p className="text-xs text-gray-500 mt-1">Verifying credentials against MySQL database</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans antialiased">
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
          onSelectNavItem={(id) => setActiveNavItem(id)}
        />
      )}
    </div>
  );
}
