import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Facebook, Twitter, Youtube, Linkedin, Globe, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'twitter', name: 'Twitter / X', icon: Twitter, color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'website', name: 'Website', icon: Globe, color: '#6366F1' },
];

const InstagramConnect = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Fetch Instagram status
  const { data: igStatus, isLoading: igLoading } = useQuery({
    queryKey: ['instagramStatus'],
    queryFn: async () => {
      const response = await api.get('/users/instagram/status');
      return response.data;
    },
    enabled: !!user,
  });

  // Fetch Instagram preference
  const { data: igPreference } = useQuery({
    queryKey: ['instagramPreference'],
    queryFn: async () => {
      const response = await api.get('/users/instagram/preference');
      return response.data;
    },
    enabled: !!user,
  });

  // Connect Instagram mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get('/users/instagram/connect');
      return response.data;
    },
    onSuccess: (data) => {
      // Open OAuth URL in new window
      window.open(data.authURL, '_blank', 'width=600,height=700');
    },
  });

  // Disconnect Instagram mutation
  const disconnectMutation = useMutation({
    mutationFn: async (username) => {
      const response = await api.post(`/users/instagram/disconnect?username=${username}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagramStatus'] });
      queryClient.invalidateQueries({ queryKey: ['instagramPreference'] });
    },
  });

  // Set preference mutation
  const preferenceMutation = useMutation({
    mutationFn: async (preference) => {
      const response = await api.post('/users/instagram/preference', { preference });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagramPreference'] });
    },
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleDisconnect = (username) => {
    if (window.confirm(`Disconnect @${username}?`)) {
      disconnectMutation.mutate(username);
    }
  };

  const handlePreferenceChange = (pref) => {
    preferenceMutation.mutate(pref);
  };

  return (
    <div className="space-y-6">
      {/* Instagram Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            {t('socialLinks.instagram', 'Instagram')}
          </CardTitle>
          <CardDescription>
            {t('socialLinks.instagramDesc', 'Connect your Instagram account to auto-post products')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Accounts */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {t('socialLinks.connectedAccounts', 'Connected Accounts')}
            </h4>
            
            {igLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('socialLinks.loading', 'Loading...')}
              </div>
            ) : igStatus?.accounts?.length > 0 ? (
              <div className="space-y-2">
                {igStatus.accounts.map((account) => (
                  <div
                    key={account.instagramUserID}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      <div>
                        <p className="font-medium">@{account.username}</p>
                        {account.isDefault && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {t('socialLinks.default', 'Default')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(account.username)}
                      disabled={disconnectMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('socialLinks.noAccounts', 'No Instagram account connected')}
              </p>
            )}
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {connectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Instagram className="h-4 w-4 mr-2" />
            )}
            {t('socialLinks.connectInstagram', 'Connect Instagram')}
          </Button>

          {/* Posting Preference */}
          {igStatus?.accounts?.length > 0 && igPreference && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">
                {t('socialLinks.postingPreference', 'Posting Preference')}
              </h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="preference"
                      checked={igPreference.preference === 'trolitoko'}
                      onChange={() => handlePreferenceChange('trolitoko')}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="font-medium">
                        {t('socialLinks.trolitokoAccount', 'TroliToko Official')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('socialLinks.trolitokoDesc', 'Products will be posted on TroliToko Instagram')}
                      </p>
                    </div>
                  </div>
                </label>
                
                <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="preference"
                      checked={igPreference.preference === 'own'}
                      onChange={() => handlePreferenceChange('own')}
                      disabled={!igPreference.hasOwnAccount}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="font-medium">
                        {t('socialLinks.yourAccount', 'Your Instagram')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('socialLinks.yourAccountDesc', 'Products will be posted on your connected account')}
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">{t('socialLinks.howItWorks', 'How it works')}</p>
                <p className="mt-1">
                  {t('socialLinks.infoText', 'When you create a product with Instagram posting enabled, it will automatically be posted to the selected Instagram account based on your preference.')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SocialLinks = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // Fetch social links
  const { data: socialData } = useQuery({
    queryKey: ['socialLinks', user?._id],
    queryFn: async () => {
      const response = await api.get(`/users/${user._id}/social-links`);
      return response.data;
    },
    enabled: !!user?._id,
  });

  // Update social links mutation
  const updateMutation = useMutation({
    mutationFn: async (links) => {
      const response = await api.post('/users/social-links', links);
      return response.data;
    },
  });

  // Initialize links from socialData using lazy initializer
  const [links, setLinks] = useState(() => {
    const initial = {
      instagram: '',
      facebook: '',
      twitter: '',
      youtube: '',
      linkedin: '',
      website: '',
    };
    
    if (socialData?.profileLinks) {
      socialData.profileLinks.forEach(link => {
        initial[link.platform] = link.url;
      });
    }
    
    return initial;
  });

  const handleSave = () => {
    const profileLinks = Object.entries(links)
      .filter(([, url]) => url.trim())
      .map(([platform, url]) => ({ platform, url }));

    updateMutation.mutate({
      profileLinks,
      storeLinks: profileLinks,
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t('socialLinks.loginRequired', 'Please login to manage your social links')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {t('socialLinks.title', 'Social Links')}
        </h1>
        <p className="text-muted-foreground">
          {t('socialLinks.subtitle', 'Manage your social media links')}
        </p>
      </div>

      {/* Instagram Integration */}
      <InstagramConnect />

      {/* Other Social Links */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {t('socialLinks.otherLinks', 'Other Social Links')}
          </CardTitle>
          <CardDescription>
            {t('socialLinks.otherLinksDesc', 'Add links to your other social media profiles')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SOCIAL_PLATFORMS.filter(p => p.id !== 'instagram').map((platform) => (
            <div key={platform.id} className="flex items-center gap-3">
              <platform.icon className="h-5 w-5" style={{ color: platform.color }} />
              <input
                type="url"
                placeholder={`${platform.name} URL`}
                value={links[platform.id] || ''}
                onChange={(e) => setLinks({ ...links, [platform.id]: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-md bg-background"
              />
            </div>
          ))}

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('socialLinks.save', 'Save Changes')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialLinks;
