import React, { useState, useEffect } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { ExpenseModal } from './ExpenseModal';
import { Expense, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

interface ExpensesPageProps {
  branchFilter?: string;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ branchFilter = 'all' }) => {
  const {
    expenses,
    summary,
    categories,
    loading,
    error,
    search,
    setSearch,
    branch,
    setBranch,
    dateFilter,
    setDateFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    category,
    setCategory,
    addExpense,
    editExpense,
    deleteExpense,
    refresh,
  } = useExpenses(branchFilter);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [dbBranches, setDbBranches] = useState<Branch[]>([]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, branch, dateFilter, startDate, endDate, category]);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setDbBranches(bList))
      .catch((err) => console.error('Error fetching branches in ExpensesPage:', err));
  }, []);

  const branches = [
    { id: 'all', label: 'All Branches' },
    ...dbBranches.map((b) => ({ id: b.name, label: b.name })),
    ...(dbBranches.length > 1 ? [{ id: 'Both Branches', label: 'All / Shared Across Branches (Split)' }] : []),
  ];

  const periodOptions = [
    { id: 'today', label: 'Today' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_12_months', label: 'Last 12 Months' },
    { id: 'custom', label: 'Custom Range' },
    { id: 'all', label: 'All Time' },
  ];

  const branchFilterOptions = branches.map((b) => ({
    id: b.id,
    label: b.label,
  }));

  const categoryFilterOptions = [
    { id: 'all', label: 'All Categories' },
    ...categories.map((c) => ({ id: c.name, label: c.name })),
  ];

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!expenses.length) return;
    const headers = ['Expense ID', 'Date', 'Expense Name', 'Category', 'Branch', 'Amount (₦)', 'Created By', 'Description'];
    const rows = expenses.map((e) => [
      e.id,
      e.date,
      `"${e.name.replace(/"/g, '""')}"`,
      e.category,
      e.branch,
      e.amount,
      `"${e.createdBy.replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expense_Report_${branch}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!expenses.length) return;
    const headers = ['Expense ID', 'Date', 'Expense Name', 'Category', 'Branch', 'Amount (₦)', 'Created By', 'Description'];
    const rows = expenses.map((e) => [
      e.id,
      e.date,
      e.name,
      e.category,
      e.branch,
      e.amount,
      e.createdBy,
      e.description || '',
    ]);

    const content = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Expense_Report_${branch}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Section Header */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
          Expenses Management
        </h2>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-600 text-sm"></i>
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-600 text-sm"></i>
            Export Excel
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            New Expense
          </button>
        </div>
      </div>

      {/* 1. GLOBAL FILTER BAR (ABOVE KPI CARDS) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Controls: Date Filter, Branch, Category */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter Dropdown */}
          <div className="w-40">
            <CustomSelect
              options={periodOptions}
              value={dateFilter}
              onChange={(val) => setDateFilter(String(val))}
              icon="fa-solid fa-calendar"
            />
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl">
              <div className="w-32">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start Date"
                />
              </div>
              <span className="text-xs text-gray-400 font-medium">to</span>
              <div className="w-32">
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="End Date"
                />
              </div>
            </div>
          )}

          {/* Branch Filter */}
          <div className="w-48">
            <CustomSelect
              options={branchFilterOptions}
              value={branch}
              onChange={(val) => setBranch(String(val))}
              icon="fa-solid fa-building"
            />
          </div>

          {/* Dynamic Category Filter */}
          <div className="w-48">
            <CustomSelect
              options={categoryFilterOptions}
              value={category}
              onChange={(val) => setCategory(String(val))}
              icon="fa-solid fa-tags"
            />
          </div>
        </div>

        {/* Right Search Input */}
        <div className="relative w-full lg:w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search expenses by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-gray-400 transition-all font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
            >
              <i className="fa-solid fa-circle-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* 2. FOUR KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Expenses */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <i className="fa-solid fa-calendar-day text-sm"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-gray-900 tracking-tight">
              ₦{summary.todaysExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI 2: Average Monthly Expenses */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Average Monthly Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <i className="fa-solid fa-calculator text-sm"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-gray-900 tracking-tight">
              ₦{summary.averageMonthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Expenses */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <i className="fa-solid fa-receipt text-sm"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-gray-900 tracking-tight">
              ₦{summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI 4: Payroll (Coming Soon) */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payroll</span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200/60 flex items-center gap-1">
                <i className="fa-solid fa-lock text-[8px]"></i>
                Coming Soon
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center text-sm">
              <i className="fa-solid fa-users-gear"></i>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-gray-400 tracking-tight">
              ₦0.00
            </span>
            <span className="text-[11px] text-gray-400 font-normal">Module in development</span>
          </div>
        </div>
      </div>

      {/* 3. EXPENSE TABLE */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <i className="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i>
            <p className="text-xs font-semibold text-gray-500 mt-2">Loading expense records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-xs font-semibold flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation text-base"></i>
              <span>{error}</span>
            </div>
            <button
              onClick={() => refresh()}
              className="mt-1 px-3 py-1 bg-white border border-red-300 rounded-lg text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-xl mb-3">
              <i className="fa-solid fa-receipt"></i>
            </div>
            <h4 className="font-medium text-gray-800 text-sm">No expenses found</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No expense records match your active search and filter criteria. Click "New Expense" to log one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Expense ID</th>
                  <th className="py-3.5 px-5">Expense Title</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Branch Allocation</th>
                  <th className="py-3.5 px-5 text-right">Amount (₦)</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Created By</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {expenses
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((e) => {
                  const isSplit = e.branch === 'Both Branches';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-medium text-blue-700 whitespace-nowrap">{e.id}</td>
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-gray-900">{e.name}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium text-xs inline-block">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            isSplit
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {isSplit && <i className="fa-solid fa-code-branch text-[10px]"></i>}
                          {e.branch}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-semibold text-gray-900 text-sm whitespace-nowrap">
                        ₦{e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {isSplit && branch !== 'all' && branch !== 'Both Branches' && (
                          <span className="block text-[10px] text-purple-600 font-normal">
                            (Split: ₦{(e.amount / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-gray-600 whitespace-nowrap">{e.date}</td>
                      <td className="py-3.5 px-5 text-gray-600 font-medium whitespace-nowrap">{e.createdBy || 'Admin'}</td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedExpense(e)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <i className="fa-solid fa-circle-info text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(e)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Expense"
                          >
                            <i className="fa-solid fa-pen-to-square text-sm"></i>
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(e)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Void / Delete Expense"
                          >
                            <i className="fa-solid fa-trash text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {expenses.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing{' '}
              <strong className="text-gray-900">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-gray-900">
                {Math.min(currentPage * pageSize, expenses.length)}
              </strong>{' '}
              of <strong className="text-gray-900">{expenses.length}</strong> expenses
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-chevron-left mr-1"></i>
                Previous
              </button>

              <span className="px-2 text-xs font-medium text-gray-700">
                Page {currentPage} of {Math.ceil(expenses.length / pageSize) || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= Math.ceil(expenses.length / pageSize)}
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(Math.ceil(expenses.length / pageSize), p + 1)
                  )
                }
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <i className="fa-solid fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expense Detail Drawer / Modal View */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="font-mono text-xs font-medium text-blue-600">{selectedExpense.id}</span>
                <h3 className="text-lg font-semibold text-gray-900">{selectedExpense.name}</h3>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-medium text-gray-500">Amount:</span>
                <span className="font-semibold text-gray-900 text-sm">
                  ₦{selectedExpense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-medium text-gray-500">Expense Date:</span>
                <span className="font-semibold text-gray-800">{selectedExpense.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-medium text-gray-500">Category:</span>
                <span className="font-semibold text-gray-800">{selectedExpense.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-medium text-gray-500">Branch:</span>
                <span className="font-semibold text-blue-700">{selectedExpense.branch}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-medium text-gray-500">Created By:</span>
                <span className="font-semibold text-gray-800">{selectedExpense.createdBy}</span>
              </div>
              {selectedExpense.description && (
                <div className="pt-2">
                  <span className="font-medium text-gray-500 block mb-1">Description:</span>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-800 font-normal">
                    {selectedExpense.description}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  const expToEdit = selectedExpense;
                  setSelectedExpense(null);
                  handleOpenEditModal(expToEdit);
                }}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-pen-to-square"></i>
                Edit Expense
              </button>
              <button
                onClick={() => {
                  const expToDelete = selectedExpense;
                  setSelectedExpense(null);
                  setExpenseToDelete(expToDelete);
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-trash"></i>
                Delete
              </button>
              <button
                onClick={() => setSelectedExpense(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Void Expense Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm p-6 font-sans space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-semibold text-gray-900">Delete Expense Record?</h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to delete <strong className="text-gray-800">{expenseToDelete.name}</strong> ({expenseToDelete.id}) for{' '}
                <strong className="text-gray-800">₦{expenseToDelete.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>? This action will permanently remove the record and update financial summaries.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteExpense(expenseToDelete.id);
                    setExpenseToDelete(null);
                    refresh();
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete expense');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                ) : (
                  <i className="fa-solid fa-trash text-xs"></i>
                )}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal Form (Add & Edit) */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingExpense={editingExpense}
        categories={categories}
        onSubmit={async (data) => {
          if (editingExpense) {
            await editExpense(editingExpense.id, data);
          } else {
            await addExpense(data);
          }
          refresh();
        }}
      />
    </div>
  );
};
