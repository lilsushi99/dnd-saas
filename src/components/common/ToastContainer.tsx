import React from 'react';
import { useToast, ToastMessage } from '../../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const getToastIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <i className="fa-solid fa-circle-check text-emerald-500 text-base"></i>;
      case 'error':
        return <i className="fa-solid fa-circle-xmark text-red-500 text-base"></i>;
      case 'warning':
        return <i className="fa-solid fa-triangle-exclamation text-amber-500 text-base"></i>;
      case 'info':
      default:
        return <i className="fa-solid fa-circle-info text-blue-500 text-base"></i>;
    }
  };

  const getBorderColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-white';
      case 'error':
        return 'border-red-200 bg-white';
      case 'warning':
        return 'border-amber-200 bg-white';
      case 'info':
      default:
        return 'border-blue-200 bg-white';
    }
  };

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-sans">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 border rounded-2xl shadow-xl transition-all duration-200 animate-in slide-in-from-top-4 fade-in ${getBorderColor(
            toast.type
          )}`}
        >
          <div className="shrink-0 mt-0.5">{getToastIcon(toast.type)}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-900 font-heading leading-tight">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed font-sans">
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer text-xs shrink-0"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      ))}
    </div>
  );
};
