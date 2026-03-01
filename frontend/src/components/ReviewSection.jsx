import { useState, useEffect } from 'react';
import { Star, Send, Trash2, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getApiUrl } from '../config';
import './ReviewSection.css';

const API_URL = getApiUrl();

function StarRating({ rating, onRate, interactive = false, size = 16 }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="star-rating" style={{ gap: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`star-btn ${interactive ? 'interactive' : ''}`}
                    onClick={() => interactive && onRate?.(star)}
                    onMouseEnter={() => interactive && setHover(star)}
                    onMouseLeave={() => interactive && setHover(0)}
                    disabled={!interactive}
                >
                    <Star
                        size={size}
                        className={
                            star <= (hover || rating)
                                ? 'star-filled'
                                : 'star-empty'
                        }
                    />
                </button>
            ))}
        </div>
    );
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

export default function ReviewSection({ productId }) {
    const { user, token } = useAuthStore();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newRating, setNewRating] = useState(0);
    const [newComment, setNewComment] = useState('');

    const fetchReviews = async () => {
        try {
            const res = await fetch(`${API_URL}/products/${productId}/reviews`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data);
            }
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (productId) fetchReviews();
    }, [productId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newRating || !token) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    productId,
                    rating: newRating,
                    comment: newComment,
                }),
            });
            if (res.ok) {
                setNewRating(0);
                setNewComment('');
                fetchReviews();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to submit review');
            }
        } catch (err) {
            alert('Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!confirm('Delete this review?')) return;
        try {
            await fetch(`${API_URL}/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchReviews();
        } catch (err) {
            console.error('Failed to delete review:', err);
        }
    };

    const hasUserReview = reviews.some((r) => r.user === user?._id);
    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    // Rating distribution
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
        pct: reviews.length > 0
            ? (reviews.filter((r) => r.rating === star).length / reviews.length * 100)
            : 0,
    }));

    return (
        <div className="review-section">
            <h3 className="review-section-title">
                <Star size={20} className="star-filled" />
                Reviews ({reviews.length})
            </h3>

            {/* Rating Summary */}
            {reviews.length > 0 && (
                <div className="review-summary">
                    <div className="review-summary-score">
                        <span className="review-avg">{avgRating}</span>
                        <StarRating rating={Math.round(parseFloat(avgRating))} size={18} />
                        <span className="review-count">{reviews.length} reviews</span>
                    </div>
                    <div className="review-distribution">
                        {distribution.map((d) => (
                            <div key={d.star} className="distribution-row">
                                <span className="dist-label">{d.star}★</span>
                                <div className="dist-bar">
                                    <div className="dist-fill" style={{ width: `${d.pct}%` }} />
                                </div>
                                <span className="dist-count">{d.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Write Review Form */}
            {user && !hasUserReview && (
                <form className="review-form" onSubmit={handleSubmit}>
                    <div className="review-form-header">
                        <span>Rate this product:</span>
                        <StarRating rating={newRating} onRate={setNewRating} interactive size={24} />
                    </div>
                    <textarea
                        className="review-textarea"
                        placeholder="Share your experience with this product..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                    />
                    <button
                        type="submit"
                        className="review-submit-btn"
                        disabled={!newRating || submitting}
                    >
                        <Send size={16} />
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </form>
            )}

            {/* Review List */}
            {loading ? (
                <div className="review-loading">Loading reviews...</div>
            ) : reviews.length === 0 ? (
                <div className="review-empty">
                    <Star size={32} style={{ opacity: 0.3 }} />
                    <p>No reviews yet. Be the first to review!</p>
                </div>
            ) : (
                <div className="review-list">
                    {reviews.map((review) => (
                        <div key={review._id} className="review-card">
                            <div className="review-card-header">
                                <div className="review-avatar">
                                    <User size={16} />
                                </div>
                                <div className="review-meta">
                                    <span className="review-author">{review.userName}</span>
                                    <span className="review-date">{formatDate(review.createdAt)}</span>
                                </div>
                                <StarRating rating={review.rating} size={14} />
                                {user?._id === review.user && (
                                    <button
                                        className="review-delete-btn"
                                        onClick={() => handleDelete(review._id)}
                                        title="Delete review"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            {review.comment && (
                                <p className="review-comment">{review.comment}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
