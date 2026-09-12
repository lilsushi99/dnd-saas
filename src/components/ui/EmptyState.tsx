import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'fa-solid fa-folder-open',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-2xs space-y-4 max-w-lg mx-auto font-sans my-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 flex items-center justify-center mx-auto text-xl shadow-2xs">
        <i className={icon}></i>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-gray-900 font-heading">
          {title}
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto font-sans leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="pt-2 flex items-center justify-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              {secondaryActionLabel}
            </button>
          )}

          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
