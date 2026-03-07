import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, ExternalLink, Globe, Gamepad2, Smartphone, Folder, 
  Clock, User, Tag, X, Loader2 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const categories = [
  { id: 'all', icon: Folder, label: 'All Projects' },
  { id: 'website', icon: Globe, label: 'Websites' },
  { id: 'game', icon: Gamepad2, label: 'Games' },
  { id: 'app', icon: Smartphone, label: 'Apps' },
  { id: 'other', icon: Folder, label: 'Other' },
];

function Projects() {
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    link: '',
    category: 'website',
    tags: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(searchQuery && { search: searchQuery }),
      });
      const response = await api.get(`/projects?${params}`);
      return response.data;
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData) => {
      const response = await api.post('/projects', projectData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setIsCreateDialogOpen(false);
      setNewProject({
        name: '',
        description: '',
        link: '',
        category: 'website',
        tags: '',
      });
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
    },
  });

  const handleCreateProject = (e) => {
    e.preventDefault();
    const projectData = {
      ...newProject,
      tags: newProject.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };
    createProjectMutation.mutate(projectData);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon size={16} />;
    }
    return <Folder size={16} />;
  };

  const projects = data?.projects || [];
  const total = data?.total || 0;

  return (
    <div className="projects-page min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Projects</h1>
            <p className="text-muted-foreground text-lg mb-8">
              Discover and share amazing projects built by our community
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Search projects by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg bg-background border-2 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="md:w-64 flex-shrink-0">
            <div className="sticky top-8 space-y-6">
              {/* Categories */}
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="font-semibold mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Create Button */}
              {isAuthenticated && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full gap-2" size="lg">
                      <Plus size={20} />
                      Share Your Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Share Your Project</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                          id="name"
                          value={newProject.name}
                          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                          placeholder="My Awesome Project"
                          required
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          value={newProject.description}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          placeholder="Tell us about your project..."
                          required
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="link">Project Link *</Label>
                        <Input
                          id="link"
                          type="url"
                          value={newProject.link}
                          onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                          placeholder="https://myproject.com"
                          required
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <select
                          id="category"
                          value={newProject.category}
                          onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
                          required
                        >
                          <option value="website">Website</option>
                          <option value="game">Game</option>
                          <option value="app">App</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="tags">Tags (comma separated)</Label>
                        <Input
                          id="tags"
                          value={newProject.tags}
                          onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                          placeholder="react, nodejs, portfolio"
                          className="mt-1"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createProjectMutation.isPending}
                      >
                        {createProjectMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Project'
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </aside>

          {/* Projects Grid */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {isLoading ? 'Loading...' : `${total} project${total !== 1 ? 's' : ''} found`}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-lg border overflow-hidden animate-pulse">
                    <div className="h-40 bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-6 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16">
                <Folder className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to share your project with the community!
                </p>
                {isAuthenticated && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Share Your Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div
                    key={project._id}
                    className="bg-gray-100 dark:bg-gray-800 rounded-lg border overflow-hidden hover:shadow-lg transition-shadow group"
                  >
                    {/* Project Image */}
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                      {project.image ? (
                        <img
                          src={project.image}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getCategoryIcon(project.category)}
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium">
                          {getCategoryIcon(project.category)}
                          {project.category}
                        </span>
                      </div>
                    </div>
                    
                    {/* Project Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {project.description}
                      </p>
                      
                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {project.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-muted rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            {project.userAvatar ? (
                              <img
                                src={project.userAvatar}
                                alt={project.username}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <User size={14} />
                            )}
                          </div>
                          <span className="text-xs">{project.username}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(project.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Link Button */}
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <ExternalLink size={16} />
                        View Project
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Projects;
