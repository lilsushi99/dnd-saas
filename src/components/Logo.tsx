import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Modern Precision Enterprise Icon */}
      <div
        className={`${iconDimensions[size]} bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0 transition-transform hover:scale-[1.02]`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/5 h-3/5"
        >
          <path
            d="M4 8C4 6.89543 4.89543 6 6 6H12C13.1046 6 14 6.89543 14 8V14C14 15.1046 13.1046 16 12 16H6C4.89543 16 4 15.1046 4 14V8Z"
            fill="currentColor"
            fillOpacity="0.9"
          />
          <path
            d="M10 10C10 8.89543 10.8954 8 12 8H18C19.1046 8 20 8.89543 20 10V16C20 17.1046 19.1046 18 18 18H12C10.8954 18 10 17.1046 10 16V10Z"
            fill="currentColor"
            fillOpacity="0.45"
          />
        </svg>
      </div>

      {variant === 'full' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-heading font-bold tracking-tight text-gray-900 ${textSizes[size]}`}
            >
              Nexus
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 tracking-wider uppercase border border-blue-100">
              ERP
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
