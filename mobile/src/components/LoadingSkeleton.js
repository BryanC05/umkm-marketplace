import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const shimmerAnimation = (animatedValue) => {
    return animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-150, 250],
    });
};

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style = {} }) {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue]);

    const translateX = shimmerAnimation(animatedValue);

    return (
        <View style={[styles.skeletonContainer, { width, height, borderRadius }, style]}>
            <Animated.View
                style={[
                    styles.shimmer,
                    {
                        transform: [{ translateX }],
                    },
                ]}
            />
        </View>
    );
}

export function OrderSkeleton() {
    return (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <Skeleton width={80} height={16} />
                <Skeleton width={60} height={14} borderRadius={10} />
            </View>
            <View style={styles.orderContent}>
                <Skeleton width={50} height={50} borderRadius={8} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Skeleton width="80%" height={14} />
                    <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
                </View>
            </View>
            <Skeleton width="100%" height={1} style={{ marginVertical: 12 }} />
            <View style={styles.orderFooter}>
                <Skeleton width={80} height={16} />
                <Skeleton width={60} height={24} borderRadius={12} />
            </View>
        </View>
    );
}

export function ProductCardSkeleton() {
    return (
        <View style={styles.productCard}>
            <Skeleton width="100%" height={120} borderRadius={8} />
            <View style={{ padding: 8 }}>
                <Skeleton width="90%" height={14} />
                <Skeleton width="60%" height={12} style={{ marginTop: 6 }} />
                <Skeleton width={80} height={16} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
}

export function SellerCardSkeleton() {
    return (
        <View style={styles.sellerCard}>
            <Skeleton width={50} height={50} borderRadius={25} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} style={{ marginTop: 4 }} />
                <Skeleton width="80%" height={12} style={{ marginTop: 4 }} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Skeleton width={50} height={20} borderRadius={10} />
                <Skeleton width={40} height={16} style={{ marginTop: 4 }} borderRadius={8} />
            </View>
        </View>
    );
}

export function BusinessDetailSkeleton() {
    return (
        <View style={styles.businessDetail}>
            <Skeleton width={100} height={100} borderRadius={50} />
            <View style={{ alignItems: 'center', marginTop: 16 }}>
                <Skeleton width={150} height={24} />
                <Skeleton width={80} height={14} style={{ marginTop: 8 }} />
            </View>
            <View style={styles.statsRow}>
                <Skeleton width={80} height={40} borderRadius={8} />
                <Skeleton width={80} height={40} borderRadius={8} />
                <Skeleton width={80} height={40} borderRadius={8} />
            </View>
            <View style={styles.tabs}>
                <Skeleton width={80} height={36} borderRadius={8} />
                <Skeleton width={80} height={36} borderRadius={8} />
            </View>
            <View style={styles.productGrid}>
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
            </View>
        </View>
    );
}

export function ChatSkeleton() {
    return (
        <View style={styles.chatItem}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="70%" height={12} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={40} height={12} />
        </View>
    );
}

export function OrdersListSkeleton({ count = 3 }) {
    return (
        <View style={styles.ordersList}>
            {Array.from({ length: count }).map((_, i) => (
                <OrderSkeleton key={i} />
            ))}
        </View>
    );
}

export function ProductsListSkeleton({ count = 6 }) {
    return (
        <View style={styles.productsGrid}>
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </View>
    );
}

export function SellerListSkeleton({ count = 5 }) {
    return (
        <View style={styles.sellersList}>
            {Array.from({ length: count }).map((_, i) => (
                <SellerCardSkeleton key={i} />
            ))}
        </View>
    );
}

export default function LoadingSkeleton({ variant = 'spinner' }) {
    if (variant === 'order') return <OrderSkeleton />;
    if (variant === 'product-card') return <ProductCardSkeleton />;
    if (variant === 'seller-card') return <SellerCardSkeleton />;
    if (variant === 'business-detail') return <BusinessDetailSkeleton />;
    if (variant === 'chat') return <ChatSkeleton />;
    if (variant === 'orders-list') return <OrdersListSkeleton />;
    if (variant === 'products-list') return <ProductsListSkeleton />;
    if (variant === 'sellers-list') return <SellerListSkeleton />;
    
    return (
        <View style={styles.container}>
            <Skeleton width={40} height={40} borderRadius={20} />
        </View>
    );
}

const styles = StyleSheet.create({
    skeletonContainer: {
        backgroundColor: '#e5e7eb',
        overflow: 'hidden',
    },
    shimmer: {
        width: 150,
        height: '100%',
        backgroundColor: '#f3f4f6',
        opacity: 0.5,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderContent: {
        flexDirection: 'row',
        marginTop: 16,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        margin: 8,
        width: (width - 48) / 2,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
    },
    businessDetail: {
        flex: 1,
        padding: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    tabs: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 20,
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 16,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
    },
    ordersList: {
        flex: 1,
        paddingTop: 8,
    },
    productsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
    },
    sellersList: {
        flex: 1,
        paddingTop: 8,
    },
});
