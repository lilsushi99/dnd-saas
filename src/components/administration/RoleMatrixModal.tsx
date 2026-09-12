import React, { useState, useEffect } from 'react';
import { RolePermission } from '../../types';

interface RoleMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  rolesPermissions: RolePermission[];
  onSaveRolePermissions: (
    role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant',
    permissions: RolePermission['permissions']
  ) => Promise<void>;
}

export const RoleMatrixModal: React.FC<RoleMatrixModalProps> = ({
  isOpen,
  onClose,
  rolesPermissions,
  onSaveRolePermissions,
}) => {
  const [localRoles, setLocalRoles] = useState<RolePermission[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalRoles(JSON.parse(JSON.stringify(rolesPermissions)));
  }, [rolesPermissions, isOpen]);

  if (!isOpen) return null;

  const modulesList: Array<{ key: keyof RolePermission['permissions']; label: string; icon: string }> = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { key: 'dailyLogger', label: 'Daily Logger', icon: 'fa-clipboard-list' },
    { key: 'facilityRecords', label: 'Facility Records', icon: 'fa-building' },
    { key: 'crm', label: 'CRM', icon: 'fa-address-book' },
    { key: 'expenses', label: 'Expenses', icon: 'fa-receipt' },
    { key: 'reports', label: 'Reports', icon: 'fa-chart-line' },
    { key: 'administration', label: 'Administration', icon: 'fa-shield-halved' },
    { key: 'settings', label: 'Settings', icon: 'fa-gear' },
  ];

  const handleToggle = (roleName: string, moduleKey: keyof RolePermission['permissions']) => {
    setLocalRoles((prev) =>
      prev.map((r) => {
        if (r.role === roleName) {
          return {
            ...r,
            permissions: {
              ...r.permissions,
              [moduleKey]: !r.permissions[moduleKey],
            },
          };
        }
        return r;
      })
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      for (const r of localRoles) {
        await onSaveRolePermissions(r.role, r.permissions);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fadeIn font-sans">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <i className="fa-solid fa-key text-base"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-heading">
                Role Permission Matrix
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Manage access control levels and module visibility for each system role
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

        {/* Body Content - Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50/75 border-b border-gray-200 uppercase font-medium text-gray-500 tracking-wider sticky top-0 bg-white">
              <tr>
                <th className="px-4 py-3">Module Name</th>
                {localRoles.map((r) => (
                  <th key={r.role} className="px-4 py-3 text-center">
                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 font-bold text-gray-900 capitalize border border-gray-200">
                      {r.role}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modulesList.map((mod) => (
                <tr key={mod.key} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">
                      <i className={`fa-solid ${mod.icon}`}></i>
                    </span>
                    {mod.label}
                  </td>
                  {localRoles.map((r) => {
                    const isAllowed = r.permissions[mod.key];
                    return (
                      <td key={r.role} className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(r.role, mod.key)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            isAllowed
                              ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={`Toggle ${mod.label} for ${r.role}`}
                        >
                          <i className={`fa-solid ${isAllowed ? 'fa-check text-xs' : 'fa-xmark text-xs'}`}></i>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-[11px] text-gray-500">
            Changes apply instantly to role authorizations across all active user sessions.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  Updating Permissions...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-xs"></i>
                  Save Permission Matrix
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
