import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemSettings } from '../types';
import { OperationsApiService } from '../services/operationsService';
import {
  DEFAULT_PRIMARY_COLOR,
  isValidHex,
  normalizeHex,
  darkenHex,
  lightenHex,
  hexToRgba,
} from '../utils/colorUtils';

export interface BrandingContextType {
  businessName: string;
  businessLogo: string;
  directorName: string;
  directorPhoto: string;
  primaryColor: string;
  isLoading: boolean;
  setBusinessLogo: (url: string) => void;
  setDirectorPhoto: (url: string) => void;
  setPrimaryColor: (hex: string) => void;
  setBusinessName: (name: string) => void;
  applyThemeColor: (hex: string) => void;
  resetThemeToDefault: () => void;
  refreshBranding: () => Promise<void>;
  updateBranding: (partial: Partial<SystemSettings>) => Promise<SystemSettings>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'nexus_primary_brand_color';
const LOGO_STORAGE_KEY = 'nexus_business_logo';
const NAME_STORAGE_KEY = 'nexus_business_name';

/**
 * Applies dynamic CSS variables and style sheet rules for the chosen primary brand color.
 */
export function injectThemeStyles(hex: string) {
  const norm = isValidHex(hex) ? normalizeHex(hex) : DEFAULT_PRIMARY_COLOR;
  const hover = darkenHex(norm, 12);
  const active = darkenHex(norm, 18);
  const subtle = lightenHex(norm, 88);
  const ring = hexToRgba(norm, 0.25);
  const subtleBorder = hexToRgba(norm, 0.15);

  const root = document.documentElement;
  root.style.setProperty('--primary-color', norm);
  root.style.setProperty('--primary-color-hover', hover);
  root.style.setProperty('--primary-color-active', active);
  root.style.setProperty('--primary-color-subtle', subtle);
  root.style.setProperty('--primary-color-ring', ring);
  root.style.setProperty('--color-brand-600', norm);
  root.style.setProperty('--color-brand-700', hover);
  root.style.setProperty('--color-brand-500', norm);
  root.style.setProperty('--color-brand-50', subtle);
  root.style.setProperty('--color-accent', norm);
  root.style.setProperty('--color-accent-hover', hover);
  root.style.setProperty('--color-accent-subtle', subtle);

  let styleTag = document.getElementById('nexus-theme-override') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'nexus-theme-override';
    document.head.appendChild(styleTag);
  }

