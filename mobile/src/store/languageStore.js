import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../i18n/en';
import id from '../i18n/id';

const translations = { en, id };

export const useLanguageStore = create((set, get) => ({
    language: 'en',
    t: en,

    initLanguage: async () => {
        try {
            const saved = await AsyncStorage.getItem('language');
            if (saved && translations[saved]) {
                set({ language: saved, t: translations[saved] });
            }
        } catch (error) {
            console.error('Failed to load language:', error);
        }
    },

    toggleLanguage: async () => {
        const newLang = get().language === 'en' ? 'id' : 'en';
        try {
            await AsyncStorage.setItem('language', newLang);
        } catch (error) {
            console.error('Failed to save language:', error);
        }
        set({ language: newLang, t: translations[newLang] });
    },

    setLanguage: async (lang) => {
        if (!translations[lang]) return;
        try {
            await AsyncStorage.setItem('language', lang);
        } catch (error) {
            console.error('Failed to save language:', error);
        }
        set({ language: lang, t: translations[lang] });
    },
}));
