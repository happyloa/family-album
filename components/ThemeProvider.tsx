'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useSyncExternalStore } from 'react';

export type ThemeMode = 'warm' | 'cool';

type ThemeContextType = {
    theme: ThemeMode;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme';

// 使用 useSyncExternalStore 來避免 hydration mismatch
function getStoredTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'warm';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'cool' ? 'cool' : 'warm';
}

function subscribeToStorage(callback: () => void) {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const storedTheme = useSyncExternalStore(
        subscribeToStorage,
        getStoredTheme,
        () => 'warm' as ThemeMode // server snapshot
    );

    const [theme, setThemeState] = useState<ThemeMode>(storedTheme);

    // 同步主題到 DOM 和 localStorage
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'warm' ? 'cool' : 'warm'));
    };

    const setTheme = (newTheme: ThemeMode) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
