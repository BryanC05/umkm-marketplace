import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { getImageUrl, formatPrice } from '../utils/helpers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function ProductCard({ product, onPress }) {
    const { colors } = useThemeStore();
    const imageUrl = product.images?.[0]
        ? getImageUrl(product.images[0])
        : '';

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={[styles.image, { backgroundColor: colors.border }]}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.image, { backgroundColor: colors.border }]} />
            )}
            <View style={styles.content}>
                {product.category && (
                    <Text style={[styles.category, { color: colors.textSecondary }]} numberOfLines={1}>
                        {product.category.toUpperCase()}
                    </Text>
                )}
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                    {product.name}
                </Text>
                <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(product.price)}</Text>
                <View style={styles.footerRow}>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
                            {product.seller?.location?.city || 'Nearby'}
                        </Text>
                    </View>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={[styles.rating, { color: colors.textSecondary }]}>{(product.rating || 4.5).toFixed(1)}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    image: {
        width: '100%',
        height: CARD_WIDTH,
    },
    content: {
        padding: 10,
    },
    category: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        flex: 1,
    },
    location: {
        fontSize: 11,
        flex: 1,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    rating: {
        fontSize: 11,
        fontWeight: '600',
    },
});
