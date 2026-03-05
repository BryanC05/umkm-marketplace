import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Upload, AlertCircle, Loader2, Check, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useLogoGenerator } from '@/hooks/useLogoGenerator';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { getBackendUrl } from '@/config';
import LogoGallery from '@/components/logo/LogoGallery';
import LogoUpload from '@/components/logo/LogoUpload';
import PromptSuggestions from '@/components/logo/PromptSuggestions';

const BACKEND_URL = getBackendUrl();

const getLogoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

function LogoGenerator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const [prompt, setPrompt] = useState('');
  const [currentBusinessLogo, setCurrentBusinessLogo] = useState(null);
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const fromRegistration = searchParams.get('from') === 'registration';

  const {
    isGenerating,
    isLoading,
    error,
    logos,
    status,
    generateLogo,
    getHistory,
    getStatus,
    resetLimit,
    selectLogo,
    deleteLogo,
    uploadLogo,
    removeCustomLogo,
    clearError
  } = useLogoGenerator();

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/logo-generator' } });
      return;
    }

    const loadData = async () => {
      try {
        const historyData = await getHistory();
        await getStatus();

        if (historyData) {
          setCurrentBusinessLogo(historyData.businessLogo);
          setHasCustomLogo(historyData.hasCustomLogo);
        }
      } catch (err) {
        console.error('Failed to load logo data:', err);
      }
    };

    loadData();
  }, [isAuthenticated, navigate, getHistory, getStatus]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    clearError();

    try {
      await generateLogo(prompt);
      setPrompt('');
      setSuccessMessage('Logo generated successfully!');
    } catch {
      // Error is handled by the hook
    }
  };

  const handleSelectLogo = async (logoId) => {
    try {
      const result = await selectLogo(logoId);
      if (result) {
        setCurrentBusinessLogo(result.businessLogo);
        setHasCustomLogo(false);
        setSuccessMessage('Logo set as your business logo!');
      }
    } catch {
      // Error is handled by the hook
    }
  };

  const handleDeleteLogo = async (logoId) => {
    if (!window.confirm('Are you sure you want to delete this logo?')) return;

    try {
      await deleteLogo(logoId);
      setSuccessMessage('Logo deleted');
    } catch {
      // Error is handled by the hook
    }
  };

  const handleUploadLogo = async (file) => {
    try {
      const result = await uploadLogo(file);
      if (result) {
        setCurrentBusinessLogo(result.businessLogo);
        setHasCustomLogo(true);
        setSuccessMessage('Custom logo uploaded successfully!');
      }
    } catch {
      // Error is handled by the hook
    }
  };

  const handleContinue = () => {
    if (fromRegistration) {
      navigate('/register', { state: { businessLogo: currentBusinessLogo } });
    } else {
      navigate('/profile');
    }
  };

  const handleResetLimit = async () => {
    try {
      await resetLimit();
      setSuccessMessage('Daily generation limit has been reset');
    } catch {
      // Error is handled by the hook
    }
  };

  const getLimitProgress = () => {
    if (!status) return 0;
    return (status.used / status.limit) * 100;
  };

  return (
    <>
      <div className="container py-8 md:py-10 max-w-6xl">
        {/* Header */}
        <div className="endfield-card endfield-gradient p-5 md:p-7 flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="min-w-0">
            {fromRegistration && (
              <Button
                variant="ghost"
                className="mb-2 -ml-2"
                onClick={() => navigate('/register')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('common.back')} Registration
              </Button>
            )}
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Brand Builder</p>
            <h1 className="text-3xl font-bold">{t('logo.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('logo.logoDesc') || 'Create a professional logo for your business using AI'}
            </p>
          </div>

          {fromRegistration && currentBusinessLogo && (
            <Button onClick={handleContinue}>
              {t('common.continue') || 'Continue'}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/30">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Daily Limit Card */}
        <Card className="mb-6 endfield-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('logo.dailyLimit') || 'Daily Generation Limit'}</span>
              <span className="text-sm text-muted-foreground">
                {status ? `${status.remaining} ${t('logo.of') || 'of'} ${status.limit} ${t('logo.remaining') || 'remaining'}` : t('common.loading') || 'Loading...'}
              </span>
            </div>
            <Progress
              value={getLimitProgress()}
              className="h-2"
            />
            {status && status.remaining === 0 && (
              <p className="text-sm text-destructive mt-2">
                {t('logo.limitReached') || 'Daily limit reached. Resets in'} {status.resetInHours} {t('logo.hours') || 'hours'}.
              </p>
            )}
              <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLimit}
                disabled={isLoading}
                className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {t('logo.resetting') || 'Resetting...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t('logo.resetLimit') || 'Reset Limit'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Logo Display */}
        {currentBusinessLogo && (
        <Card className="mb-6 border-primary endfield-card">
            <CardHeader>
              <CardTitle className="text-base">{t('logo.currentLogo')}</CardTitle>
              <CardDescription>
                {hasCustomLogo ? t('logo.customLogo') : t('logo.aiLogo')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <img
                  src={getLogoUrl(currentBusinessLogo)}
                  alt="Current business logo"
                  className="w-32 h-32 object-contain border rounded-lg"
                />
                {hasCustomLogo && (
                  <Button
                    variant="outline"
                    onClick={removeCustomLogo}
                    disabled={isLoading}
                  >
                    {t('logo.removeCustom')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
 {/* Generation Section */}
        )}

               <Card className="mb-6 endfield-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('logo.generateNew')}
            </CardTitle>
            <CardDescription>
              {t('logo.describePrompt')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder={t('logo.describeLogo')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={isGenerating || (status && status.remaining === 0)}
              />
              <p className="text-xs text-muted-foreground">
                {t('logo.tip')}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {prompt.length}/500 {t('logo.characters')}
              </span>

              <div className="flex gap-2">
                <PromptSuggestions onSelect={setPrompt} />

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || (status && status.remaining === 0)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      {t('logo.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      {t('logo.generateLogo')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generated Logos Gallery */}
        <div className="mb-6">
          <LogoGallery
            logos={logos}
            selectedLogoUrl={currentBusinessLogo}
            onSelect={handleSelectLogo}
            onDelete={handleDeleteLogo}
            isLoading={isLoading}
          />
        </div>

        <Separator className="my-8" />

        {/* Upload Section */}
        <Card className="endfield-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Your Own Logo
            </CardTitle>
            <CardDescription>
              Already have a logo? Upload it here to use as your business logo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LogoUpload
              onUpload={handleUploadLogo}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default LogoGenerator;

