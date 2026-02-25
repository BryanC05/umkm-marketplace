import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, ScrollView } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ===== Base Skeleton Element =====
export function Skeleton({ width: w = '100%', height = 20, borderRadius = 8, style = {} }) {
    const { colors, isDarkMode } = useThemeStore();
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width: w,
                    height,
                    borderRadius,
                    backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
                    opacity,
                },
                style,
            ]}
        />
    );
}

// ===== Home Screen Skeleton =====
// Matches: hero banner → stats row → categories → product grid
export function HomeScreenSkeleton() {
    const { colors, isDarkMode } = useThemeStore();

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
            {/* Hero banner */}
            <View style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 20, paddingTop: 60, paddingBottom: 36,
                borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
            }}>
                <Skeleton width="70%" height={28} borderRadius={6} style={{ marginBottom: 10 }} />
                <Skeleton width="50%" height={28} borderRadius={6} style={{ marginBottom: 12 }} />
                <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 8, opacity: 0.5 }} />
                <Skeleton width="75%" height={14} borderRadius={4} style={{ marginBottom: 18, opacity: 0.5 }} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Skeleton width="48%" height={44} borderRadius={12} />
                    <Skeleton width="48%" height={44} borderRadius={12} />
                </View>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: -16, gap: 10, marginBottom: 24 }}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={{
                        flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14,
                        alignItems: 'center', gap: 6,
                    }}>
                        <Skeleton width={24} height={24} borderRadius={12} />
                        <Skeleton width={30} height={20} borderRadius={4} />
                        <Skeleton width={50} height={12} borderRadius={4} />
                    </View>
                ))}
            </View>

            {/* Category section header */}
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <Skeleton width={120} height={18} borderRadius={4} />
            </View>

            {/* Category chips scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 24 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={{
                        backgroundColor: colors.card, borderRadius: 14, padding: 14,
                        alignItems: 'center', width: 100, marginRight: 10,
                        borderWidth: 1, borderColor: colors.border,
                    }}>
                        <Skeleton width={32} height={32} borderRadius={16} style={{ marginBottom: 6 }} />
                        <Skeleton width={60} height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                        <Skeleton width={20} height={10} borderRadius={4} />
                    </View>
                ))}
            </ScrollView>

            {/* Featured section header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
                <Skeleton width={140} height={18} borderRadius={4} />
                <Skeleton width={50} height={14} borderRadius={4} />
            </View>

            {/* Product cards horizontal */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={{
                        width: (width - 64) / 2, marginRight: 12,
                        backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden',
                        borderWidth: 1, borderColor: colors.border,
                    }}>
                        <Skeleton width="100%" height={140} borderRadius={0} />
                        <View style={{ padding: 12, gap: 6 }}>
                            <Skeleton width="85%" height={14} borderRadius={4} />
                            <Skeleton width="55%" height={12} borderRadius={4} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                <Skeleton width={70} height={16} borderRadius={4} />
                                <Skeleton width={24} height={16} borderRadius={4} />
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

// ===== Products Screen Skeleton =====
// Matches: search bar + filter → category chips → 2-column product grid
export function ProductsScreenSkeleton() {
    const { colors } = useThemeStore();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Search bar */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
                <View style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, height: 44,
                    borderWidth: 1, borderColor: colors.border,
                }}>
                    <Skeleton width={18} height={18} borderRadius={9} />
                    <Skeleton width="70%" height={14} borderRadius={4} />
                </View>
                <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
                    borderWidth: 1, borderColor: colors.border,
                }}>
                    <Skeleton width={18} height={18} borderRadius={4} />
                </View>
            </View>

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton
                        key={i}
                        width={i === 1 ? 50 : 80 + Math.random() * 20}
                        height={34}
                        borderRadius={20}
                        style={{ marginRight: 8 }}
                    />
                ))}
            </ScrollView>

            {/* Product grid (2 columns) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <View key={i} style={{
                        width: (width - 44) / 2,
                        backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden',
                        borderWidth: 1, borderColor: colors.border,
                    }}>
                        <Skeleton width="100%" height={140} borderRadius={0} />
                        <View style={{ padding: 10, gap: 6 }}>
                            <Skeleton width="80%" height={13} borderRadius={4} />
                            <Skeleton width="50%" height={11} borderRadius={4} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                <Skeleton width={65} height={16} borderRadius={4} />
                                <Skeleton width={22} height={14} borderRadius={4} />
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ===== Product Detail Skeleton =====
// Matches: large image → title/price → seller info → description → reviews
export function ProductDetailSkeleton() {
    const { colors } = useThemeStore();

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
            {/* Image carousel */}
            <Skeleton width={width} height={width * 0.8} borderRadius={0} />

            <View style={{ padding: 16, gap: 12 }}>
                {/* Category + badge */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Skeleton width={60} height={22} borderRadius={11} />
                    <Skeleton width={50} height={22} borderRadius={11} />
                </View>

                {/* Title */}
                <Skeleton width="90%" height={22} borderRadius={4} />
                <Skeleton width="60%" height={22} borderRadius={4} />

                {/* Price */}
                <Skeleton width={120} height={28} borderRadius={6} style={{ marginTop: 4 }} />

                {/* Rating row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Skeleton width={90} height={16} borderRadius={4} />
                    <Skeleton width={60} height={14} borderRadius={4} />
                </View>

                {/* Seller card */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8,
                    backgroundColor: colors.card, borderRadius: 14, padding: 14,
                    borderWidth: 1, borderColor: colors.border,
                }}>
                    <Skeleton width={44} height={44} borderRadius={22} />
                    <View style={{ flex: 1, gap: 6 }}>
                        <Skeleton width="60%" height={14} borderRadius={4} />
                        <Skeleton width="40%" height={12} borderRadius={4} />
                    </View>
                    <Skeleton width={60} height={30} borderRadius={8} />
                </View>

                {/* Description */}
                <Skeleton width={100} height={16} borderRadius={4} style={{ marginTop: 12 }} />
                <Skeleton width="100%" height={12} borderRadius={4} />
                <Skeleton width="95%" height={12} borderRadius={4} />
                <Skeleton width="70%" height={12} borderRadius={4} />

                {/* Add to cart button */}
                <Skeleton width="100%" height={50} borderRadius={14} style={{ marginTop: 16 }} />
            </View>
        </ScrollView>
    );
}

