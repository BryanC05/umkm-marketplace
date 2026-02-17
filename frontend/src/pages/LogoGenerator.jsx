import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Upload, AlertCircle, Loader2, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useLogoGenerator } from '@/hooks/useLogoGenerator';
import { useAuthStore } from '@/store/authStore';
import { getBackendUrl } from '@/config';
import Layout from '@/components/layout/Layout';
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
  const { user, isAuthenticated } = useAuthStore();

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
        const statusData = await getStatus();

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
    } catch (err) {
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
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleDeleteLogo = async (logoId) => {
    if (!window.confirm('Are you sure you want to delete this logo?')) return;

    try {
      await deleteLogo(logoId);
      setSuccessMessage('Logo deleted');
    } catch (err) {
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
    } catch (err) {
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

  const getLimitProgress = () => {
    if (!status) return 0;
    return (status.used / status.limit) * 100;
  };

  const getLimitColor = () => {
    if (!status) return 'bg-primary';
    if (status.remaining === 0) return 'bg-destructive';
    if (status.remaining <= 2) return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {fromRegistration && (
              <Button
                variant="ghost"
                className="mb-2 -ml-2"
                onClick={() => navigate('/register')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Registration
              </Button>
            )}
            <h1 className="text-3xl font-bold">Logo Generator</h1>
            <p className="text-muted-foreground mt-1">
              Create a professional logo for your business using AI
            </p>
          </div>

          {fromRegistration && currentBusinessLogo && (
            <Button onClick={handleContinue}>
              Continue
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
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
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Daily Generation Limit</span>
              <span className="text-sm text-muted-foreground">
                {status ? `${status.remaining} of ${status.limit} remaining` : 'Loading...'}
              </span>
            </div>
            <Progress
              value={getLimitProgress()}
              className="h-2"
            />
            {status && status.remaining === 0 && (
              <p className="text-sm text-destructive mt-2">
                Daily limit reached. Resets in {status.resetInHours} hours.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current Logo Display */}
        {currentBusinessLogo && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="text-base">Current Business Logo</CardTitle>
              <CardDescription>
                {hasCustomLogo ? 'Your uploaded custom logo' : 'Your selected AI-generated logo'}
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
                    Remove Custom Logo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate New Logo
            </CardTitle>
            <CardDescription>
              Describe your ideal logo and our AI will create it for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Describe your logo in English or Bahasa Indonesia (e.g., 'Modern tech company logo with blue gradient' or 'Logo perusahaan teknologi modern dengan gradasi biru')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={isGenerating || (status && status.remaining === 0)}
              />
              <p className="text-xs text-muted-foreground">
                💡 Supports Bahasa Indonesia! The AI will automatically translate Indonesian prompts for best results.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {prompt.length}/500 characters
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
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate Logo
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
        <Card>
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
    </Layout>
  );
}

export default LogoGenerator;
