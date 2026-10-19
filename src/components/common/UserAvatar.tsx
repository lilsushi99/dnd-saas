import React, { useState } from 'react';

export interface UserAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineStatus?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  photoUrl,
  size = 'md',
  className = '',
  showOnlineStatus = false,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Compute clean initials
  const initials = (name || 'U')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-16 h-16 text-xl font-bold',
  };

  const statusDotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4 ring-3',
  };

  const hasPhoto = photoUrl && photoUrl.trim() !== '' && !imageFailed;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold text-white shadow-xs transition-transform select-none ${
          !hasPhoto ? 'bg-blue-600' : 'bg-gray-100 border border-gray-200/80'
        }`}
        style={!hasPhoto ? { backgroundColor: 'var(--primary-color, #1C64FF)' } : undefined}
      >
        {hasPhoto ? (
          <img
            src={photoUrl!}
            alt={name || 'Avatar'}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span>{initials || 'U'}</span>
        )}
      </div>

      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusDotSizes[size]} rounded-full bg-green-500 ring-2 ring-white shadow-2xs`}
          title="Online"
        />
      )}
    </div>
  );
};
