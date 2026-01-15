'use client';

import { useTheme } from './ThemeProvider';

/**
 * ThemeToggle: 主題切換按鈕
 * 固定在右下角，點擊可切換暖色調與冷色調
 */
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const isWarm = theme === 'warm';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer
        border-primary-500/30 bg-surface-800/80 text-xl ring-2 ring-primary-500/20 hover:ring-primary-500/40"
            aria-label={isWarm ? '切換為冷色調' : '切換為暖色調'}
            title={isWarm ? '切換為冷色調' : '切換為暖色調'}
        >
            <span className="transition-transform duration-300" style={{ transform: isWarm ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                {isWarm ? '🌅' : '🌊'}
            </span>
        </button>
    );
}
