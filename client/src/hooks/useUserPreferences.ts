import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User Preferences Store
 * Gerencia modo simples/avançado e outras preferências
 */

export type UIMode = 'simple' | 'advanced';
export type Theme = 'light' | 'dark' | 'auto';

interface UserPreferences {
  // Onboarding
  hasCompletedOnboarding: boolean;
  onboardingSkipped: boolean;

  // UI
  uiMode: UIMode;
  theme: Theme;
  language: string;
  showTooltips: boolean;

  // Features visibility (modo simples esconde algumas)
  showGamification: boolean;
  showOpenBanking: boolean;
  showAIFeatures: boolean;
  showCollaboration: boolean;
  showProjects: boolean;
  showMultiCurrency: boolean;

  // Notifications
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;

  // Actions
  setUIMode: (mode: UIMode) => void;
  setTheme: (theme: Theme) => void;
  toggleTooltips: () => void;
  toggleFeature: (feature: keyof Omit<UserPreferences, 'setUIMode' | 'setTheme' | 'toggleTooltips' | 'toggleFeature' | 'completeOnboarding' | 'resetPreferences'>) => void;
  completeOnboarding: () => void;
  resetPreferences: () => void;
}

const defaultPreferences = {
  hasCompletedOnboarding: false,
  onboardingSkipped: false,
  uiMode: 'simple' as UIMode,
  theme: 'auto' as Theme,
  language: 'pt-BR',
  showTooltips: true,
  showGamification: true,
  showOpenBanking: true,
  showAIFeatures: true,
  showCollaboration: true,
  showProjects: true,
  showMultiCurrency: false,
  enablePushNotifications: false,
  enableEmailNotifications: true,
};

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      ...defaultPreferences,

      setUIMode: (mode) => {
        set({ uiMode: mode });

        // Modo simples: esconde features avançadas
        if (mode === 'simple') {
          set({
            showOpenBanking: false,
            showAIFeatures: false,
            showCollaboration: false,
            showProjects: false,
            showMultiCurrency: false,
          });
        } else {
          // Modo avançado: mostra tudo
          set({
            showGamification: true,
            showOpenBanking: true,
            showAIFeatures: true,
            showCollaboration: true,
            showProjects: true,
            showMultiCurrency: true,
          });
        }
      },

      setTheme: (theme) => set({ theme }),

      toggleTooltips: () =>
        set((state) => ({ showTooltips: !state.showTooltips })),

      toggleFeature: (feature) =>
        set((state) => ({ [feature]: !state[feature as keyof typeof state] })),

      completeOnboarding: () =>
        set({
          hasCompletedOnboarding: true,
          onboardingSkipped: false,
        }),

      resetPreferences: () => set(defaultPreferences),
    }),
    {
      name: 'user-preferences',
    }
  )
);

/**
 * Hook auxiliar para verificar se feature está visível
 */
export function useFeatureVisible(feature: string): boolean {
  const preferences = useUserPreferences();

  const featureMap: Record<string, boolean> = {
    gamification: preferences.showGamification,
    'open-banking': preferences.showOpenBanking,
    ai: preferences.showAIFeatures,
    collaboration: preferences.showCollaboration,
    projects: preferences.showProjects,
    'multi-currency': preferences.showMultiCurrency,
  };

  return featureMap[feature] ?? true;
}
