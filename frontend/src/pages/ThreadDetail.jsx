import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, MessageSquare, Clock, Edit2, Trash2, Paperclip, Send, Image, File, ThumbsUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { getBackendUrl } from '../config';
import Layout from '@/components/layout/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import './Forum.css';

function ThreadDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [replyContent, setReplyContent] = useState('');
    const [replyFiles, setReplyFiles] = useState([]);

    const { data, isLoading } = useQuery({
        queryKey: ['forumThread', id],
        queryFn: async () => {
            const response = await api.get(`/forum/${id}`);
            return response.data;
        },
    });

    const likeMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post(`/forum/${id}/like`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['forumThread', id]);
        },
    });

    const replyMutation = useMutation({
        mutationFn: async (formData) => {
            const response = await api.post(`/forum/${id}/reply`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['forumThread', id]);
            setReplyContent('');
            setReplyFiles([]);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/forum/${id}`);
        },
        onSuccess: () => {
            navigate('/forum');
        },
    });

    const replyLikeMutation = useMutation({
        mutationFn: async (replyId) => {
            const response = await api.post(`/forum/reply/${replyId}/like`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['forumThread', id]);
        },
    });

    const handleReplySubmit = (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        const formData = new FormData();
        formData.append('content', replyContent);
        replyFiles.forEach(file => {
            formData.append('attachments', file);
        });

        replyMutation.mutate(formData);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setReplyFiles(prev => [...prev, ...files].slice(0, 3));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const isAuthor = user?._id === data?.thread?.author?._id || user?.id === data?.thread?.author?._id;

    if (isLoading) {
        return (
            <Layout>
                <div className="container py-8">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-32 w-full" />
                        <div className="space-y-2 pt-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!data?.thread) {
        return (
            <Layout>
                <div className="forum-page error container py-12 text-center">
                    <h2 className="text-2xl font-bold mb-4">Thread not found</h2>
                    <Link to="/forum" className="text-primary hover:underline">Back to Forum</Link>
                </div>
            </Layout>
        );
    }

    const { thread, replies } = data;

    return (
        <Layout>
            <div className="forum-page thread-detail-page container py-8 max-w-4xl">
                <div className="thread-header flex justify-between items-center mb-6">
                    <button className="btn-back inline-flex items-center gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/forum')}>
                        <ArrowLeft size={20} />
                        Back to Forum
                    </button>
                    {isAuthor && (
                        <div className="thread-actions flex gap-2">
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted bg-background" onClick={() => navigate(`/forum/${id}/edit`)}>
                                <Edit2 size={16} />
                                <span>Edit</span>
                            </button>
                            <button
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-md text-sm"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this thread?')) {
                                        deleteMutation.mutate();
                                    }
                                }}
                            >
                                <Trash2 size={16} />
                                <span>Delete</span>
                            </button>
                        </div>
                    )}
                </div>

                <article className="thread-content bg-card border rounded-xl p-6 md:p-8 shadow-sm mb-8">
                    <div className="thread-meta flex items-center gap-4 mb-4 text-sm">
                        <span className={`category-tag px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize font-medium ${thread.category}`}>
                            {thread.category}
                        </span>
                        <span className="view-count text-muted-foreground">{thread.viewCount} views</span>
                    </div>

                    <h1 className="text-3xl font-bold mb-6">{thread.title}</h1>

                    <div className="author-bar flex items-center gap-3 mb-8 pb-4 border-b">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {(thread.author?.businessName || thread.author?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="author-info">
                            <span className="author-name font-semibold block text-foreground">
                                {thread.author?.businessName || thread.author?.name}
                            </span>
                            <span className="post-time text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={12} />
                                {formatDate(thread.createdAt)}
                            </span>
                        </div>
                    </div>

                    <div className="thread-body space-y-6">
                        <p className="whitespace-pre-wrap leading-relaxed border-l-4 border-primary/20 pl-4 py-1">{thread.content}</p>

                        {thread.attachments?.length > 0 && (
                            <div className="attachments bg-muted/30 p-4 rounded-lg">
                                <h4 className="font-medium mb-3 text-sm">Attachments</h4>
                                <div className="attachment-list flex flex-wrap gap-4">
                                    {thread.attachments.map((att, i) => (
                                        <a
                                            key={i}
                                            href={`${getBackendUrl()}${att.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="attachment-item flex items-center gap-2 bg-background border p-2 rounded hover:border-primary transition-colors max-w-xs"
                                        >
                                            {att.mimetype?.startsWith('image/') ? (
                                                <div className="flex items-center gap-2">
                                                    <Image size={16} className="text-blue-500" />
                                                    <span className="text-xs truncate max-w-[150px]">{att.filename}</span>
                                                </div>
                                            ) : (
                                                <div className="file-attachment flex items-center gap-2">
                                                    <File size={16} className="text-orange-500" />
                                                    <span className="text-xs truncate max-w-[150px]">{att.filename}</span>
                                                </div>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="thread-engagement mt-8 pt-6 border-t flex gap-4">
                        <button
                            className={`like-btn flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${thread.likes?.includes(user?._id || user?.id) ? 'bg-red-50 border-red-200 text-red-500' : 'hover:bg-muted'}`}
                            onClick={() => likeMutation.mutate()}
                            disabled={!user}
                        >
                            <Heart size={18} className={thread.likes?.includes(user?._id || user?.id) ? 'fill-current' : ''} />
                            <span>{thread.likes?.length || 0} likes</span>
                        </button>
                        <span className="reply-count flex items-center gap-2 px-4 py-2 text-muted-foreground bg-muted/30 rounded-full">
                            <MessageSquare size={18} />
                            {replies?.length || 0} replies
                        </span>
                    </div>
                </article>

                <section className="replies-section">
                    <h2 className="text-xl font-bold mb-6">Replies ({replies?.length || 0})</h2>

                    {replies?.length === 0 ? (
                        <p className="no-replies text-muted-foreground italic mb-8">No replies yet. Be the first to respond!</p>
                    ) : (
                        <div className="replies-list space-y-4 mb-8">
                            {replies.map((reply) => (
                                <div key={reply._id} className="reply-card p-6 border rounded-lg bg-card">
                                    <div className="reply-header flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                                {(reply.author?.businessName || reply.author?.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="author-name font-medium block text-sm">
                                                    {reply.author?.businessName || reply.author?.name}
                                                </span>
                                                <span className="reply-time text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="reply-content text-sm leading-relaxed mb-4">{reply.content}</p>
                                    {reply.attachments?.length > 0 && (
                                        <div className="reply-attachments flex flex-wrap gap-2">
                                            {reply.attachments.map((att, i) => (
                                                <a
                                                    key={i}
                                                    href={`${getBackendUrl()}${att.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                                                >
                                                    <File size={12} />
                                                    <span className="truncate max-w-[100px]">{att.filename}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    <div className="reply-actions flex gap-4 mt-3 pt-3 border-t">
                                        <button
                                            className={`flex items-center gap-1.5 text-sm transition-colors ${reply.likes?.includes(user?._id || user?.id) ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                                            onClick={() => replyLikeMutation.mutate(reply._id)}
                                            disabled={!user || replyLikeMutation.isPending}
                                        >
                                            <ThumbsUp size={14} className={reply.likes?.includes(user?._id || user?.id) ? 'fill-current' : ''} />
                                            <span>{reply.likes?.length || 0}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {user ? (
                        <form className="reply-form bg-card border rounded-lg p-6 shadow-sm" onSubmit={handleReplySubmit}>
                            <h3 className="font-medium mb-4">Add a Reply</h3>
                            <textarea
                                placeholder="Write your reply..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                rows={4}
                                required
                                className="w-full p-3 border rounded-md mb-4 bg-background resize-y min-h-[100px]"
                            />

                            <div className="reply-form-footer flex justify-between items-center">
                                <div className="file-upload-section">
                                    <label className="file-upload-btn inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                                        <Paperclip size={16} />
                                        Attach Files
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf,.doc,.docx"
                                            onChange={handleFileChange}
                                            hidden
                                        />
                                    </label>
                                    {replyFiles.length > 0 && (
                                        <div className="selected-files flex flex-wrap gap-2 mt-2">
                                            {replyFiles.map((file, i) => (
                                                <span key={i} className="file-tag inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                                                    {file.name}
                                                    <button type="button" onClick={() => setReplyFiles(f => f.filter((_, idx) => idx !== i))} className="hover:text-destructive">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button type="submit" className="btn-submit inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90" disabled={replyMutation.isPending}>
                                    <Send size={16} />
                                    {replyMutation.isPending ? 'Posting...' : 'Post Reply'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="login-prompt p-6 bg-muted/50 rounded-lg text-center">
                            <p>Please <Link to="/login" className="text-primary hover:underline font-medium">log in</Link> to reply to this thread.</p>
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    );
}

export default ThreadDetail;
