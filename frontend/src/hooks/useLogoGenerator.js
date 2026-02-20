import { useState, useCallback } from 'react';
import api from '../utils/api';

const normalizeLogos = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.logos)) return value.logos;
  return [];
};

const updateStatusWithRemaining = (prevStatus, remainingGenerations) => {
  if (!prevStatus || typeof prevStatus !== 'object') return prevStatus;

  const nextStatus = { ...prevStatus, remaining: remainingGenerations };
  if (typeof prevStatus.limit === 'number') {
    nextStatus.used = Math.max(0, prevStatus.limit - remainingGenerations);
  }
  return nextStatus;
};

export function useLogoGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logos, setLogos] = useState([]);
  const [status, setStatus] = useState(null);

  // Generate a new logo
  const generateLogo = useCallback(async (prompt) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await api.post('/logo/generate', { prompt });
      
      if (response.data.success) {
        setLogos((prev) => [...normalizeLogos(prev), response.data.logo]);
        setStatus((prev) => updateStatusWithRemaining(prev, response.data.remainingGenerations));
        return response.data.logo;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to generate logo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Get logo history
  const getHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/logo/history');
      
      if (response.data.success) {
        setLogos(normalizeLogos(response.data.logos));
        return response.data;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch logo history';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get generation status
  const getStatus = useCallback(async () => {
    try {
      const response = await api.get('/logo/status');
      
      if (response.data.success) {
        setStatus(response.data.status);
        return response.data.status;
      }
    } catch (err) {
      console.error('Failed to fetch generation status:', err);
    }
  }, []);

  // Reset generation limit (testing)
  const resetLimit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/logo/reset-limit');

      if (response.data.success) {
        setStatus(response.data.status);
        return response.data;
      }
      throw new Error(response.data?.message || response.data?.error || 'Failed to reset limit');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to reset limit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Select a logo as business logo
  const selectLogo = useCallback(async (logoId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/logo/select/${logoId}`);
      
      if (response.data.success) {
        return response.data;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to select logo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a logo
  const deleteLogo = useCallback(async (logoId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.delete(`/logo/${logoId}`);
      
      if (response.data.success) {
        setLogos((prev) => normalizeLogos(prev).filter((logo) => logo.logoId !== logoId));
        return response.data;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete logo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload custom logo
  const uploadLogo = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await api.post('/logo/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        return response.data;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to upload logo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove custom logo
  const removeCustomLogo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.delete('/logo/custom/remove');
      
      if (response.data.success) {
        return response.data;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to remove custom logo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isGenerating,
    isLoading,
    error,
    logos,
    status,
    
    // Actions
    generateLogo,
    getHistory,
    getStatus,
    resetLimit,
    selectLogo,
    deleteLogo,
    uploadLogo,
    removeCustomLogo,
    clearError
  };
}
