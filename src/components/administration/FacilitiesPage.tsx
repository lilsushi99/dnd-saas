import React, { useState } from 'react';
import { useFacilities, useBranches } from '../../hooks/useAdmin';
import { Facility } from '../../types';
import { FacilityModal } from './FacilityModal';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { useToast } from '../../context/ToastContext';

const statusOptions: SelectOption[] = [
  { id: 'all', label: 'All Status' },
  { id: 'Active', label: 'Active' },
  { id: 'Inactive', label: 'Inactive' },
];

export const FacilitiesPage: React.FC = () => {
  const { facilities, loading, error, createFacility, updateFacility, deleteFacility } = useFacilities();
  const { branches } = useBranches();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  // In-app Delete confirmation state
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.branchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'all' || f.branchId === branchFilter;
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  const branchOptions: SelectOption[] = [
    { id: 'all', label: 'All Branches' },
    ...branches.map((b) => ({ id: b.id, label: b.name })),
  ];

  const handleOpenCreate = () => {
    setEditingFacility(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (facility: Facility) => {
    setFacilityToDelete(facility);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!facilityToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteFacility(facilityToDelete.id);
      showToast('Facility Deleted', `Facility "${facilityToDelete.name}" deleted successfully.`, 'success');
      setFacilityToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete facility.');
      showToast('Cannot Delete Facility', err.message || 'Facility has dependencies and cannot be deleted.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!facilityToDelete) return;
    try {
      await updateFacility(facilityToDelete.id, { status: 'Inactive' });
      showToast('Facility Deactivated', `Facility "${facilityToDelete.name}" has been deactivated to preserve booking history.`, 'info');
      setFacilityToDelete(null);
      setDeleteError(null);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to deactivate facility.', 'error');
    }
  };

  const handleToggleStatus = async (facility: Facility) => {
    const newStatus = facility.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateFacility(facility.id, { status: newStatus });
      showToast('Status Updated', `Facility "${facility.name}" is now ${newStatus}.`, newStatus === 'Active' ? 'success' : 'info');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update facility status.', 'error');
    }
  };

  const handleModalSubmit = async (data: {
    name: string;
    branchId: string;
    defaultPrice?: number;
    capacity: number;
    status: 'Active' | 'Inactive';
    pricingBasis: 'Per Hour' | 'Per Day';
  }) => {
    try {
      if (editingFacility) {
        await updateFacility(editingFacility.id, data);
        showToast('Facility Updated', `Facility "${data.name}" updated successfully.`, 'success');
      } else {
        await createFacility(data);
        showToast('Facility Created', `New facility "${data.name}" created successfully.`, 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save facility.', 'error');
      throw err;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-gray-200/80 rounded-2xl shadow-2xs">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <i className="fa-solid fa-house-signal text-sm"></i>
            </span>
            Facilities & Spaces
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage bookable space units, default standard pricing, pricing basis, and branch assignments
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Create Facility
        </button>
      </div>

      {/* KPI Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Facilities</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{facilities.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <i className="fa-solid fa-door-open text-sm"></i>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Active Facilities</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-1">
              {facilities.filter((f) => f.status === 'Active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <i className="fa-solid fa-circle-check text-sm"></i>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Configured Branches</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">{branches.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-code-branch text-sm"></i>
          </div>
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div className="bg-white p-4 border border-gray-200/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility or branch..."
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="w-full sm:w-44">
            <CustomSelect
              options={branchOptions}
              value={branchFilter}
              onChange={(val) => setBranchFilter(String(val))}
              icon="fa-solid fa-code-branch"
            />
          </div>

          <div className="w-full sm:w-36">
            <CustomSelect
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              icon="fa-solid fa-filter"
            />
          </div>
        </div>
      </div>

      {/* Facilities Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-purple-600 mb-2 block"></i>
            Loading facility records...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-xs">
            <i className="fa-solid fa-triangle-exclamation text-lg mb-2 block"></i>
            {error}
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-door-closed text-2xl mb-2 block text-gray-300"></i>
            No facilities found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 font-sans">
              <thead className="bg-gray-50/75 border-b border-gray-200/80 font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Facility</th>
                  <th className="px-6 py-3.5">Branch</th>
                  <th className="px-6 py-3.5">Capacity</th>
                  <th className="px-6 py-3.5">Pricing</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFacilities.map((facility) => (
                  <tr key={facility.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
                          <i className="fa-solid fa-border-all"></i>
                        </div>
                        <div>
                          <div>{facility.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal font-sans">{facility.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-normal text-gray-700">
                        <i className="fa-solid fa-building text-gray-400 text-[10px]"></i>
                        {facility.branchName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium font-mono">
                        <i className="fa-solid fa-users text-purple-500 text-[10px]"></i>
                        {facility.capacity || 5} Max
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {facility.defaultPrice !== undefined && facility.defaultPrice !== null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-gray-900">${Number(facility.defaultPrice).toLocaleString()}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-normal">
                            {facility.pricingBasis || 'Per Day'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Negotiable / Custom</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {facility.status === 'Active' ? (
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
                          onClick={() => handleOpenEdit(facility)}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 border border-gray-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit Facility"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(facility)}
                          className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            facility.status === 'Active'
                              ? 'text-amber-700 hover:bg-amber-50 border-amber-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          }`}
                          title={facility.status === 'Active' ? 'Deactivate Facility' : 'Activate Facility'}
                        >
                          <i className={`fa-solid ${facility.status === 'Active' ? 'fa-ban' : 'fa-circle-check'}`}></i>
                          {facility.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleOpenDelete(facility)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Delete Facility"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                          Delete
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

      {/* Edit / Create Modal */}
      <FacilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingFacility}
        branches={branches}
      />

      {/* In-App Delete Confirmation Modal */}
      {facilityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fadeIn font-sans">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-triangle-exclamation text-base"></i>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Delete Facility: {facilityToDelete.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {facilityToDelete.id} — {facilityToDelete.branchName}
                  </p>
                </div>
              </div>

              {deleteError ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <i className="fa-solid fa-circle-exclamation text-amber-600 text-sm mt-0.5 shrink-0"></i>
                    <div>
                      <p className="font-semibold text-amber-900 mb-1">Permanent Deletion Blocked</p>
                      <p>{deleteError}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    To keep historical booking reports and client receipts intact, deactivate this facility instead of permanently deleting it.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to permanently delete <strong>{facilityToDelete.name}</strong>? If this facility has any past or active bookings or subscriptions, permanent deletion will be prevented to protect historical records.
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFacilityToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {deleteError ? (
                <button
                  type="button"
                  onClick={handleDeactivateInstead}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-ban text-xs"></i>
                  Deactivate Facility Instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      Checking Dependencies...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-trash-can text-xs"></i>
                      Confirm Delete
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
