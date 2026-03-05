import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Plus, Trash2, AlertCircle, CheckCircle,
  Mail, Package, UserPlus, Loader2, ArrowLeft, Crown
} from 'lucide-react';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import './Automation.css';

const getWorkflowTypes = (t) => [
  {
    value: 'order_confirmation',
    label: t('automation.workflowTypes.order_confirmation') || 'Order Confirmation',
    description: t('automation.workflowTypes.order_confirmation_desc') || 'Send confirmation emails when new orders are placed',
    icon: Mail,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    value: 'inventory_alert',
    label: t('automation.workflowTypes.inventory_alert') || 'Inventory Alert',
    description: t('automation.workflowTypes.inventory_alert_desc') || 'Get notified when product stock runs low',
    icon: Package,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    value: 'welcome_series',
    label: t('automation.workflowTypes.welcome_series') || 'Welcome Series',
    description: t('automation.workflowTypes.welcome_series_desc') || 'Send welcome emails to new customers',
    icon: UserPlus,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

const Automation = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const workflowTypes = getWorkflowTypes(t);

  const getWorkflowMeta = (type) =>
    workflowTypes.find((w) => w.value === type) || workflowTypes[0];

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }

  // Create form state
  const [newWorkflowType, setNewWorkflowType] = useState('order_confirmation');
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const fetchWorkflows = async () => {
    try {
      const response = await api.get('/workflows');
      setWorkflows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (workflowId, currentStatus) => {
    try {
      await api.patch(`/workflows/${workflowId}/toggle`);
      setWorkflows(
        workflows.map((w) =>
          w._id === workflowId ? { ...w, isActive: !currentStatus } : w
        )
      );
      setFeedback({
        type: 'success',
        message: currentStatus ? (t('automation.workflowPaused') || 'Workflow paused') : (t('automation.workflowActivated') || 'Workflow activated'),
      });
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      setFeedback({ type: 'error', message: t('automation.toggleFailed') || 'Failed to toggle workflow' });
    }
  };

  const createWorkflow = async (e) => {
    e.preventDefault();

    const meta = getWorkflowMeta(newWorkflowType);
    setCreating(true);

    try {
      const response = await api.post('/workflows', {
        name: newWorkflowName.trim() || meta.label,
        type: newWorkflowType,
        config: {},
      });
      setWorkflows([...workflows, response.data]);
      setShowCreateModal(false);
      setNewWorkflowName('');
      setNewWorkflowType('order_confirmation');
      setFeedback({ type: 'success', message: 'Workflow created successfully!' });
    } catch (error) {
      console.error('Failed to create workflow:', error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create workflow',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkflow = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await api.delete(`/workflows/${workflowId}`);
      setWorkflows(workflows.filter((w) => w._id !== workflowId));
      setFeedback({ type: 'success', message: 'Workflow deleted' });
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      setFeedback({ type: 'error', message: 'Failed to delete workflow' });
    }
  };

  // Membership query
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['membership'],
    queryFn: async () => {
      const response = await api.get('/users/membership/status');
      return response.data;
    },
    enabled: !!user?.isSeller,
  });

  // Gate: Must be a seller
  if (!user?.isSeller) {
    return (
      <div className="container py-12">
        {/* How It Works - Always visible */}
        <div className="endfield-card endfield-gradient p-5 md:p-7 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">
                {t('automation.workflowEngine') || 'Workflow Engine'}
              </p>
              <h1 className="text-3xl font-bold">{t('automation.title') || 'Automation'}</h1>
              <p className="text-muted-foreground">
                {t('automation.subtitle') || 'Connect n8n workflows to automate your business processes'}
              </p>
            </div>
          </div>
        </div>

        <div className="endfield-card p-5 md:p-6 mb-8">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            {t('automation.howItWorks') || 'How It Works'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">1</div>
              <p className="text-sm font-medium mb-1">{t('automation.step1Title') || 'Choose a Workflow'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step1Desc')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">2</div>
              <p className="text-sm font-medium mb-1">{t('automation.step2Title') || 'Activate It'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step2Desc')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">3</div>
              <p className="text-sm font-medium mb-1">{t('automation.step3Title') || 'Sit Back & Relax'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step3Desc')}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h2 className="text-xl font-bold mb-2">{t('automation.sellerAccessRequired') || 'Seller Access Required'}</h2>
            <p className="text-muted-foreground mb-4">
              {t('automation.sellerAccessDesc') || 'Automation features are available for sellers only. Register your business to get started.'}
            </p>
            <Link to="/sell">
              <Button>{t('automation.registerAsSeller') || 'Register as Seller'}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate: Must have premium membership
  if (membershipLoading) {
    return (
      <div className="container py-12 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 size={20} className="animate-spin" />
        {t('common.loading') || 'Loading…'}
      </div>
    );
  }

  if (!membership?.isMember) {
    return (
      <div className="container py-12">
        {/* How It Works - Always visible */}
        <div className="endfield-card endfield-gradient p-5 md:p-7 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">
                {t('automation.workflowEngine') || 'Workflow Engine'}
              </p>
              <h1 className="text-3xl font-bold">{t('automation.title') || 'Automation'}</h1>
              <p className="text-muted-foreground">
                {t('automation.subtitle') || 'Connect n8n workflows to automate your business processes'}
              </p>
            </div>
          </div>
        </div>

        <div className="endfield-card p-5 md:p-6 mb-8">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            {t('automation.howItWorks') || 'How It Works'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">1</div>
              <p className="text-sm font-medium mb-1">{t('automation.step1Title') || 'Choose a Workflow'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step1Desc')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">2</div>
              <p className="text-sm font-medium mb-1">{t('automation.step2Title') || 'Activate It'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step2Desc')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">3</div>
              <p className="text-sm font-medium mb-1">{t('automation.step3Title') || 'Sit Back & Relax'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step3Desc')}
              </p>
            </div>
          </div>
        </div>

        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-8 text-center">
            <Crown className="mx-auto mb-4 text-yellow-500" size={48} />
            <h2 className="text-xl font-bold mb-2">{t('automation.premiumFeature') || 'Premium Feature'}</h2>
            <p className="text-muted-foreground mb-1">
              {t('automation.premiumDesc') || 'Workflow automation is available exclusively for Premium Members.'}
            </p>
            <p className="text-muted-foreground mb-6 text-sm">
              {t('automation.upgradeDesc') || 'Upgrade to Premium for Rp 10.000/month to unlock automated emails, inventory alerts, and more.'}
            </p>
            <Link to="/seller/dashboard">
              <Button className="gap-2">
                <Crown size={16} />
                {t('automation.upgradeOnDashboard') || 'Upgrade on Dashboard'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-10">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`automation-toast ${feedback.type === 'success' ? 'automation-toast-success' : 'automation-toast-error'}`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="endfield-card endfield-gradient p-5 md:p-7 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">
              {t('automation.workflowEngine') || 'Workflow Engine'}
            </p>
            <h1 className="text-3xl font-bold">{t('automation.title') || 'Automation'}</h1>
            <p className="text-muted-foreground">
              {t('automation.subtitle') || 'Connect n8n workflows to automate your business processes'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              to="/seller/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              <ArrowLeft size={18} />
              {t('nav.dashboard') || 'Dashboard'}
            </Link>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus size={18} />
              {t('automation.createWorkflow') || 'Create Workflow'}
            </Button>
          </div>
        </div>
      </div>

      {/* How It Works Info Box */}
      {workflows.length === 0 && !loading && (
        <div className="endfield-card p-5 md:p-6 mb-8">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            {t('automation.howItWorks') || 'How It Works'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">1</div>
              <p className="text-sm font-medium mb-1">{t('automation.step1Title') || 'Choose a Workflow'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step1Desc') || 'Pick the type of automation you want — order confirmations, inventory alerts, or welcome emails.'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">2</div>
              <p className="text-sm font-medium mb-1">{t('automation.step2Title') || 'Activate It'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step2Desc') || 'Click Create and you\'re done. Our platform handles the automation infrastructure for you.'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary mb-1">3</div>
              <p className="text-sm font-medium mb-1">{t('automation.step3Title') || 'Sit Back & Relax'}</p>
              <p className="text-xs text-muted-foreground">
                {t('automation.step3Desc') || 'When events occur (e.g. new orders), your automations trigger automatically.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 size={20} className="animate-spin" />
          {t('automation.loadingWorkflows') || 'Loading workflows…'}
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="mx-auto mb-4 text-muted-foreground" size={40} />
            <p className="text-muted-foreground mb-4">
              {t('automation.noWorkflows') || 'No workflows configured yet'}
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus size={16} />
              {t('automation.createFirstWorkflow') || 'Create Your First Workflow'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => {
            const meta = getWorkflowMeta(workflow.type);
            const Icon = meta.icon;
            return (
              <div key={workflow._id} className="endfield-card p-5 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Icon + Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className={`p-3 rounded-lg shrink-0 ${meta.bgColor}`}
                    >
                      <Icon size={24} className={meta.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <Badge
                          variant={
                            workflow.isActive ? 'default' : 'secondary'
                          }
                        >
                          {workflow.isActive ? (t('automation.active') || 'Active') : (t('automation.inactive') || 'Paused')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {meta.description}
                      </p>
                      {/* Webhook URL (truncated) */}
                      {/* Execution stats */}
                      <p className="text-xs text-muted-foreground mt-2">
                        Triggered {workflow.executionCount || 0} times
                        {workflow.lastExecuted && (
                          <>
                            {' '}
                            · Last run:{' '}
                            {new Date(
                              workflow.lastExecuted
                            ).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() =>
                        toggleWorkflow(workflow._id, workflow.isActive)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${workflow.isActive
                        ? 'bg-primary'
                        : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      title={
                        workflow.isActive
                          ? 'Pause workflow'
                          : 'Activate workflow'
                      }
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${workflow.isActive
                          ? 'translate-x-6'
                          : 'translate-x-1'
                          }`}
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWorkflow(workflow._id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Create Workflow Modal — rendered outside main content using a Portal to prevent bleed-through */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={20} className="text-primary" />
                {t('automation.createWorkflow') || 'Create Workflow'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createWorkflow} className="space-y-5">
                {/* Workflow Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('automation.selectType') || 'Workflow Type'}
                  </label>
                  <div className="space-y-2">
                    {workflowTypes.map((wt) => {
                      const WtIcon = wt.icon;
                      return (
                        <button
                          key={wt.value}
                          type="button"
                          className={`w-full p-3 border rounded-lg text-left transition-all flex items-center gap-3 ${newWorkflowType === wt.value
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted'
                            }`}
                          onClick={() => setNewWorkflowType(wt.value)}
                        >
                          <div
                            className={`p-2 rounded-md ${wt.bgColor}`}
                          >
                            <WtIcon size={18} className={wt.color} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {wt.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {wt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Name (Optional) */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t('automation.workflowName') || 'Workflow Name'}{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={getWorkflowMeta(newWorkflowType).label}
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewWorkflowName('');
                    }}
                  >
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-2"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('common.loading') || 'Creating…'}
                      </>
                    ) : (
                      t('automation.create') || 'Create'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Automation;