// ===== Order Card Skeleton =====
// Matches: order ID + status → seller name → item row → total + action
export function OrderSkeleton() {
    const { colors } = useThemeStore();

    return (
        <View style={{
            backgroundColor: colors.card, borderRadius: 14, padding: 16,
            marginHorizontal: 16, marginVertical: 6,
            borderWidth: 1, borderColor: colors.border,
        }}>
            {/* Header: order ID + status badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ gap: 4 }}>
                    <Skeleton width={100} height={13} borderRadius={4} />
                    <Skeleton width={70} height={11} borderRadius={4} />
                </View>
                <Skeleton width={72} height={24} borderRadius={12} />
            </View>

            {/* Divider */}
            <Skeleton width="100%" height={1} borderRadius={0} style={{ marginBottom: 12 }} />

            {/* Item row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <Skeleton width={56} height={56} borderRadius={10} />
                <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="75%" height={14} borderRadius={4} />
                    <Skeleton width="40%" height={12} borderRadius={4} />
                    <Skeleton width={60} height={14} borderRadius={4} />
                </View>
            </View>

            {/* Footer: total + button */}
            <Skeleton width="100%" height={1} borderRadius={0} style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 4 }}>
                    <Skeleton width={50} height={11} borderRadius={4} />
                    <Skeleton width={90} height={18} borderRadius={4} />
                </View>
                <Skeleton width={80} height={34} borderRadius={10} />
            </View>
        </View>
    );
}

// ===== Orders Screen Skeleton =====
// Matches: tab bar → order cards
export function OrdersScreenSkeleton({ count = 3 }) {
    const { colors } = useThemeStore();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Status tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, paddingLeft: 16, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton
                        key={i}
                        width={70 + Math.random() * 20}
                        height={32}
                        borderRadius={16}
                        style={{ marginRight: 8, marginTop: 8 }}
                    />
                ))}
            </ScrollView>

            {/* Order cards */}
            {Array.from({ length: count }).map((_, i) => (
                <OrderSkeleton key={i} />
            ))}
        </View>
    );
}

// ===== Chat / Messages Skeleton =====
// Matches: avatar → name + last message + time
export function ChatSkeleton() {
    const { colors } = useThemeStore();

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            padding: 16, backgroundColor: colors.card,
            borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="50%" height={15} borderRadius={4} />
                <Skeleton width="75%" height={12} borderRadius={4} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Skeleton width={40} height={11} borderRadius={4} />
                <Skeleton width={20} height={20} borderRadius={10} />
            </View>
        </View>
    );
}

