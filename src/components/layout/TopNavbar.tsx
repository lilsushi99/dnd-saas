import React, { useState, useEffect } from 'react';
import { User } from '../../types';

interface TopNavbarProps {
  pageTitle: string;
  user: User;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
  onOpenSearch: () => void;
  onOpenAIAssistant?: () => void;
  onNavigate?: (id: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  pageTitle,
  user,
  onOpenMobileSidebar,
  onLogout,
  onOpenSearch,
  onOpenAIAssistant,
  onNavigate,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateString = now.toLocaleDateString('en-US', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  interface NotificationItem {
    id: string;
    title: string;
    time: string;
    type: string;
    icon: string;
    read: boolean;
    targetNav: string;
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left Area: Mobile Trigger & Dynamic Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <i className="fa-solid fa-bars text-lg"></i>
        </button>

        <div>
          <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            {pageTitle}
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-sans mt-0.5">
            <span className="font-semibold text-gray-800 font-mono flex items-center gap-1">
              <i className="fa-regular fa-clock text-blue-600 text-[11px]"></i>
              {timeString}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-600 font-medium flex items-center gap-1">
              <i className="fa-regular fa-calendar-days text-gray-400 text-[11px]"></i>
              {dateString}
            </span>
          </div>
        </div>
      </div>

      {/* Right Area: AI Assistant, Search, Notifications & User Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* AI Assistant Drawer Trigger Button (Reduced width utility button) */}
        {onOpenAIAssistant && (
          <button
            onClick={onOpenAIAssistant}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Open AI Business Assistant"
          >
            <i className="fa-solid fa-user-tie text-xs text-amber-400"></i>
            <span className="hidden md:inline font-sans text-xs">Assistant</span>
          </button>
        )}

        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3.5 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl text-xs text-gray-500 transition-all cursor-pointer w-32 sm:w-56 group"
        >
          <i className="fa-solid fa-magnifying-glass text-gray-400 group-hover:text-blue-600 transition-colors"></i>
          <span className="truncate flex-1 text-left font-sans">
            Search orders, clients, items...
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono font-semibold text-gray-400 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className={`relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer ${
              showNotifications ? 'bg-gray-100 text-gray-900' : ''
            }`}
            title="Notifications"
          >
            <i className="fa-regular fa-bell text-base"></i>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden font-sans animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-gray-900">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <i className="fa-regular fa-bell-slash text-gray-300 text-2xl mb-2"></i>
                    <p className="text-xs font-semibold text-gray-600">No notifications</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">System updates and activity alerts will appear here.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (onNavigate) onNavigate(notif.targetNav);
                        setShowNotifications(false);
                      }}
                      className={`p-3.5 hover:bg-gray-50 transition-colors flex items-start gap-3 cursor-pointer ${
                        !notif.read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          notif.type === 'success'
                            ? 'bg-green-50 text-green-600'
                            : notif.type === 'warning'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <i className={`${notif.icon} text-xs`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 leading-snug">
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs px-4">
                <button
                  onClick={handleMarkAllRead}
                  className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Mark all as read
                </button>
                <button
                  onClick={() => setNotifications([])}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer text-[11px]"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-gray-200"></div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-heading font-bold flex items-center justify-center text-xs shadow-xs group-hover:scale-105 transition-transform">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-gray-900 leading-none font-heading">
                {user.name}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5 font-sans">
                {user.role}
              </div>
            </div>
            <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 hidden md:block"></i>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden font-sans animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 border-b border-gray-100 bg-gray-50/50">
                <p className="text-xs font-bold text-gray-900">{user.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                  <i className="fa-solid fa-building text-[9px]"></i>
                  {user.organization}
                </div>
              </div>

              <div className="p-1 space-y-0.5 text-xs font-medium text-gray-700">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onNavigate) onNavigate('settings');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <i className="fa-regular fa-user text-gray-400 w-4"></i>
                  <span>Account Profile</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onNavigate) onNavigate('settings');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-sliders text-gray-400 w-4"></i>
                  <span>Workspace Preferences</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onNavigate) onNavigate('settings');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-key text-gray-400 w-4"></i>
                  <span>API Keys & Security</span>
                </button>
              </div>

              <div className="p-1 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-right-from-bracket text-red-500 w-4"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
