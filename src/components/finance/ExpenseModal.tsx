import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense?: Expense | null;
  categories?: ExpenseCategory[];
  onSubmit: (data: {
    name: string;
    amount: number;
    date: string;
    branch: string;
    category: string;
    description?: string;
  }) => Promise<void>;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  editingExpense,
  categories = [],
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [branch, setBranch] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      AdminApiService.fetchBranches()
        .then((bList) => {
          setBranches(bList);
          if (!editingExpense && bList.length > 0 && !branch) {
            setBranch(bList[0].name);
          }
        })
        .catch((err) => console.error('Error fetching branches:', err));
    }
  }, [isOpen, editingExpense]);

  useEffect(() => {
    if (editingExpense) {
      setName(editingExpense.name);
      setAmount(editingExpense.amount);
      setDate(editingExpense.date);
      setBranch(editingExpense.branch);
      setCategory(editingExpense.category);
      setDescription(editingExpense.description || '');
    } else {
      setName('');
      setAmount('');
      setDate(new Date().toISOString().substring(0, 10));
      setBranch(branches.length > 0 ? branches[0].name : '');
      setCategory(categories.length > 0 ? categories[0].name : '');
      setDescription('');
    }
  }, [editingExpense, isOpen, categories, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Expense Name is required.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        amount: Number(amount),
        date,
        branch: branch || (branches.length > 0 ? branches[0].name : ''),
        category: category || (categories.length > 0 ? categories[0].name : ''),
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden transform transition-all font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <i className="fa-solid fa-receipt text-lg"></i>
            </div>
            <div>
              <h3 className="font-heading font-bold text-gray-900 text-lg">
                {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {editingExpense ? `Update details for ${editingExpense.id}` : 'Add financial ledger transaction record'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-sm"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Expense ID (Auto)
              </label>
              <input
                type="text"
                disabled
                value={editingExpense ? editingExpense.id : 'EXP-IPHIN-2026-AUTO'}
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 cursor-not-allowed font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Expense Name / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. High-Speed Fiber Optics Internet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Amount (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                  ₦
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white border border-gray-300 rounded-xl pl-8 pr-3.5 py-2 text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Expense Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {category && !categories.some((c) => c.name === category) && (
                  <option value={category}>{category}</option>
                )}
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  !category && <option value="">No categories found</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Branch Allocation *
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
            >
              {branch && !branches.some((b) => b.name === branch) && branch !== 'Both Branches' && (
                <option value={branch}>{branch}</option>
              )}
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
              {branches.length > 1 && (
                <option value="Both Branches">All / Shared Across Branches (Split)</option>
              )}
              {branches.length === 0 && !branch && (
                <option value="">No branches found</option>
              )}
            </select>
            {branch === 'Both Branches' && (
              <p className="mt-1.5 text-xs text-blue-600 font-medium flex items-center gap-1.5 bg-blue-50 p-2 rounded-lg border border-blue-100">
                <i className="fa-solid fa-scale-balanced text-blue-500"></i>
                Expense will be split equally across enterprise branches in reports.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Provide context or receipt details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> {editingExpense ? 'Update Expense' : 'Save Expense'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