// ===== Messages Screen Skeleton =====
export function MessagesScreenSkeleton({ count = 5 }) {
    const { colors } = useThemeStore();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Search bar */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <Skeleton width="100%" height={40} borderRadius={12} />
            </View>
            {Array.from({ length: count }).map((_, i) => (
                <ChatSkeleton key={i} />
            ))}
        </View>
    );
}

// ===== Product Card Skeleton =====
// Matches: image → name → seller → price + rating
export function ProductCardSkeleton() {
    const { colors } = useThemeStore();

    return (
        <View style={{
            backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden',
            margin: 6, width: (width - 48) / 2,
            borderWidth: 1, borderColor: colors.border,
        }}>
            <Skeleton width="100%" height={140} borderRadius={0} />
            <View style={{ padding: 10, gap: 6 }}>
                <Skeleton width="80%" height={13} borderRadius={4} />
                <Skeleton width="55%" height={11} borderRadius={4} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Skeleton width={65} height={16} borderRadius={4} />
                    <Skeleton width={22} height={14} borderRadius={4} />
                </View>
            </View>
        </View>
    );
}

// ===== Seller Card Skeleton =====
export function SellerCardSkeleton() {
    const { colors } = useThemeStore();

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: colors.card, padding: 16,
            marginHorizontal: 16, marginVertical: 6, borderRadius: 14,
            borderWidth: 1, borderColor: colors.border,
        }}>
            <Skeleton width={50} height={50} borderRadius={25} />
            <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="55%" height={15} borderRadius={4} />
                <Skeleton width="35%" height={12} borderRadius={4} />
                <Skeleton width="70%" height={12} borderRadius={4} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Skeleton width={50} height={20} borderRadius={10} />
                <Skeleton width={40} height={16} borderRadius={8} />
            </View>
        </View>
    );
}

// ===== Nearby Sellers Screen Skeleton =====
export function NearbySellersSkeleton() {
    const { colors } = useThemeStore();
    const insets = useSafeAreaInsets();

    return (
        <View style={[{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top + 60,
        }]}>
            <View style={{
                flex: 1,
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 16,
                paddingHorizontal: 12,
            }}>
                <View style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Skeleton width="100%" height={44} borderRadius={12} />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <Skeleton width={60} height={28} borderRadius={20} />
                        <Skeleton width={60} height={28} borderRadius={20} />
                        <Skeleton width={60} height={28} borderRadius={20} />
                        <Skeleton width={60} height={28} borderRadius={20} />
                    </View>
                </View>
                {Array.from({ length: 5 }).map((_, i) => (
                    <View key={i} style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        minHeight: 92,
                    }}>
                        <Skeleton width={32} height={32} borderRadius={16} />
                        <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                            <Skeleton width="60%" height={15} borderRadius={4} />
                            <Skeleton width="40%" height={12} borderRadius={4} />
                            <Skeleton width="80%" height={11} borderRadius={4} />
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 8, minHeight: 72 }}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Skeleton width={50} height={20} borderRadius={10} />
                                <Skeleton width={50} height={20} borderRadius={10} />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Skeleton width={34} height={34} borderRadius={17} />
                                <Skeleton width={34} height={34} borderRadius={17} />
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ===== Business Detail Skeleton =====
export function BusinessDetailSkeleton() {
    const { colors } = useThemeStore();

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', padding: 20 }}>
                <Skeleton width={100} height={100} borderRadius={50} />
                <Skeleton width={150} height={22} borderRadius={4} style={{ marginTop: 16 }} />
                <Skeleton width={80} height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 20 }}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={{
                        backgroundColor: colors.card, borderRadius: 12, padding: 14,
                        alignItems: 'center', width: (width - 64) / 3,
                        borderWidth: 1, borderColor: colors.border,
                    }}>
                        <Skeleton width={30} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
                        <Skeleton width={50} height={12} borderRadius={4} />
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                <Skeleton width={90} height={36} borderRadius={8} />
                <Skeleton width={90} height={36} borderRadius={8} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
                {[1, 2, 3, 4].map(i => (
                    <ProductCardSkeleton key={i} />
                ))}
            </View>
        </ScrollView>
    );
}

