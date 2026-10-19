import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
  logoUrl?: string | null;
  businessName?: string | null;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
  logoUrl: propLogoUrl,
  businessName: propBusinessName,
}) => {
  let branding: ReturnType<typeof useBranding> | null = null;
  try {
    branding = useBranding();
  } catch {
    // Graceful fallback if rendered outside BrandingProvider (e.g. in tests)
  }

  const [imageError, setImageError] = useState(false);

  const activeLogo = propLogoUrl !== undefined ? propLogoUrl : branding?.businessLogo || '';
  const activeName = propBusinessName !== undefined ? propBusinessName : branding?.businessName || 'Nexus ERP';
  const primaryColor = branding?.primaryColor || '#1C64FF';

  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const imgMaxDimensions = {
    sm: 'max-h-7 max-w-[130px]',
    md: 'max-h-8 max-w-[150px]',
    lg: 'max-h-10 max-w-[180px]',
  };

  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
  };

  const hasCustomLogo = activeLogo && activeLogo.trim() !== '' && !imageError;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {hasCustomLogo ? (
        // Custom Business Logo
        <div className="flex items-center gap-2.5">
          <img
            src={activeLogo}
            alt={activeName || 'Business Logo'}
            onError={() => setImageError(true)}
            className={`${imgMaxDimensions[size]} object-contain rounded-lg transition-transform hover:scale-[1.02]`}
          />
          {variant === 'full' && activeName && !activeName.toLowerCase().includes('nexus') && (
            <span className={`font-semibold tracking-tight text-gray-900 ${textSizes[size]} truncate max-w-[180px]`}>
              {activeName}
            </span>
          )}
        </div>
      ) : (
        // Default Nexus ERP Brand Icon
        <>
          <div
            className={`${iconDimensions[size]} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 transition-transform hover:scale-[1.02]`}
            style={{ backgroundColor: primaryColor }}
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
                <span className={`font-semibold tracking-tight text-gray-900 ${textSizes[size]}`}>
                  {activeName || 'Nexus'}
                </span>
                {(!activeName || activeName === 'Nexus' || activeName === 'Nexus ERP') && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-md tracking-wider uppercase"
                    style={{
                      backgroundColor: 'var(--primary-color-subtle, #EFF4FF)',
                      color: primaryColor,
                    }}
                  >
                    ERP
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
