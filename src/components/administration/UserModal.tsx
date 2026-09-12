import React, { useState, useEffect } from 'react';
import { AdminUser, Branch } from '../../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant';
    branch: string;
    status: 'Active' | 'Inactive';
  }) => Promise<void>;
  initialData?: AdminUser | null;
  branches: Branch[];
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  branches,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Director' | 'Manager' | 'Receptionist' | 'Accountant'>('Manager');
  const [branch, setBranch] = useState('All Branches');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [password, setPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setRole(initialData.role);
      setBranch(initialData.branch || 'All Branches');
      setStatus(initialData.status);
      setShowResetPassword(false);
    } else {
      setName('');
      setEmail('');
      setRole('Manager');
      setBranch('All Branches');
      setStatus('Active');
      setPassword('');
      setShowResetPassword(false);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and Email address are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        role,
        branch,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordAction = () => {
    if (!password.trim()) {
      setError('Please enter a new password to reset.');
      return;
    }
    alert(`Password for ${name} has been reset to: "${password}"`);
    setPassword('');
    setShowResetPassword(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fadeIn font-sans">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <i className="fa-solid fa-user-gear text-base"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-heading">
                {initialData ? 'Edit User & Assign Role' : 'Create System User'}
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                {initialData ? 'Manage user profile, roles, and security options' : 'Grant user account access and operational role'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-500"></i>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="s.jenkins@enterprise-hub.com"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Assign Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer font-medium"
              >
                <option value="Director">Director (Full Admin)</option>
                <option value="Manager">Manager</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Accountant">Accountant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Assigned Branch Access
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="All Branches">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Account Status
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  name="userStatus"
                  value="Active"
                  checked={status === 'Active'}
                  onChange={() => setStatus('Active')}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  name="userStatus"
                  value="Inactive"
                  checked={status === 'Inactive'}
                  onChange={() => setStatus('Inactive')}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  Inactive
                </span>
              </label>
            </div>
          </div>

          {/* Reset Password Option for existing users */}
          {initialData && (
            <div className="pt-3 border-t border-gray-100">
              {!showResetPassword ? (
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-key text-xs"></i>
                  Reset User Password
                </button>
              ) : (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-900">Reset Password</span>
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new temporary password"
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-gray-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleResetPasswordAction}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 cursor-pointer"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  {initialData ? 'Save User Settings' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
