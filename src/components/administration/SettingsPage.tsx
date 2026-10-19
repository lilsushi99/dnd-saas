import React, { useState, useEffect } from 'react';
import { User, AdminUser, RolePermission } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useBranding } from '../../context/BrandingContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { OperationsApiService } from '../../services/operationsService';
import { AdminApiService } from '../../services/adminService';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { UserAvatar } from '../common/UserAvatar';
import { Logo } from '../Logo';
import {
  DEFAULT_PRIMARY_COLOR,
  PRESET_BRAND_COLORS,
  isValidHex,
  normalizeHex,
  lightenHex,
} from '../../utils/colorUtils';

const roleAssignmentOptions: SelectOption[] = [
  { id: 'Director', label: 'Director' },
  { id: 'Manager', label: 'Manager' },
  { id: 'Receptionist', label: 'Receptionist' },
  { id: 'Accountant', label: 'Accountant' },
];

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
  onUpdateUser?: (updated: Partial<User>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout, onUpdateUser }) => {
  const { showToast } = useToast();
  const branding = useBranding();

  const [activeTab, setActiveTab] = useState<'business' | 'profile' | 'roles'>('business');
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // Business Settings State
  const [businessName, setBusinessName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [directorPhoto, setDirectorPhoto] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
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

  // Profile Settings State
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

  // Modal & Uploading States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingDirectorPhoto, setIsUploadingDirectorPhoto] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);

  // Business Logo Upload Handler with strict validation and safe failure handling
  const handleLogoUpload = async (file: File) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File Too Large', 'Logo file size exceeds the 5MB limit. Please upload a smaller image.', 'error');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Invalid Format', 'Unsupported file format. Please upload a PNG, JPEG, WebP, or clean SVG file.', 'error');
      return;
    }

    setIsUploadingLogo(true);
    try {
      showToast('Uploading Logo', 'Saving business logo to server...', 'info');
      const result = await AdminApiService.uploadFile(file, 'logo');
      setBusinessLogo(result.url);
      branding.setBusinessLogo(result.url);
      showToast('Logo Uploaded', 'Business logo uploaded and saved successfully.', 'success');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      // Explicitly show the failure message and NEVER replace valid logo with broken path
      showToast('Upload Failed', err.message || 'Failed to upload business logo to server.', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleResetLogo = () => {
    setBusinessLogo('');
    branding.setBusinessLogo('');
    showToast('Logo Reset', 'Business logo reset to default system branding. Click Save Changes to commit.', 'info');
  };

  // Director's Profile Picture Upload Handler
  const handleDirectorPhotoUpload = async (file: File) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File Too Large', "Photo file size exceeds the 5MB limit.", 'error');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Invalid Format', 'Please upload a PNG, JPEG, or WebP photo.', 'error');
      return;
    }

    setIsUploadingDirectorPhoto(true);
    try {
      showToast('Uploading Photo', "Saving director's profile picture to server...", 'info');
      const result = await AdminApiService.uploadFile(file, 'director_photo');
      setDirectorPhoto(result.url);
      branding.setDirectorPhoto(result.url);
      if (user.role === 'Director' || user.id === 'USR-001') {
        onUpdateUser?.({ profilePhoto: result.url });
      }
      showToast('Photo Uploaded', "Director's profile picture updated successfully.", 'success');
    } catch (err: any) {
      console.error('Director photo upload error:', err);
      showToast('Upload Failed', err.message || "Failed to upload director's photo.", 'error');
    } finally {
      setIsUploadingDirectorPhoto(false);
    }
  };

  const handleResetDirectorPhoto = () => {
    setDirectorPhoto('');
    branding.setDirectorPhoto('');
    if (user.role === 'Director' || user.id === 'USR-001') {
      onUpdateUser?.({ profilePhoto: undefined });
    }
    showToast('Photo Removed', "Director's profile picture cleared. Click Save Changes to commit.", 'info');
  };

  // User Profile Photo Upload Handler
  const handleProfilePhotoUpload = async (file: File) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File Too Large', 'Profile photo exceeds 5MB limit.', 'error');
      return;
    }

    setIsUploadingProfilePhoto(true);
    try {
      showToast('Uploading Photo', 'Saving profile picture to server...', 'info');
      const result = await AdminApiService.uploadFile(file, 'profile_photo', user.id);
      setProfilePhoto(result.url);
      onUpdateUser?.({ profilePhoto: result.url });
      showToast('Photo Uploaded', 'Profile photo uploaded successfully.', 'success');
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      showToast('Upload Failed', err.message || 'Failed to upload profile photo.', 'error');
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhoto('');
    onUpdateUser?.({ profilePhoto: undefined });
    showToast('Photo Removed', 'Profile photo cleared. Click Save Profile Info to commit.', 'info');
  };

  // Theme Color Change Handler (Live Preview)
  const handleColorChange = (newHex: string) => {
    setPrimaryColor(newHex);
    if (isValidHex(newHex)) {
      branding.applyThemeColor(newHex);
    }
  };

  const handleResetPrimaryColor = () => {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    branding.resetThemeToDefault();
    showToast('Theme Reset', 'Primary brand color reset to default Nexus Blue (#1C64FF).', 'info');
  };

  // Load Business Settings from MySQL
  const loadBusinessSettings = async () => {
    setIsLoadingBusiness(true);
    try {
      const s = await OperationsApiService.fetchSystemSettings();
      setBusinessName(s.businessName || '');
      setDirectorName(s.directorName || '');
      setBusinessLogo(s.businessLogo || '');
      setDirectorPhoto(s.directorPhoto || '');
      const color = s.primaryColor && isValidHex(s.primaryColor) ? normalizeHex(s.primaryColor) : DEFAULT_PRIMARY_COLOR;
      setPrimaryColor(color);
      branding.applyThemeColor(color);

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
    if (!isValidHex(primaryColor)) {
      showToast('Invalid Color', 'Primary brand color must be a valid hex code (e.g. #1C64FF).', 'error');
      return;
    }

    setIsSavingBusiness(true);
    try {
      const updated = await OperationsApiService.updateSystemSettings({
        businessName: businessName.trim(),
        directorName: directorName.trim(),
        businessLogo: businessLogo.trim(),
        directorPhoto: directorPhoto.trim(),
        primaryColor: normalizeHex(primaryColor),
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
      setDirectorPhoto(updated.directorPhoto || '');
      const savedColor = updated.primaryColor && isValidHex(updated.primaryColor) ? normalizeHex(updated.primaryColor) : DEFAULT_PRIMARY_COLOR;
      setPrimaryColor(savedColor);

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

      // Refresh global branding context
      branding.setBusinessName(updated.businessName || 'Nexus ERP');
      branding.setBusinessLogo(updated.businessLogo || '');
      branding.setDirectorPhoto(updated.directorPhoto || '');
      branding.applyThemeColor(savedColor);

      if (user.role === 'Director' || user.id === 'USR-001') {
        onUpdateUser?.({
          name: updated.directorName || user.name,
          profilePhoto: updated.directorPhoto || undefined,
        });
      }

      showToast('Settings Saved', 'Business branding and configuration successfully persisted to MySQL.', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save settings to MySQL.', 'error');
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleCancelBusinessSettings = () => {
    loadBusinessSettings();
    branding.refreshBranding();
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

      onUpdateUser?.({
        name: updated.profileName || user.name,
        email: updated.profileEmail || user.email,
        profilePhoto: updated.profilePhoto || undefined,
      });

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
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50"
              style={{
                backgroundColor: 'var(--primary-color-subtle, #EFF4FF)',
                color: 'var(--primary-color, #1C64FF)',
              }}
            >
              <i className="fa-solid fa-gear text-sm"></i>
            </span>
            System Settings & Branding
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-1">
            Configure business identity, logo branding, theme colors, administrator profile, and role access permissions
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
            className={`flex items-center gap-2 py-4 px-3 sm:px-5 border-b-2 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
            style={
              activeTab === tab.id
                ? {
                    borderBottomColor: 'var(--primary-color, #1C64FF)',
                    color: 'var(--primary-color, #1C64FF)',
                  }
                : undefined
            }
          >
            <i
              className={`${tab.icon} text-xs`}
              style={activeTab === tab.id ? { color: 'var(--primary-color, #1C64FF)' } : undefined}
            ></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BUSINESS SETTINGS */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusinessSettings} className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-8">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Business Configuration & Visual Branding</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage persistent corporate identity, logos, director credentials, brand theme color, and sequence codes
              </p>
            </div>
            {isLoadingBusiness && (
              <span className="text-xs text-blue-600 flex items-center gap-1.5 font-medium">
                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                Loading settings from database...
              </span>
            )}
          </div>

          {/* Section: Brand Identity & Logos */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-palette text-gray-400"></i>
              Brand Identity & Logos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Logo Card */}
              <div className="p-4 sm:p-5 bg-gray-50/70 border border-gray-200/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-gray-900">Business Logo</label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Displays in sidebar navigation, login/signup headers, and reports
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      businessLogo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {businessLogo ? 'Custom Logo' : 'Default Logo'}
                  </span>
                </div>

                {/* Logo Preview Area */}
                <div className="h-28 rounded-xl bg-white border border-dashed border-gray-300 flex items-center justify-center p-4 overflow-hidden relative group">
                  {businessLogo ? (
                    <img
                      src={businessLogo}
                      alt="Business Logo Preview"
                      className="max-h-20 max-w-[200px] object-contain transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Logo size="md" />
                      <span className="text-[11px] text-gray-400 font-medium">Default Nexus ERP branding</span>
                    </div>
                  )}

                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin text-blue-600 text-xl"></i>
                      <span className="text-xs font-medium text-gray-700">Uploading and persisting to server...</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <label
                    className={`px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer inline-flex items-center gap-2 transition-all shadow-2xs ${
                      isUploadingLogo ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <i className="fa-solid fa-upload text-blue-600"></i>
                    {businessLogo ? 'Change Logo' : 'Upload Custom Logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={isUploadingLogo}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {businessLogo && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-rotate-left text-xs"></i>
                      Reset to Default Logo
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  Supported formats: PNG, JPEG, WebP, SVG. Max file size: 5MB. Aspect ratio is preserved.
                </p>
              </div>

              {/* Director's Profile Picture Card */}
              <div className="p-4 sm:p-5 bg-gray-50/70 border border-gray-200/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-gray-900">Director's Profile Picture</label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Associated with Executive Director user account (Dominion / USR-001)
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      directorPhoto ? 'bg-purple-50 text-purple-700' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {directorPhoto ? 'Photo Uploaded' : 'Initials Fallback'}
                  </span>
                </div>

                {/* Director Avatar Preview Area */}
                <div className="h-28 rounded-xl bg-white border border-gray-200 flex items-center gap-4 px-5">
                  <UserAvatar
                    name={directorName || 'Dominion'}
                    photoUrl={directorPhoto}
                    size="xl"
                    showOnlineStatus={true}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{directorName || 'Executive Director'}</p>
                    <p className="text-xs text-gray-500">Executive Director (Dominion)</p>
                    <p className="text-[11px] text-gray-400 mt-1">Appears in top navigation and user account profile</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <label
                    className={`px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer inline-flex items-center gap-2 transition-all shadow-2xs ${
                      isUploadingDirectorPhoto ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <i className="fa-solid fa-camera text-blue-600"></i>
                    {directorPhoto ? 'Change Photo' : 'Upload Director Photo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={isUploadingDirectorPhoto}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDirectorPhotoUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {directorPhoto && (
                    <button
                      type="button"
                      onClick={handleResetDirectorPhoto}
                      className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                      Remove Photo
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  Supported formats: PNG, JPEG, WebP. Clean square/circular portrait recommended.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Configurable Primary Brand Color */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-brush text-gray-400"></i>
                  Primary Brand Color Customization
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customize the application's primary accent color across buttons, active navigation, badges, and focus indicators
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetPrimaryColor}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
              >
                <i className="fa-solid fa-rotate-left text-[11px]"></i>
                Reset to Default
              </button>
            </div>

            <div className="p-5 bg-gray-50/70 border border-gray-200/80 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Color Input Controls */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    {/* Native Color Picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={isValidHex(primaryColor) ? normalizeHex(primaryColor) : DEFAULT_PRIMARY_COLOR}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-11 h-11 rounded-xl border border-gray-300 p-0.5 cursor-pointer bg-white shadow-2xs"
                        title="Pick brand color"
                      />
                    </div>

                    {/* Editable Hex Code Field */}
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-mono">
                          #
                        </span>
                        <input
                          type="text"
                          value={primaryColor.replace(/^#/, '')}
                          onChange={(e) => {
                            const val = '#' + e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                            handleColorChange(val);
                          }}
                          maxLength={8}
                          placeholder="1C64FF"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-semibold text-gray-900 uppercase focus:outline-none focus:border-blue-500 transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Hex format (e.g. <span className="font-mono">#1C64FF</span>, <span className="font-mono">#059669</span>, <span className="font-mono">#D97706</span>)
                  </p>
                </div>

                {/* Live Preview Component Card */}
                <div className="md:col-span-2 p-4 bg-white border border-gray-200/80 rounded-xl space-y-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Live Component Preview
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Primary Button Preview */}
                    <button
                      type="button"
                      style={{ backgroundColor: isValidHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY_COLOR }}
                      className="px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition-opacity hover:opacity-90 flex items-center gap-2 cursor-default"
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                      Primary Action Button
                    </button>

                    {/* Subtle Badge Preview */}
                    <span
                      style={{
                        backgroundColor: lightenHex(isValidHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY_COLOR, 88),
                        color: isValidHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY_COLOR,
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-circle text-[6px]"></i>
                      Active Navigation Item
                    </span>

                    {/* Accent Icon Box */}
                    <div
                      style={{
                        backgroundColor: lightenHex(isValidHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY_COLOR, 88),
                        color: isValidHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY_COLOR,
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    >
                      <i className="fa-solid fa-cube"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preset Palette Swatches */}
              <div className="space-y-2 pt-2 border-t border-gray-200/60">
                <span className="text-[11px] font-semibold text-gray-600 block">
                  Executive Preset Swatches
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {PRESET_BRAND_COLORS.map((preset) => {
                    const isSelected =
                      isValidHex(primaryColor) &&
                      normalizeHex(primaryColor).toUpperCase() === preset.hex.toUpperCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleColorChange(preset.hex)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-white border-gray-900 ring-2 ring-gray-900 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="w-5 h-5 rounded-lg shadow-2xs shrink-0"
                            style={{ backgroundColor: preset.hex }}
                          />
                          {isSelected && <i className="fa-solid fa-check text-[10px] text-gray-900"></i>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-gray-900 truncate">{preset.name}</p>
                          <p className="text-[9px] font-mono text-gray-400 uppercase">{preset.hex}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Entity Information */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-building text-gray-400"></i>
              Company Entity Details
            </h3>

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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Director / Executive Name</label>
                <input
                  type="text"
                  placeholder="Executive Director / Owner"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
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
          </div>

          {/* Dedicated Sequential ID Prefix Configuration */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Sequential ID Prefix Configuration</h3>
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
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  placeholder="INV"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client Prefix</label>
                <input
                  type="text"
                  value={clientPrefix}
                  onChange={(e) => setClientPrefix(e.target.value.toUpperCase())}
                  placeholder="CL"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Expense Prefix</label>
                <input
                  type="text"
                  value={expensePrefix}
                  onChange={(e) => setExpensePrefix(e.target.value.toUpperCase())}
                  placeholder="EXP"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category Prefix</label>
                <input
                  type="text"
                  value={categoryPrefix}
                  onChange={(e) => setCategoryPrefix(e.target.value.toUpperCase())}
                  placeholder="EC"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Code</label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="IPHIN"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
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
              style={{ backgroundColor: isValidHex(primaryColor) ? primaryColor : undefined }}
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
              <h2 className="text-base font-semibold text-gray-900">User Profile Information</h2>
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
              <UserAvatar
                name={profileName || user.name}
                photoUrl={profilePhoto}
                size="xl"
                showOnlineStatus={true}
              />
              <label className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center cursor-pointer text-xs">
                {isUploadingProfilePhoto ? (
                  <i className="fa-solid fa-spinner fa-spin text-white"></i>
                ) : (
                  <i className="fa-solid fa-camera"></i>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={isUploadingProfilePhoto}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfilePhotoUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-semibold text-gray-900">{profileName || user.name}</h3>
              <p className="text-xs text-gray-500">{profileEmail || user.email}</p>
              <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label className={`px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs ${isUploadingProfilePhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploadingProfilePhoto ? (
                    <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                  ) : (
                    <i className="fa-solid fa-upload text-blue-600"></i>
                  )}
                  {isUploadingProfilePhoto ? 'Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isUploadingProfilePhoto}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProfilePhotoUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                {profilePhoto && (
                  <button
                    type="button"
                    onClick={handleRemoveProfilePhoto}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                    Remove Photo
                  </button>
                )}

                <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-purple-50 text-purple-700">
                  {user.role} Access
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-emerald-50 text-emerald-700">
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
              style={{ backgroundColor: isValidHex(primaryColor) ? primaryColor : undefined }}
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
              <h2 className="text-base font-semibold text-gray-900">Role Management & Permissions</h2>
              <p className="text-xs text-gray-500 mt-0.5">Toggle granular module permissions per organizational role and assign roles to users in MySQL</p>
            </div>
            <button
              onClick={handleSaveRoleMatrix}
              disabled={isSavingRoles}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
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
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Module Permissions Matrix</h3>
            {[
              { role: 'Director', desc: 'Full Access across all system modules, finances, branches, and security settings.', badgeStyle: 'bg-purple-50 text-purple-700' },
              { role: 'Manager', desc: 'Access to Dashboard, CRM, Operations, Reports, and Finance modules.', badgeStyle: 'bg-blue-50 text-blue-700' },
              { role: 'Receptionist', desc: 'Front-desk access restricted to Bookings, CRM, and Daily Logger operations.', badgeStyle: 'bg-amber-50 text-amber-700' },
              { role: 'Accountant', desc: 'Finance access restricted to General Ledger, Expenses, and Financial Reports.', badgeStyle: 'bg-emerald-50 text-emerald-700' },
            ].map(({ role, desc, badgeStyle }) => (
              <div key={role} className="border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-4 bg-gray-50/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-lg uppercase tracking-wider ${badgeStyle}`}>
                      {role}
                    </span>
                    <p className="text-xs text-gray-500 font-sans">{desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-200/60">
                  {[
                    { key: 'dashboard', label: 'Dashboard' },
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
                        <span className="text-xs font-medium text-gray-800">{label}</span>
                        <div
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                            isChecked ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          style={isChecked ? { backgroundColor: isValidHex(primaryColor) ? primaryColor : undefined } : undefined}
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
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">User Role Assignments</h3>
              <p className="text-xs text-gray-500 mt-0.5">Assign and manage system security access roles directly for registered system accounts in MySQL</p>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium uppercase tracking-wider text-[11px]">
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
                        <td className="py-3 px-4 font-medium text-gray-900 flex items-center gap-2.5">
                          <UserAvatar name={u.name} photoUrl={u.profilePhoto} size="xs" />
                          <span>{u.name}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 w-44">
                          <CustomSelect
                            options={roleAssignmentOptions}
                            value={u.role}
                            onChange={(val) => handleUserRoleChange(u.id, val as AdminUser['role'])}
                            className="!py-1.5 !px-3"
                          />
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
