import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  id: string | number;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (val: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  icon?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  className = '',
  icon,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  // Close on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative font-sans w-full" ref={containerRef} id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && (
            <i className={`${icon} text-gray-400 group-hover:text-blue-600 transition-colors text-xs`}></i>
          )}
          <span className={`truncate ${selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <i
          className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 select-none">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.id) === String(value);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-blue-50/70 hover:text-blue-700 text-gray-700'
                  }`}
                >
                  <div className="truncate">
                    <span className="block truncate">{opt.label}</span>
                    {opt.subLabel && (
                      <span className="block text-[10px] text-gray-400 font-normal truncate mt-0.5">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <i className="fa-solid fa-check text-[10px] text-blue-600 shrink-0"></i>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
