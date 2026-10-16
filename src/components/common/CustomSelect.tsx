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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  // Determine dropdown orientation when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Reset highlighted index when opening/closing
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => String(opt.id) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, value, options]);

  // Close on outside click or keyboard navigation (Escape, Arrows, Enter)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if (
          containerRef.current &&
          containerRef.current.contains(document.activeElement) &&
          (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')
        ) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : options.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].id);
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, highlightedIndex, options, onChange]);

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
        <div
          className={`absolute left-0 right-0 z-50 bg-white rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 select-none ${
            openUpwards ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">
              No options available
            </div>
          ) : (
            options.map((opt, idx) => {
              const isSelected = String(opt.id) === String(value);
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : isHighlighted
                      ? 'bg-blue-50/70 text-blue-700 font-medium'
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
