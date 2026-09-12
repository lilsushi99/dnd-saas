import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded-md h-4';
      case 'rectangular':
      default:
        return 'rounded-xl';
    }
  };

  const style: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      style={style}
      className={`bg-gray-200/80 animate-pulse ${getVariantClass()} ${className}`}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <Skeleton width={180} height={24} />
        <Skeleton width={120} height={32} />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-3 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="flex-1"
              height={20}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 border border-gray-200/80 rounded-2xl shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width={120} height={16} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <Skeleton width={180} height={32} />
      <Skeleton width={140} height={14} />
    </div>
  );
};