  styleTag.innerHTML = `
    :root {
      --primary-color: ${norm};
      --primary-color-hover: ${hover};
      --primary-color-active: ${active};
      --primary-color-subtle: ${subtle};
      --primary-color-ring: ${ring};
      --color-brand-600: ${norm};
      --color-brand-700: ${hover};
      --color-brand-500: ${norm};
      --color-brand-50: ${subtle};
      --color-accent: ${norm};
      --color-accent-hover: ${hover};
      --color-accent-subtle: ${subtle};
    }

    /* Primary backgrounds */
    .bg-blue-600,
    .bg-brand-600 {
      background-color: var(--primary-color) !important;
    }

    /* Primary hover */
    .hover\\:bg-blue-700:hover,
    .hover\\:bg-brand-700:hover,
    .hover\\:bg-blue-600:hover {
      background-color: var(--primary-color-hover) !important;
    }

    /* Primary text */
    .text-blue-600,
    .text-brand-600 {
      color: var(--primary-color) !important;
    }

    .text-blue-700,
    .text-brand-700 {
      color: var(--primary-color-hover) !important;
    }

    /* Soft accents & backgrounds */
    .bg-blue-50,
    .bg-brand-50,
    .bg-blue-50\\/30,
    .bg-blue-50\\/50 {
      background-color: var(--primary-color-subtle) !important;
    }

    /* Borders */
    .border-blue-600,
    .border-brand-600 {
      border-color: var(--primary-color) !important;
    }

    .border-blue-500,
    .focus\\:border-blue-500:focus,
    .focus\\:border-blue-600:focus {
      border-color: var(--primary-color) !important;
    }

    /* Focus rings & shadows */
    .focus\\:ring-blue-500:focus,
    .focus\\:ring-blue-600:focus {
      --tw-ring-color: ${ring} !important;
    }

    .shadow-blue-500\\/20,
    .shadow-blue-600\\/20 {
      --tw-shadow-color: ${ring} !important;
    }
  `;
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businessName, setBusinessName] = useState<string>(() => {
    return localStorage.getItem(NAME_STORAGE_KEY) || 'Nexus ERP';
  });

  const [businessLogo, setBusinessLogoState] = useState<string>(() => {
    return localStorage.getItem(LOGO_STORAGE_KEY) || '';
  });

  const [directorName, setDirectorName] = useState<string>('Dominion');
  const [directorPhoto, setDirectorPhotoState] = useState<string>('');

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    const cached = localStorage.getItem(THEME_STORAGE_KEY);
    return isValidHex(cached || '') ? normalizeHex(cached!) : DEFAULT_PRIMARY_COLOR;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Apply theme immediately on mount
  useEffect(() => {
    injectThemeStyles(primaryColor);
  }, []);

  const applyThemeColor = useCallback((hex: string) => {
    const valid = isValidHex(hex) ? normalizeHex(hex) : DEFAULT_PRIMARY_COLOR;
    setPrimaryColorState(valid);
    injectThemeStyles(valid);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, valid);
    } catch {}
  }, []);

  const resetThemeToDefault = useCallback(() => {
    applyThemeColor(DEFAULT_PRIMARY_COLOR);
  }, [applyThemeColor]);

  const setBusinessLogo = useCallback((url: string) => {
    setBusinessLogoState(url);
    try {
      if (url) {
        localStorage.setItem(LOGO_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(LOGO_STORAGE_KEY);
      }
    } catch {}
  }, []);

  const setDirectorPhoto = useCallback((url: string) => {
    setDirectorPhotoState(url);
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      // Try authenticated settings first
      const settings = await OperationsApiService.fetchSystemSettings().catch(async () => {
        // Fall back to public branding endpoint
        const res = await fetch('/api/auth/branding');
        const json = await res.json();
        return json.branding || {};
      });

      if (settings) {
        if (settings.businessName !== undefined) {
          setBusinessName(settings.businessName || 'Nexus ERP');
          try { localStorage.setItem(NAME_STORAGE_KEY, settings.businessName || 'Nexus ERP'); } catch {}
        }
        if (settings.businessLogo !== undefined) {
          setBusinessLogoState(settings.businessLogo || '');
          try {
            if (settings.businessLogo) localStorage.setItem(LOGO_STORAGE_KEY, settings.businessLogo);
            else localStorage.removeItem(LOGO_STORAGE_KEY);
          } catch {}
        }
        if (settings.directorName !== undefined) {
          setDirectorName(settings.directorName || 'Dominion');
        }
        if (settings.directorPhoto !== undefined) {
          setDirectorPhotoState(settings.directorPhoto || '');
        }
        if (settings.primaryColor && isValidHex(settings.primaryColor)) {
          applyThemeColor(settings.primaryColor);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh branding from database:', err);
    } finally {
      setIsLoading(false);
    }
  }, [applyThemeColor]);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const updateBranding = useCallback(
    async (partial: Partial<SystemSettings>): Promise<SystemSettings> => {
      const updated = await OperationsApiService.updateSystemSettings(partial);
      if (updated.businessName !== undefined) {
        setBusinessName(updated.businessName || 'Nexus ERP');
        try { localStorage.setItem(NAME_STORAGE_KEY, updated.businessName || 'Nexus ERP'); } catch {}
      }
      if (updated.businessLogo !== undefined) {
        setBusinessLogoState(updated.businessLogo || '');
        try {
          if (updated.businessLogo) localStorage.setItem(LOGO_STORAGE_KEY, updated.businessLogo);
          else localStorage.removeItem(LOGO_STORAGE_KEY);
        } catch {}
      }
      if (updated.directorName !== undefined) {
        setDirectorName(updated.directorName || 'Dominion');
      }
      if (updated.directorPhoto !== undefined) {
        setDirectorPhotoState(updated.directorPhoto || '');
      }
      if (updated.primaryColor && isValidHex(updated.primaryColor)) {
        applyThemeColor(updated.primaryColor);
      }
      return updated;
    },
    [applyThemeColor]
  );

  return (
    <BrandingContext.Provider
      value={{
        businessName,
        businessLogo,
        directorName,
        directorPhoto,
        primaryColor,
        isLoading,
        setBusinessLogo,
        setDirectorPhoto,
        setPrimaryColor: applyThemeColor,
        setBusinessName,
        applyThemeColor,
        resetThemeToDefault,
        refreshBranding,
        updateBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export function useBranding(): BrandingContextType {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
