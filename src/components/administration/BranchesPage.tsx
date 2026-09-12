import React, { useState } from 'react';
import { useBranches } from '../../hooks/useAdmin';
import { Branch } from '../../types';
import { BranchModal } from './BranchModal';

export const BranchesPage: React.FC = () => {
  const { branches, loading, error, createBranch, updateBranch, toggleBranchStatus } = useBranches();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = branches.filter((b) => b.status === 'Active').length;
  const inactiveCount = branches.filter((b) => b.status === 'Inactive').length;

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: { name: string; location: string; status: 'Active' | 'Inactive' }) => {
    if (editingBranch) {
      await updateBranch(editingBranch.id, data);
    } else {
      await createBranch(data);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-gray-200/80 rounded-2xl shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-heading flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <i className="fa-solid fa-code-branch text-sm"></i>
            </span>
            Branches Management
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-1">
            Configure regional office branches, location records, and operational status
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Create Branch
        </button>
      </div>

      {/* KPI Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Branches</p>
            <p className="text-2xl font-bold text-gray-900 font-heading mt-1">{branches.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <i className="fa-solid fa-building text-sm"></i>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Active Branches</p>
            <p className="text-2xl font-bold text-emerald-600 font-heading mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <i className="fa-solid fa-circle-check text-sm"></i>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Inactive Branches</p>
            <p className="text-2xl font-bold text-gray-500 font-heading mt-1">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center">
            <i className="fa-solid fa-ban text-sm"></i>
          </div>
        </div>
      </div>

      {/* Controls: Search & Filter */}
      <div className="bg-white p-4 border border-gray-200/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search branch name or location..."
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-medium text-gray-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-blue-600 mb-2 block"></i>
            Loading branch entries...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-xs">
            <i className="fa-solid fa-triangle-exclamation text-lg mb-2 block"></i>
            {error}
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-building-circle-xmark text-2xl mb-2 block text-gray-300"></i>
            No branches match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 font-sans">
              <thead className="bg-gray-50/75 border-b border-gray-200/80 font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Branch Name</th>
                  <th className="px-6 py-3.5">Location / Address</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 font-heading">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 text-xs">
                          <i className="fa-solid fa-building"></i>
                        </div>
                        <div>
                          <div>{branch.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal font-sans">{branch.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      <i className="fa-solid fa-location-dot text-gray-400 mr-1.5"></i>
                      {branch.location}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">
                      {branch.createdDate}
                    </td>
                    <td className="px-6 py-4">
                      {branch.status === 'Active' ? (
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
                          onClick={() => handleOpenEdit(branch)}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit Branch"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          Edit
                        </button>
                        <button
                          onClick={() => toggleBranchStatus(branch.id)}
                          className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            branch.status === 'Active'
                              ? 'text-amber-700 hover:bg-amber-50 border-amber-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          }`}
                          title={branch.status === 'Active' ? 'Deactivate Branch' : 'Activate Branch'}
                        >
                          <i className={`fa-solid ${branch.status === 'Active' ? 'fa-ban' : 'fa-circle-check'}`}></i>
                          {branch.status === 'Active' ? 'Deactivate' : 'Activate'}
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
      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingBranch}
      />
    </div>
  );
};