// ===== Forum Skeleton =====
export function ForumScreenSkeleton({ count = 4 }) {
    const { colors } = useThemeStore();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* New post button */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <Skeleton width="100%" height={44} borderRadius={12} />
            </View>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={{
                    backgroundColor: colors.card, borderRadius: 14, padding: 16,
                    marginHorizontal: 16, marginBottom: 10,
                    borderWidth: 1, borderColor: colors.border,
                }}>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                        <Skeleton width={36} height={36} borderRadius={18} />
                        <View style={{ flex: 1, gap: 4 }}>
                            <Skeleton width="40%" height={14} borderRadius={4} />
                            <Skeleton width="25%" height={11} borderRadius={4} />
                        </View>
                    </View>
                    <Skeleton width="85%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="100%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                    <Skeleton width="70%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <Skeleton width={50} height={14} borderRadius={4} />
                        <Skeleton width={50} height={14} borderRadius={4} />
                    </View>
                </View>
            ))}
        </View>
    );
}

// ===== Notifications Skeleton =====
export function NotificationsScreenSkeleton({ count = 5 }) {
    const { colors } = useThemeStore();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={{
                    flexDirection: 'row', gap: 12, padding: 16,
                    backgroundColor: colors.card,
                    borderBottomWidth: 1, borderBottomColor: colors.border,
                }}>
                    <Skeleton width={40} height={40} borderRadius={12} />
                    <View style={{ flex: 1, gap: 6 }}>
                        <Skeleton width="60%" height={14} borderRadius={4} />
                        <Skeleton width="90%" height={12} borderRadius={4} />
                        <Skeleton width="30%" height={11} borderRadius={4} />
                    </View>
                    <Skeleton width={8} height={8} borderRadius={4} />
                </View>
            ))}
        </View>
    );
}

// ===== Wishlist Skeleton =====
export function WishlistScreenSkeleton({ count = 4 }) {
    const { colors } = useThemeStore();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
                {Array.from({ length: count }).map((_, i) => (
                    <View key={i} style={{
                        width: (width - 44) / 2,
                        backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden',
                        borderWidth: 1, borderColor: colors.border,
                    }}>
                        <Skeleton width="100%" height={140} borderRadius={0} />
                        <View style={{ padding: 10, gap: 6 }}>
                            <Skeleton width="80%" height={13} borderRadius={4} />
                            <Skeleton width="55%" height={11} borderRadius={4} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                <Skeleton width={65} height={16} borderRadius={4} />
                                <Skeleton width={24} height={24} borderRadius={12} />
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ===== List Wrappers =====
export function OrdersListSkeleton({ count = 3 }) {
    return <OrdersScreenSkeleton count={count} />;
}

export function ProductsListSkeleton({ count = 6 }) {
    return <ProductsScreenSkeleton />;
}

export function SellerListSkeleton({ count = 5 }) {
    return (
        <View style={{ flex: 1, paddingTop: 8 }}>
            {Array.from({ length: count }).map((_, i) => (
                <SellerCardSkeleton key={i} />
            ))}
        </View>
    );
}

// ===== Default Export =====
export default function LoadingSkeleton({ variant = 'spinner' }) {
    if (variant === 'home') return <HomeScreenSkeleton />;
    if (variant === 'products') return <ProductsScreenSkeleton />;
    if (variant === 'product-detail') return <ProductDetailSkeleton />;
    if (variant === 'order') return <OrderSkeleton />;
    if (variant === 'orders') return <OrdersScreenSkeleton />;
    if (variant === 'product-card') return <ProductCardSkeleton />;
    if (variant === 'seller-card') return <SellerCardSkeleton />;
    if (variant === 'business-detail') return <BusinessDetailSkeleton />;
    if (variant === 'chat') return <ChatSkeleton />;
    if (variant === 'messages') return <MessagesScreenSkeleton />;
    if (variant === 'orders-list') return <OrdersScreenSkeleton />;
    if (variant === 'products-list') return <ProductsScreenSkeleton />;
    if (variant === 'sellers-list') return <SellerListSkeleton />;
    if (variant === 'forum') return <ForumScreenSkeleton />;
    if (variant === 'notifications') return <NotificationsScreenSkeleton />;
    if (variant === 'wishlist') return <WishlistScreenSkeleton />;

    const { colors } = useThemeStore();
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
            <Skeleton width={40} height={40} borderRadius={20} />
        </View>
    );
}
