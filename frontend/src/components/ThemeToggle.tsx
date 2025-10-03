"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme, ThemeMode } from "./ThemeProvider";

const modes: { key: ThemeMode; label: string; icon: JSX.Element }[] = [
  { key: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
  { key: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
  { key: "system", label: "System", icon: <Laptop className="w-4 h-4" /> },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setTheme(m.key)}
            className={`px-2.5 py-1.5 text-sm flex items-center gap-1 transition-colors ${
              theme === m.key
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
            aria-pressed={theme === m.key}
            aria-label={`Set theme to ${m.label}`}
          >
            {m.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => setTheme(m.key)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors ${
            theme === m.key
              ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
