import React, { useState } from 'react';
import { useUsersRoles, useBranches } from '../../hooks/useAdmin';
import { AdminUser } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { UserModal } from './UserModal';
import { RoleMatrixModal } from './RoleMatrixModal';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

const roleFilterOptions: SelectOption[] = [
  { id: 'all', label: 'All Roles' },
  { id: 'Director', label: 'Director' },
  { id: 'Manager', label: 'Manager' },
  { id: 'Receptionist', label: 'Receptionist' },
  { id: 'Accountant', label: 'Accountant' },
];

const statusFilterOptions: SelectOption[] = [
  { id: 'all', label: 'All Statuses' },
  { id: 'Active', label: 'Active' },
  { id: 'Inactive', label: 'Inactive' },
];

export const UsersRolesPage: React.FC = () => {
  const { users, rolesPermissions, loading, error, refreshUsersRoles, createUser, updateUser, toggleUserStatus, updateRolePermissions } = useUsersRoles();
  const { branches } = useBranches();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleUserModalSubmit = async (data: {
    name: string;
    email: string;
    role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant';
    branch: string;
    status: 'Active' | 'Inactive';
  }) => {
    if (editingUser) {
      await updateUser(editingUser.id, data);
    } else {
      await createUser(data);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Director':
        return 'bg-purple-50 text-purple-700';
      case 'Manager':
        return 'bg-blue-50 text-blue-700';
      case 'Accountant':
        return 'bg-emerald-50 text-emerald-700';
      case 'Receptionist':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-gray-200/80 rounded-2xl shadow-2xs">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <i className="fa-solid fa-users-gear text-sm"></i>
            </span>
            Users & Roles Administration
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-1">
            Manage system access accounts, assign operational roles, and set module permission matrices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMatrixModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-key text-xs text-amber-600"></i>
            Permission Matrix
          </button>
          <button
            onClick={handleOpenCreateUser}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-user-plus text-xs"></i>
            Create User
          </button>
        </div>
      </div>

      {/* Role Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {['Director', 'Manager', 'Receptionist', 'Accountant'].map((roleName) => {
          const count = users.filter((u) => u.role === roleName).length;
          return (
            <div key={roleName} className="bg-white p-4 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded uppercase tracking-wider mb-1 ${getRoleBadgeStyle(roleName)}`}>
                  {roleName}
                </span>
                <p className="text-xl font-semibold text-gray-900">{count} Users</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                <i className="fa-solid fa-user-shield"></i>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 border border-gray-200/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name or email address..."
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="w-40">
            <CustomSelect
              options={roleFilterOptions}
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              icon="fa-solid fa-user-shield"
            />
          </div>

          <div className="w-36">
            <CustomSelect
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              icon="fa-solid fa-filter"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-amber-600 mb-2 block"></i>
            Loading system user accounts...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-xs flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-lg"></i>
              <span>{error}</span>
            </div>
            <button
              onClick={() => refreshUsersRoles()}
              className="mt-1 px-3 py-1 bg-white border border-red-300 rounded-lg text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-user-slash text-2xl mb-2 block text-gray-300"></i>
            No user accounts found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 font-sans">
              <thead className="bg-gray-50/75 border-b border-gray-200/80 font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User Account</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">Branch Scope</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 text-gray-900">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} photoUrl={user.profilePhoto} size="md" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-400 font-normal font-sans">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getRoleBadgeStyle(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <i className="fa-solid fa-building text-gray-400 mr-1.5 text-[10px]"></i>
                      {user.branch || 'All Branches'}
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'Active' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 border border-gray-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit User & Assign Role"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          Edit / Role
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            user.status === 'Active'
                              ? 'text-amber-700 hover:bg-amber-50 border-amber-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          }`}
                          title={user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <i className={`fa-solid ${user.status === 'Active' ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                          {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleUserModalSubmit}
        initialData={editingUser}
        branches={branches}
      />

      {/* Role Permission Matrix Modal */}
      <RoleMatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        rolesPermissions={rolesPermissions}
        onSaveRolePermissions={async (role, permissions) => {
          await updateRolePermissions(role, permissions);
        }}
      />
    </div>
  );
};
