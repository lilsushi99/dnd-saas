import React, { useState } from 'react';
import { useFacilities, useBranches } from '../../hooks/useAdmin';
import { Facility } from '../../types';
import { FacilityModal } from './FacilityModal';

export const FacilitiesPage: React.FC = () => {
  const { facilities, loading, error, createFacility, updateFacility, deleteFacility } = useFacilities();
  const { branches } = useBranches();

  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.branchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'all' || f.branchId === branchFilter;
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingFacility(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this facility record?')) {
      await deleteFacility(id);
    }
  };

  const handleModalSubmit = async (data: { name: string; branchId: string; defaultPrice?: number; capacity: number; status: 'Active' | 'Inactive' }) => {
    if (editingFacility) {
      await updateFacility(editingFacility.id, data);
    } else {
      await createFacility(data);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-gray-200/80 rounded-2xl shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-heading flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <i className="fa-solid fa-house-signal text-sm"></i>
            </span>
            Facilities & Spaces
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-1">
            Manage bookable space units, default standard pricing, and branch assignments
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
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
            <p className="text-2xl font-bold text-gray-900 font-heading mt-1">{facilities.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <i className="fa-solid fa-door-open text-sm"></i>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Active Facilities</p>
            <p className="text-2xl font-bold text-emerald-600 font-heading mt-1">
              {facilities.filter((f) => f.status === 'Active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <i className="fa-solid fa-circle-check text-sm"></i>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Configured Branches</p>
            <p className="text-2xl font-bold text-blue-600 font-heading mt-1">{branches.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
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

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-purple-500 transition-all cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-purple-500 transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
                  <th className="px-6 py-3.5">Default Price</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFacilities.map((facility) => (
                  <tr key={facility.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 font-heading">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center text-xs">
                          <i className="fa-solid fa-border-all"></i>
                        </div>
                        <div>
                          <div>{facility.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal font-sans">{facility.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                        <i className="fa-solid fa-building text-gray-400 text-[10px]"></i>
                        {facility.branchName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-100 font-mono">
                        <i className="fa-solid fa-users text-purple-500 text-[10px]"></i>
                        {facility.capacity || 5} Max
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {facility.defaultPrice !== undefined && facility.defaultPrice !== null ? (
                        <span className="font-semibold text-gray-900">${facility.defaultPrice.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400 italic font-sans text-[11px]">Negotiable / Custom</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {facility.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
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
                          onClick={() => handleDelete(facility.id)}
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

      {/* Modal */}
      <FacilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingFacility}
        branches={branches}
      />
    </div>
  );
};
