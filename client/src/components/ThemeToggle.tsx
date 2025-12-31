import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * ThemeToggle component
 *
 * This component renders a small button that toggles between light and dark
 * themes. It stores the current theme in localStorage so that user
 * preference persists across page reloads. When toggling, it adds or
 * removes the `dark` class on the root `<html>` element, which is the
 * standard way Tailwind CSS and the project’s CSS handle dark mode.
 */
export function ThemeToggle() {
  // Determine the initial theme based on localStorage. Default to light.
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("theme") === "dark";
  });

  // Whenever `isDark` changes, update the DOM and localStorage.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      window.localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      window.localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(prev => !prev)}
      className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}