import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Plus, Eye, Heart, Clock, Search, Filter } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import Layout from '@/components/layout/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import './Forum.css';

const categoryKeys = [
    { id: 'all', key: 'allTopics', icon: '📋' },
    { id: 'general', key: 'general', icon: '💬' },
    { id: 'products', key: 'productsCategory', icon: '🛍️' },
    { id: 'tips', key: 'tipsAndTricks', icon: '💡' },
    { id: 'help', key: 'helpAndSupport', icon: '🆘' },
    { id: 'announcements', key: 'announcements', icon: '📢' },
];

function Forum() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['forumThreads', selectedCategory, searchQuery, page, user?._id || user?.id],
        queryFn: async () => {
            const params = new URLSearchParams({
                page,
                limit: 20,
                ...(selectedCategory !== 'all' && { category: selectedCategory }),
                ...(searchQuery && { search: searchQuery }),
            });
            const response = await api.get(`/forum?${params}`);
            return response.data;
        },
    });

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

    return (
        <Layout>
            <div className="forum-page container py-8">
                <div className="forum-header flex justify-between items-center mb-8 pb-8 border-b">
                    <div className="header-content">
                        <h1 className="text-3xl font-bold mb-1">{t('forum.communityForum')}</h1>
                        <p className="text-muted-foreground">{t('forum.discussWith')}</p>
                    </div>
                    {user && (
                        <button className="btn-new-thread inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90" onClick={() => navigate('/forum/new')}>
                            <Plus size={20} />
                            {t('forum.newThread')}
                        </button>
                    )}
                </div>

                <div className="forum-layout grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="forum-sidebar space-y-6">
                        <div className="search-box relative">
                            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={t('forum.searchDiscussions')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 p-2 border rounded-md"
                            />
                        </div>

                        <div className="category-list border rounded-lg overflow-hidden bg-card">
                            <h3 className="font-semibold p-4 bg-muted/50 border-b">{t('forum.categories')}</h3>
                            <div className="flex flex-col">
                                {categoryKeys.map((cat) => (
                                    <button
                                        key={cat.id}
                                        className={`category-btn flex items-center gap-3 p-3 hover:bg-muted text-left transition-colors border-b last:border-0 ${selectedCategory === cat.id ? 'bg-primary/5 text-primary font-medium' : ''}`}
                                        onClick={() => setSelectedCategory(cat.id)}
                                    >
                                        <span className="cat-icon">{cat.icon}</span>
                                        <span>{t(`forum.${cat.key}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <main className="forum-main lg:col-span-3">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="border rounded-lg p-6 bg-card">
                                        <Skeleton className="h-6 w-3/4 mb-2" />
                                        <Skeleton className="h-4 w-full mb-1" />
                                        <Skeleton className="h-4 w-2/3 mb-4" />
                                        <div className="flex gap-4">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : data?.threads?.length === 0 ? (
                            <div className="empty-state text-center py-16 border rounded-lg bg-card bg-muted/10">
                                <MessageSquare size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <h3 className="text-xl font-semibold mb-2">{t('forum.noDiscussionsYet')}</h3>
                                <p className="text-muted-foreground mb-6">{t('forum.beFirst')}</p>
                                {user && (
                                    <button className="btn-primary px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90" onClick={() => navigate('/forum/new')}>
                                        {t('forum.startDiscussion')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="threads-list space-y-4">
                                    {data?.threads?.map((thread) => (
                                        <Link to={`/forum/${thread._id}`} key={thread._id} className="thread-card block p-6 border rounded-lg bg-card hover:border-primary/50 hover:shadow-sm transition-all">
                                            <div className="thread-main">
                                                <div className="thread-meta-top flex items-center gap-2 mb-2 text-xs">
                                                    <span className={`category-tag px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1 ${thread.category}`}>
                                                        {categoryKeys.find(c => c.id === thread.category)?.icon} <span className="capitalize">{thread.category}</span>
                                                    </span>
                                                    {thread.isPinned && <span className="pinned-badge bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">📌 {t('forum.pinned')}</span>}
                                                </div>
                                                <h3 className="thread-title text-xl font-semibold mb-2 group-hover:text-primary">{thread.title}</h3>
                                                <p className="thread-excerpt text-muted-foreground mb-4 line-clamp-2">
                                                    {thread.content}
                                                </p>
                                                <div className="thread-footer flex justify-between items-center text-sm text-muted-foreground border-t pt-4 mt-4">
                                                    <div className="author-info flex items-center gap-2">
                                                        <span className="author-name font-medium text-foreground">
                                                            {thread.author?.businessName || thread.author?.name}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="post-time flex items-center gap-1">
                                                            <Clock size={14} />
                                                            {formatDate(thread.createdAt)}
                                                        </span>
                                                    </div>
                                                    <div className="thread-stats flex items-center gap-4">
                                                        <span className="flex items-center gap-1" title="Views"><Eye size={14} /> {thread.viewCount}</span>
                                                        <span className="flex items-center gap-1" title="Likes"><Heart size={14} /> {thread.likes?.length || 0}</span>
                                                        <span className="flex items-center gap-1" title="Replies"><MessageSquare size={14} /> {thread.replyCount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {data?.totalPages > 1 && (
                                    <div className="pagination flex justify-center items-center gap-4 mt-8">
                                        <button
                                            className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-muted"
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                        >
                                            {t('forum.previous')}
                                        </button>
                                        <span className="text-sm">{t('forum.page')} {page} / {data.totalPages}</span>
                                        <button
                                            className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-muted"
                                            disabled={page === data.totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            {t('forum.next')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </Layout>
    );
}

export default Forum;
