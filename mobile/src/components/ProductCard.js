import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { getImageUrl, formatPrice } from '../utils/helpers';
import { PLACEHOLDER_IMAGE } from '../config';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function ProductCard({ product, onPress }) {
    const { colors } = useThemeStore();
    const imageUrl = product.images?.[0]
        ? getImageUrl(product.images[0])
        : PLACEHOLDER_IMAGE;

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
            <Image
                source={{ uri: imageUrl }}
                style={[styles.image, { backgroundColor: colors.border }]}
                resizeMode="cover"
            />
            <View style={styles.content}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                    {product.name}
                </Text>
                <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(product.price)}</Text>
                <View style={styles.sellerRow}>
                    <Ionicons name="storefront-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.seller, { color: colors.textSecondary }]} numberOfLines={1}>
                        {product.seller?.businessName || product.seller?.name || 'Seller'}
                    </Text>
                </View>
                {product.rating > 0 && (
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={[styles.rating, { color: colors.textSecondary }]}>{product.rating.toFixed(1)}</Text>
                    </View>
                )}
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
    name: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    price: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seller: {
        fontSize: 11,
        flex: 1,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 4,
    },
    rating: {
        fontSize: 11,
        fontWeight: '500',
    },
});
