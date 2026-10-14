import React, { useState, useEffect, useRef } from 'react';

interface MultiDatePickerProps {
  selectedDates: string[]; // Array of 'YYYY-MM-DD'
  onChange: (dates: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MultiDatePicker: React.FC<MultiDatePickerProps> = ({
  selectedDates,
  onChange,
  isOpen,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // Initialize viewMonth and viewYear from first selected date or today
  const initialDate = selectedDates.length > 0 ? new Date(selectedDates[0] + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDate.getTime()) ? today.getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDate.getTime()) ? today.getMonth() : initialDate.getMonth()
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const weekdayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const toggleDate = (isoStr: string) => {
    if (selectedDates.includes(isoStr)) {
      onChange(selectedDates.filter((d) => d !== isoStr));
    } else {
      onChange([...selectedDates, isoStr].sort());
    }
  };

  const removeDate = (isoStr: string) => {
    onChange(selectedDates.filter((d) => d !== isoStr));
  };

  const clearAll = () => {
    onChange([]);
  };

  const toggleToday = () => {
    toggleDate(todayIso);
  };

  // Generate calendar days for viewMonth and viewYear
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7; // Mon is 0, Sun is 6
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells = [];

  // Trailing previous month days
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({
      day,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarCells.push({
      day: i,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete 42-cell grid
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarCells.push({
      day: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  const formatShortDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr + 'T00:00:00');
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl p-4 w-76 sm:w-82 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 select-none font-sans"
    >
      {/* Popover Header: Month / Year Navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="font-semibold text-gray-900 text-sm tracking-tight">
          {monthNames[viewMonth]} {viewYear}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Previous month"
          >
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Next month"
          >
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {weekdayNames.map((wd) => (
          <span
            key={wd}
            className="text-[10px] font-medium text-gray-400 uppercase tracking-wider py-0.5"
          >
            {wd}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {calendarCells.map((cell, idx) => {
          const mStr = String(cell.month + 1).padStart(2, '0');
          const dStr = String(cell.day).padStart(2, '0');
          const iso = `${cell.year}-${mStr}-${dStr}`;
          const isSelected = selectedDates.includes(iso);
          const isToday = iso === todayIso;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDate(iso)}
              className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700'
                  : cell.isCurrentMonth
                  ? isToday
                    ? 'text-blue-600 font-semibold bg-blue-50/70 hover:bg-blue-100/70'
                    : 'text-gray-800 hover:bg-blue-50/80 hover:text-blue-600'
                  : 'text-gray-300 hover:bg-gray-50'
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* Selection Status & Selected Chips */}
      <div className="border-t border-gray-100 pt-2.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700">
            {selectedDates.length === 0 ? (
              <span className="text-gray-400 font-normal italic">Click dates to select multiple</span>
            ) : (
              <span className="text-blue-600 font-medium">
                {selectedDates.length} {selectedDates.length === 1 ? 'date' : 'dates'} selected
              </span>
            )}
          </span>
          {selectedDates.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-medium text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedDates.length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-gray-50 rounded-xl">
            {selectedDates.slice().sort().map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-medium"
              >
                {formatShortDate(d)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDate(d);
                  }}
                  className="hover:text-blue-900 ml-0.5 cursor-pointer"
                  title="Remove date"
                >
                  <i className="fa-solid fa-xmark text-[9px]"></i>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={toggleToday}
            className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            {selectedDates.includes(todayIso) ? 'Remove Today' : 'Add Today'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
