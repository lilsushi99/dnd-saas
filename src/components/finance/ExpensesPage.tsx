import React, { useState, useEffect } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { ExpenseModal } from './ExpenseModal';
import { Expense, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';

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
    refresh,
  } = useExpenses(branchFilter);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [dbBranches, setDbBranches] = useState<Branch[]>([]);

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
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Expenses Management
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Record, monitor, and split operational expenditures across facility hubs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-600 text-sm"></i>
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-600 text-sm"></i>
            Export Excel
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 uppercase tracking-wider cursor-pointer"
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <i className="fa-solid fa-calendar text-blue-600 text-xs"></i>
              Period:
            </span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_12_months">Last 12 Months</option>
              <option value="custom">Custom Range</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl border border-blue-100">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-900 font-medium focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-900 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <i className="fa-solid fa-building text-indigo-600 text-xs"></i>
              Branch:
            </span>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <i className="fa-solid fa-tags text-purple-600 text-xs"></i>
              Category:
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
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
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <i className="fa-solid fa-calendar-day text-sm"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
              ₦{summary.todaysExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live daily ledger log
            </p>
          </div>
        </div>

        {/* KPI 2: Average Monthly Expenses */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average Monthly Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <i className="fa-solid fa-calculator text-sm"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
              ₦{summary.averageMonthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-gray-500 font-medium mt-1">Calculated across active months</p>
          </div>
        </div>

        {/* KPI 3: Total Expenses */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <i className="fa-solid fa-receipt text-sm"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
              ₦{summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-gray-500 font-medium mt-1">
              Filter period cumulative total
            </p>
          </div>
        </div>

        {/* KPI 4: Payroll */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payroll</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <i className="fa-solid fa-users-gear text-sm"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
              ₦{(summary.payrollExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-gray-500 font-medium mt-1">
              {summary.payrollExpenses && summary.payrollExpenses > 0
                ? 'Aggregated payroll & staff disbursements'
                : 'No payroll records logged for period'}
            </p>
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
          <div className="p-8 text-center text-red-600 text-xs font-semibold">
            <i className="fa-solid fa-triangle-exclamation text-lg mb-1 block"></i>
            {error}
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto text-xl mb-3">
              <i className="fa-solid fa-receipt"></i>
            </div>
            <h4 className="font-heading font-bold text-gray-800 text-sm">No expenses found</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No expense records match your active search and filter criteria. Click "New Expense" to log one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider font-heading">
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
                {expenses.map((e) => {
                  const isSplit = e.branch === 'Both Branches';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-blue-700">{e.id}</td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-gray-900">{e.name}</div>
                        {e.description && (
                          <div className="text-[11px] text-gray-400 max-w-xs truncate mt-0.5">
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-semibold text-[11px] border border-gray-200 inline-block">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isSplit
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isSplit && <i className="fa-solid fa-code-branch text-[10px]"></i>}
                          {e.branch}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-heading font-bold text-gray-900 text-sm">
                        ₦{e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {isSplit && branch !== 'all' && branch !== 'Both Branches' && (
                          <span className="block text-[10px] text-purple-600 font-normal">
                            (Split: ₦{(e.amount / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-gray-600 whitespace-nowrap">{e.date}</td>
                      <td className="py-3.5 px-5 text-gray-600 font-medium">{e.createdBy || 'Admin'}</td>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Detail Drawer / Modal View */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">{selectedExpense.id}</span>
                <h3 className="font-heading text-lg font-bold text-gray-900">{selectedExpense.name}</h3>
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
                <span className="font-bold text-gray-900 text-sm">
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
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-pen-to-square"></i>
                Edit Expense
              </button>
              <button
                onClick={() => setSelectedExpense(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
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
