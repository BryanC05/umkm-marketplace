import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboardingStore = create(
    persist(
        (set, get) => ({
            hasCompletedOnboarding: false,
            currentStep: 0,
            isOnboardingActive: false,

            startOnboarding: () => {
                set({ isOnboardingActive: true, currentStep: 0 });
            },

            nextStep: () => {
                const { currentStep } = get();
                set({ currentStep: currentStep + 1 });
            },

            prevStep: () => {
                const { currentStep } = get();
                if (currentStep > 0) {
                    set({ currentStep: currentStep - 1 });
                }
            },

            completeOnboarding: () => {
                set({ 
                    hasCompletedOnboarding: true, 
                    isOnboardingActive: false,
                    currentStep: 0 
                });
            },

            skipOnboarding: () => {
                set({ 
                    isOnboardingActive: false,
                    currentStep: 0 
                });
            },

            resetOnboarding: () => {
                set({ 
                    hasCompletedOnboarding: false,
                    isOnboardingActive: false,
                    currentStep: 0 
                });
            },
        }),
        {
            name: 'onboarding-storage',
        }
    )
);
