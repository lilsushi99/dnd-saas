import React, { useState, useEffect } from 'react';
import { User, AdminUser, RolePermission } from '../../types';
import { useToast } from '../../context/ToastContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { OperationsApiService } from '../../services/operationsService';
import { AdminApiService } from '../../services/adminService';

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'business' | 'profile' | 'roles'>('business');
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // Business Settings State - strictly empty initially (No hardcoded demo values)
  const [businessName, setBusinessName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [currency, setCurrency] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [language, setLanguage] = useState('');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [bookingPrefix, setBookingPrefix] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [clientPrefix, setClientPrefix] = useState('');
  const [expensePrefix, setExpensePrefix] = useState('');
  const [categoryPrefix, setCategoryPrefix] = useState('');
  const [branchCode, setBranchCode] = useState('');

  // Profile Settings State - strictly from DB
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Role Management State
  const [rolesList, setRolesList] = useState<RolePermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<{
    [role: string]: {
      dashboard: boolean;
      crm: boolean;
      bookings: boolean;
      dailyLogger: boolean;
      finance: boolean;
      expenses: boolean;
      reports: boolean;
      administration: boolean;
    };
  }>({});
  const [usersList, setUsersList] = useState<AdminUser[]>([]);

  // Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      showToast('Uploading Logo', 'Saving business logo to server...', 'info');
      const result = await AdminApiService.uploadFile(file, 'logo');
      setBusinessLogo(result.url);
      showToast('Logo Uploaded', 'Business logo uploaded successfully.', 'success');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setBusinessLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
      showToast('Notice', 'Image loaded locally. Click Save Changes to commit.', 'info');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleProfilePhotoUpload = async (file: File) => {
    setIsUploadingProfilePhoto(true);
    try {
      showToast('Uploading Photo', 'Saving profile picture to server...', 'info');
      const result = await AdminApiService.uploadFile(file, 'profile_photo');
      setProfilePhoto(result.url);
      showToast('Photo Uploaded', 'Profile photo uploaded successfully.', 'success');
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
      showToast('Notice', 'Image loaded locally. Click Save Profile Info to commit.', 'info');
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  };

  // Load Business Settings from MySQL
  const loadBusinessSettings = async () => {
    setIsLoadingBusiness(true);
    try {
      const s = await OperationsApiService.fetchSystemSettings();
      setBusinessName(s.businessName || '');
      setDirectorName(s.directorName || '');
      setBusinessLogo(s.businessLogo || '');
      setCurrency(s.currency || '');
      setTimeZone(s.timeZone || '');
      setAddress(s.address || '');
      setPhone(s.phone || '');
      setEmail(s.email || '');
      setWebsite(s.website || '');
      setLanguage(s.language || '');
      setTaxRate(s.taxRate !== undefined ? Number(s.taxRate) : 0);
      setBookingPrefix(s.bookingPrefix || '');
      setInvoicePrefix(s.invoicePrefix || '');
      setClientPrefix(s.clientPrefix || '');
      setExpensePrefix(s.expensePrefix || '');
      setCategoryPrefix(s.categoryPrefix || '');
      setBranchCode(s.branchCode || '');
    } catch (err) {
      console.error('Failed to load business settings from MySQL', err);
    } finally {
      setIsLoadingBusiness(false);
    }
  };

  // Load Profile Settings from MySQL
  const loadProfileSettings = async () => {
    setIsLoadingProfile(true);
    try {
      const p = await OperationsApiService.fetchProfileSettings(user.id);
      setProfileName(p.profileName || user.name || '');
      setProfileEmail(p.profileEmail || user.email || '');
      setProfilePhone(p.profilePhone || '');
      setProfilePhoto(p.profilePhoto || '');
    } catch (err) {
      console.error('Failed to load profile settings from MySQL', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Load Roles & Users from MySQL
  const loadRolesAndUsers = async () => {
    setIsLoadingRoles(true);
    try {
      const [fetchedRoles, fetchedUsers] = await Promise.all([
        AdminApiService.fetchRolesPermissions(),
        AdminApiService.fetchUsers(),
      ]);

      setRolesList(fetchedRoles);
      setUsersList(fetchedUsers);

      const matrix: Record<string, any> = {};
      fetchedRoles.forEach((r) => {
        matrix[r.role] = {
          dashboard: !!r.permissions?.dashboard,
          crm: !!r.permissions?.crm,
          bookings: !!(r.permissions as any)?.bookings || !!r.permissions?.dailyLogger,
          dailyLogger: !!r.permissions?.dailyLogger,
          finance: !!(r.permissions as any)?.finance || !!r.permissions?.expenses,
          expenses: !!r.permissions?.expenses,
          reports: !!r.permissions?.reports,
          administration: !!(r.permissions as any)?.administration || !!(r.permissions as any)?.admin,
        };
      });
      setRolePermissions(matrix);
    } catch (err) {
      console.error('Failed to load roles and users from MySQL', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    loadBusinessSettings();
    loadProfileSettings();
    loadRolesAndUsers();
  }, [user.id]);

  // Save Business Settings to MySQL
  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBusiness(true);
    try {
      const updated = await OperationsApiService.updateSystemSettings({
        businessName: businessName.trim(),
        directorName: directorName.trim(),
        businessLogo: businessLogo.trim(),
        currency: currency.trim(),
        timeZone: timeZone.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        language: language.trim(),
        taxRate: Number(taxRate) || 0,
        bookingPrefix: bookingPrefix.trim(),
        invoicePrefix: invoicePrefix.trim(),
        clientPrefix: clientPrefix.trim(),
        expensePrefix: expensePrefix.trim(),
        categoryPrefix: categoryPrefix.trim(),
        branchCode: branchCode.trim(),
      });

      // Update state with returned database values
      setBusinessName(updated.businessName || '');
      setDirectorName(updated.directorName || '');
      setBusinessLogo(updated.businessLogo || '');
      setCurrency(updated.currency || '');
      setTimeZone(updated.timeZone || '');
      setAddress(updated.address || '');
      setPhone(updated.phone || '');
      setEmail(updated.email || '');
      setWebsite(updated.website || '');
      setLanguage(updated.language || '');
      setTaxRate(updated.taxRate !== undefined ? Number(updated.taxRate) : 0);
      setBookingPrefix(updated.bookingPrefix || '');
      setInvoicePrefix(updated.invoicePrefix || '');
      setClientPrefix(updated.clientPrefix || '');
      setExpensePrefix(updated.expensePrefix || '');
      setCategoryPrefix(updated.categoryPrefix || '');
      setBranchCode(updated.branchCode || '');

      showToast('Settings Saved', 'Business configuration saved successfully to MySQL database.', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save settings to MySQL.', 'error');
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleCancelBusinessSettings = () => {
    loadBusinessSettings();
    showToast('Changes Cancelled', 'Reverted back to saved database values.', 'info');
  };

  // Save Profile Settings to MySQL
  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await OperationsApiService.updateProfileSettings({
        userId: user.id,
        profileName: profileName.trim(),
        profileEmail: profileEmail.trim(),
        profilePhone: profilePhone.trim(),
        profilePhoto: profilePhoto.trim(),
      });

      setProfileName(updated.profileName || '');
      setProfileEmail(updated.profileEmail || '');
      setProfilePhone(updated.profilePhone || '');
      setProfilePhoto(updated.profilePhoto || '');

      showToast('Profile Updated', 'Profile details saved successfully to MySQL database.', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save profile settings.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle Granular Permission
  const togglePermission = (role: string, module: string) => {
    setRolePermissions((prev) => {
      const currentRolePerms = prev[role] || {
        dashboard: false,
        crm: false,
        bookings: false,
        dailyLogger: false,
        finance: false,
        expenses: false,
        reports: false,
        administration: false,
      };
      return {
        ...prev,
        [role]: {
          ...currentRolePerms,
          [module]: !(currentRolePerms as any)[module],
        },
      };
    });
  };

  // Save Role Matrix to MySQL
  const handleSaveRoleMatrix = async () => {
    setIsSavingRoles(true);
    try {
      const rolesToSave = ['Director', 'Manager', 'Receptionist', 'Accountant'] as const;
      await Promise.all(
        rolesToSave.map((r) => {
          const perms = rolePermissions[r] || {
            dashboard: true,
            crm: true,
            bookings: true,
            dailyLogger: true,
            finance: true,
            expenses: true,
            reports: true,
            administration: false,
          };
          return AdminApiService.updateRolePermissions(r, perms as any);
        })
      );

      await loadRolesAndUsers();
      showToast('Permissions Saved', 'Role permissions matrix updated successfully in MySQL.', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save role permissions.', 'error');
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Update User Role Assignment in MySQL
  const handleUserRoleChange = async (userId: string, newRole: AdminUser['role']) => {
    try {
      await AdminApiService.updateUser(userId, { role: newRole });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showToast('Role Updated', `Assigned user to ${newRole} role in MySQL.`, 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update user role assignment.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-gray-200/80 rounded-2xl shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-heading flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <i className="fa-solid fa-gear text-sm"></i>
            </span>
            System Settings & Security Controls
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-1">
            Database-driven configuration for business identity, localization, administrator profile, and role permission matrices
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white px-4 sm:px-6 rounded-2xl shadow-2xs overflow-x-auto">
        {[
          { id: 'business', label: 'Business Settings', icon: 'fa-solid fa-building' },
          { id: 'profile', label: 'Profile Settings', icon: 'fa-solid fa-user-circle' },
          { id: 'roles', label: 'Role Management', icon: 'fa-solid fa-shield-halved' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 px-3 sm:px-5 border-b-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className={`${tab.icon} text-xs ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BUSINESS SETTINGS */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusinessSettings} className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-heading">Business Configuration</h2>
              <p className="text-xs text-gray-500 mt-0.5">Define corporate entity info, currency, time zone, and localized defaults</p>
            </div>
            {isLoadingBusiness && (
              <span className="text-xs text-blue-600 flex items-center gap-1.5 font-medium">
                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                Loading settings from database...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                placeholder="Enter registered business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Director / Name</label>
              <input
                type="text"
                placeholder="Executive Director / Owner"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Business Logo</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center relative group">
                  {businessLogo ? (
                    <img src={businessLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-building text-gray-400 text-sm"></i>
                  )}
                  <label className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-xs">
                    {isUploadingLogo ? (
                      <i className="fa-solid fa-spinner fa-spin text-white"></i>
                    ) : (
                      <i className="fa-solid fa-camera"></i>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingLogo}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <label className={`px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs ${isUploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploadingLogo ? (
                      <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                    ) : (
                      <i className="fa-solid fa-upload text-blue-600"></i>
                    )}
                    {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingLogo}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
              <input
                type="text"
                placeholder="e.g. NGN (₦) or USD ($)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Time Zone</label>
              <input
                type="text"
                placeholder="e.g. UTC+01:00 (West Africa Time)"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Business Address</label>
              <input
                type="text"
                placeholder="Physical / corporate office address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="Official corporate phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="official@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Website</label>
              <input
                type="text"
                placeholder="https://company.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Default Language</label>
              <input
                type="text"
                placeholder="e.g. English (Default)"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Dedicated ID Prefix Configuration */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-heading">Sequential ID Prefix Configuration</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Prefixes and identifiers stored in MySQL and used for auto-generating system record IDs
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Booking Prefix</label>
                <input
                  type="text"
                  value={bookingPrefix}
                  onChange={(e) => setBookingPrefix(e.target.value.toUpperCase())}
                  placeholder="BK"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  placeholder="INV"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client Prefix</label>
                <input
                  type="text"
                  value={clientPrefix}
                  onChange={(e) => setClientPrefix(e.target.value.toUpperCase())}
                  placeholder="CL"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Expense Prefix</label>
                <input
                  type="text"
                  value={expensePrefix}
                  onChange={(e) => setExpensePrefix(e.target.value.toUpperCase())}
                  placeholder="EXP"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category Prefix</label>
                <input
                  type="text"
                  value={categoryPrefix}
                  onChange={(e) => setCategoryPrefix(e.target.value.toUpperCase())}
                  placeholder="EC"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Code</label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="IPHIN"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelBusinessSettings}
              className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel Changes
            </button>
            <button
              type="submit"
              disabled={isSavingBusiness}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSavingBusiness ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  Saving to MySQL...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-xs"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfileSettings} className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-heading">User Profile Information</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage personal credentials and profile details stored in MySQL</p>
            </div>
            {isLoadingProfile && (
              <span className="text-xs text-blue-600 flex items-center gap-1.5 font-medium">
                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                Loading profile from database...
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 bg-gray-50/80 border border-gray-200/80 rounded-2xl">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xl flex items-center justify-center font-heading shadow-md overflow-hidden">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile Photo" className="w-full h-full object-cover" />
                ) : (
                  profileName ? profileName.split(' ').map((n) => n[0]).join('') : 'U'
                )}
              </div>
              <label className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center cursor-pointer text-xs">
                {isUploadingProfilePhoto ? (
                  <i className="fa-solid fa-spinner fa-spin text-white"></i>
                ) : (
                  <i className="fa-solid fa-camera"></i>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingProfilePhoto}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfilePhotoUpload(file);
                  }}
                />
              </label>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-gray-900 font-heading">{profileName || 'No Name Set'}</h3>
              <p className="text-xs text-gray-500">{profileEmail || user.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label className={`px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs ${isUploadingProfilePhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploadingProfilePhoto ? (
                    <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                  ) : (
                    <i className="fa-solid fa-upload text-blue-600"></i>
                  )}
                  {isUploadingProfilePhoto ? 'Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingProfilePhoto}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProfilePhotoUpload(file);
                    }}
                  />
                </label>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {user.role} Access
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Session
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Profile Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Profile Email</label>
              <input
                type="email"
                placeholder="name@enterprise.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Profile Phone</label>
              <input
                type="text"
                placeholder="Phone Number"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">System Role</label>
              <input
                type="text"
                disabled
                value={user.role}
                className="w-full px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 font-semibold font-sans cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-key text-amber-600"></i>
                Change Password
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-right-from-bracket text-red-600"></i>
                Logout Account
              </button>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isSavingProfile ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  Saving to MySQL...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-xs"></i>
                  Save Profile Info
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: ROLE MANAGEMENT */}
      {activeTab === 'roles' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-heading">Role Management & Permissions</h2>
              <p className="text-xs text-gray-500 mt-0.5">Toggle granular module permissions per organizational role and assign roles to users in MySQL</p>
            </div>
            <button
              onClick={handleSaveRoleMatrix}
              disabled={isSavingRoles}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isSavingRoles ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  Updating MySQL...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  Save Role Matrix
                </>
              )}
            </button>
          </div>

          {/* Section 1: Permissions Matrix */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Module Permissions Matrix</h3>
            {[
              { role: 'Director', desc: 'Full Access across all system modules, finances, branches, and security settings.', badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200' },
              { role: 'Manager', desc: 'Access to Dashboard, CRM, Operations, Reports, and Finance modules.', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200' },
              { role: 'Receptionist', desc: 'Front-desk access restricted to Bookings, CRM, and Daily Logger operations.', badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200' },
              { role: 'Accountant', desc: 'Finance access restricted to General Ledger, Expenses, and Financial Reports.', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            ].map(({ role, desc, badgeStyle }) => (
              <div key={role} className="border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-4 bg-gray-50/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${badgeStyle}`}>
                      {role}
                    </span>
                    <p className="text-xs text-gray-500 font-sans">{desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-200/60">
                  {[
                    { key: 'dashboard', label: 'Executive Dashboard' },
                    { key: 'crm', label: 'CRM & Accounts' },
                    { key: 'bookings', label: 'Facility Bookings' },
                    { key: 'dailyLogger', label: 'Daily Logger' },
                    { key: 'finance', label: 'Financial Ledger' },
                    { key: 'expenses', label: 'Expense Vouchers' },
                    { key: 'reports', label: 'Reports & Analytics' },
                    { key: 'administration', label: 'System Admin' },
                  ].map(({ key, label }) => {
                    const isChecked = !!rolePermissions[role]?.[key as keyof (typeof rolePermissions)['Director']];
                    return (
                      <div
                        key={key}
                        onClick={() => togglePermission(role, key)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-white border-blue-200 shadow-2xs'
                            : 'bg-gray-100/60 border-gray-200/80 opacity-60'
                        }`}
                      >
                        <span className="text-xs font-semibold text-gray-800">{label}</span>
                        <div
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                            isChecked ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                              isChecked ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Section 2: User Role Assignments */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">User Role Assignments</h3>
              <p className="text-xs text-gray-500 mt-0.5">Assign and manage system security access roles directly for registered system accounts in MySQL</p>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4">Assigned Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        No user accounts found in database.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-gray-900">{u.name}</td>
                        <td className="py-3 px-4 text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUserRoleChange(u.id, e.target.value as AdminUser['role'])}
                            className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="Director">Director</option>
                            <option value="Manager">Manager</option>
                            <option value="Receptionist">Receptionist</option>
                            <option value="Accountant">Accountant</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
