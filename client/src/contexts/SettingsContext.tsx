import { createContext, useContext, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type SettingsContextType = {
  settings: any;
  isLoading: boolean;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  isLoading: true,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = trpc.finance.getSettings.useQuery();

  // Aplicar configurações dinamicamente
  useEffect(() => {
    if (settings) {
      // Aplicar cores CSS
      const root = document.documentElement;
      root.style.setProperty("--color-tabs", settings.colorTabs);
      root.style.setProperty("--color-buttons", settings.colorButtons);
      root.style.setProperty("--color-text", settings.colorText);
      root.style.setProperty("--color-background", settings.colorBackground);

      // Aplicar tipografia
      root.style.setProperty("--font-size-base", `${settings.fontSize}px`);
      root.style.setProperty("--font-family-base", settings.fontFamily);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
