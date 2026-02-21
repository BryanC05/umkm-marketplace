import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Phone } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { useTranslation } from '@/hooks/useTranslation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email');

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      setAuth(response.data.user, response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="text-4xl mb-2">👋</div>
            <CardTitle className="text-2xl font-bold">{t('auth.welcomeBack')}</CardTitle>
            <CardDescription className="text-base">
              {t('auth.loginDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-lg mb-4 border border-destructive/20">
                <p className="font-medium mb-1">Login Failed</p>
                <p>{error}</p>
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                variant={loginMethod === 'email' ? 'default' : 'outline'}
                className="flex-1 h-11 gap-2"
                onClick={() => setLoginMethod('email')}
              >
                <Mail className="h-5 w-5" />
                Email
              </Button>
              <Button
                type="button"
                variant={loginMethod === 'phone' ? 'default' : 'outline'}
                className="flex-1 h-11 gap-2"
                onClick={() => setLoginMethod('phone')}
              >
                <Phone className="h-5 w-5" />
                Phone
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">
                  {loginMethod === 'email' ? t('auth.email') : 'Phone Number'}
                </Label>
                <div className="relative">
                  {loginMethod === 'email' ? (
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  ) : (
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  )}
                  <Input
                    id="email"
                    type={loginMethod === 'email' ? 'email' : 'tel'}
                    placeholder={loginMethod === 'email' ? 'your@email.com' : '08xxxxxxxxxx'}
                    className="pl-12 h-12 text-base"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">
                  {t('auth.password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.enterPassword')}
                    className="pl-12 pr-12 h-12 text-base"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base gap-2" disabled={isLoading}>
                {isLoading ? t('auth.loggingIn') : t('auth.login')}
                {!isLoading && <ArrowRight className="h-5 w-5" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-base text-muted-foreground text-center">
              {t('auth.dontHaveAccount')}{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                {t('auth.createAccount')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}

export default Login;
