import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, ExternalLink, Share2, Globe, Gamepad2, Smartphone, 
  Folder, User, Tag, Calendar, Loader2, Pencil, Trash2
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const categories = {
  website: { id: 'website', name: 'Website', icon: Globe, color: 'bg-blue-100 text-blue-700' },
  game: { id: 'game', name: 'Game', icon: Gamepad2, color: 'bg-purple-100 text-purple-700' },
  app: { id: 'app', name: 'App', icon: Smartphone, color: 'bg-green-100 text-green-700' },
  other: { id: 'other', name: 'Other', icon: Folder, color: 'bg-gray-100 text-gray-700' },
};

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    link: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      navigate('/projects');
    },
    onError: (error) => {
      alert('Failed to delete project');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/projects/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['project', id]);
      queryClient.invalidateQueries(['projects']);
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      alert('Failed to update project');
    },
  });

  const isOwner = user && project && user._id === project.userId;

  const handleOpenEdit = () => {
    setEditForm({
      name: project.name,
      description: project.description,
      link: project.link,
      category: project.category,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.description.trim() || !editForm.link.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await updateMutation.mutateAsync(editForm);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate();
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleOpenLink = () => {
    window.open(project.link, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const categoryInfo = categories[project?.category] || categories.other;
  const CategoryIcon = categoryInfo.icon;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
      </div>
    );
  }

  const images = project.images && project.images.length > 0 
    ? project.images 
    : project.image 
      ? [project.image] 
      : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/projects')} className="gap-2">
            <ArrowLeft size={20} />
            Back to Projects
          </Button>
          
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                <Pencil size={16} className="mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600">
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            {images.length > 0 ? (
              <>
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={images[0]} 
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, index) => (
                      <button
                        key={index}
                        className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <Folder className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="space-y-6">
            {/* Category Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${categoryInfo.color}`}>
              <CategoryIcon size={16} />
              <span className="font-medium">{categoryInfo.name}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold">{project.name}</h1>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {project.userAvatar ? (
                  <img 
                    src={project.userAvatar} 
                    alt={project.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">{project.username || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(project.createdAt)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            </div>

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    <Tag size={14} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleOpenLink} size="lg" className="flex-1 gap-2">
                <ExternalLink size={20} />
                View Project
              </Button>
              <Button variant="outline" size="lg" onClick={handleShare}>
                <Share2 size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1"
                rows={4}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-link">Project Link *</Label>
              <Input
                id="edit-link"
                type="url"
                value={editForm.link}
                onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-category">Category *</Label>
              <select
                id="edit-category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
                required
              >
                <option value="website">Website</option>
                <option value="game">Game</option>
                <option value="app">App</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectDetail;
