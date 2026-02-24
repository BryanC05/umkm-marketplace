import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
    Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import api from '../../api/api';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { getImageUrl, formatPrice } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route }) {
    const navigation = useNavigation();
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const { productId } = route.params;
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState({});
    const addToCart = useCartStore((s) => s.addToCart);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await api.get(`/products/${productId}`);
                setProduct(response.data);
            } catch (error) {
                console.error('Failed to fetch product:', error);
                Alert.alert(t.error || 'Error', t.failedLoadProduct || 'Failed to load product');
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId, navigation, t.error, t.failedLoadProduct]);

    const getUnitPrice = () => {
        if (!product) return 0;
        let price = product.hasVariants && selectedVariant ? selectedVariant.price : product.price;
        Object.values(selectedOptions).forEach(sel => {
            price += (sel.priceAdjust || 0);
        });
        return price;
    };

    const getAvailableStock = () => {
        if (!product) return 0;
        if (product.hasVariants && selectedVariant) return selectedVariant.stock;
        return product.stock;
    };

    const handleOptionSelect = (groupName, optionName, priceAdjust, isMultiple) => {
        setSelectedOptions(prev => {
            if (isMultiple) {
                const current = prev[groupName] || { chosen: [], priceAdjust: 0 };
                const isSelected = current.chosen.includes(optionName);
                const group = product.optionGroups.find(g => g.name === groupName);
                if (isSelected) {
                    const newChosen = current.chosen.filter(n => n !== optionName);
                    const newAdjust = newChosen.reduce((sum, n) => {
                        const opt = group?.options.find(o => o.name === n);
                        return sum + (opt?.priceAdjust || 0);
                    }, 0);
                    return { ...prev, [groupName]: { groupName, chosen: newChosen, priceAdjust: newAdjust } };
                } else {
                    const newChosen = [...current.chosen, optionName];
                    return { ...prev, [groupName]: { groupName, chosen: newChosen, priceAdjust: current.priceAdjust + priceAdjust } };
                }
            } else {
                return { ...prev, [groupName]: { groupName, chosen: [optionName], priceAdjust } };
            }
        });
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            Alert.alert(t.loginRequired || 'Login Required', t.loginRequiredAddCart || 'Please login to add items to cart');
            return;
        }
        if (product.hasVariants && !selectedVariant) {
            Alert.alert(t.selectVariant || 'Select Variant', t.selectVariantFirst || 'Please select a variant first.');
            return;
        }
        const missingRequired = product.optionGroups?.filter(g => g.required && (!selectedOptions[g.name] || selectedOptions[g.name].chosen.length === 0));
        if (missingRequired?.length > 0) {
            Alert.alert(t.requiredOptions || 'Required Options', `${t.pleaseSelect || 'Please select'}: ${missingRequired.map(g => g.name).join(', ')}`);
            return;
        }
        const variant = selectedVariant ? { name: selectedVariant.name, price: selectedVariant.price } : null;
        const optionsArr = Object.values(selectedOptions).filter(o => o.chosen.length > 0);
        const result = await addToCart(product, quantity, variant, optionsArr);
        if (result === 'replaced') {
            Alert.alert(t.cartUpdated || 'Cart Updated', t.cartReplacedWithSeller || 'Previous cart items from another seller were replaced');
        } else {
            Alert.alert(t.addedToCartTitle || 'Added to Cart', `${product.name} ${t.addedToCartSuffix || 'added to your cart'}`);
        }
    };

    const handleChat = () => {
        if (!isAuthenticated) {
            Alert.alert(t.loginRequired || 'Login Required', t.loginRequiredChat || 'Please login to chat with seller');
            return;
        }
        navigation.navigate('ProfileTab', {
            screen: 'Chat',
            params: { sellerId: product.seller._id, productName: product.name, productId: product._id },
        });
    };

    if (loading) return <LoadingSpinner />;
    if (!product) return null;

    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];

    const styles = {
        container: { flex: 1 },
        imageContainer: { position: 'relative' },
        image: { width, height: width * 0.85, backgroundColor: colors.border },
        dots: { position: 'absolute', bottom: 16, flexDirection: 'row', alignSelf: 'center', gap: 6 },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
        dotActive: { backgroundColor: '#fff', width: 20 },
        backBtn: {
            position: 'absolute', top: 50, left: 16,
            width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.9)',
            justifyContent: 'center', alignItems: 'center',
        },
        infoContainer: { padding: 20 },
        name: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 28, marginBottom: 8 },
        price: { fontSize: 24, fontWeight: '800', color: colors.primary, marginBottom: 12 },
        badge: {
            alignSelf: 'flex-start', backgroundColor: colors.primary + '20',
            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 16,
        },
        badgeText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
        sellerCard: {
            flexDirection: 'row', alignItems: 'center', padding: 14,
            backgroundColor: colors.input, borderRadius: 14, marginBottom: 20, gap: 12,
        },
        sellerAvatar: {
            width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '20',
            justifyContent: 'center', alignItems: 'center',
        },
        sellerName: { fontSize: 14, fontWeight: '700', color: colors.text },
        sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
        sellerLocation: { fontSize: 12, color: colors.textSecondary },
        mapBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.card,
            marginBottom: 20,
        },
        mapBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
        section: { marginBottom: 20 },
        sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
        description: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
        stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
        stockLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
        stockValue: { fontSize: 14, fontWeight: '600' },
        quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
        quantityLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
        quantityStepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
        stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.input, justifyContent: 'center', alignItems: 'center' },
        quantityValue: { fontSize: 16, fontWeight: '700', color: colors.text },
        bottomBar: {
            flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 32, gap: 12,
        },
        chatBtn: {
            width: 50, height: 50, borderRadius: 25, backgroundColor: colors.input, justifyContent: 'center', alignItems: 'center',
        },
        addToCartBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
        addToCartText: { color: '#fff', fontWeight: '700', fontSize: 16 },
        btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Carousel */}
                <View style={styles.imageContainer}>
                    <ScrollView
                        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setSelectedImage(index);
                        }}
                    >
                        {images.length > 0 ? (
                            images.map((img, i) => (
                                <Image
                                    key={i}
                                    source={{ uri: getImageUrl(img) }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            ))
                        ) : (
                            <View style={styles.image} />
                        )}
                    </ScrollView>
                    {images.length > 1 && (
                        <View style={styles.dots}>
                            {images.map((_, i) => (
                                <View key={i} style={[styles.dot, i === selectedImage && styles.dotActive]} />
                            ))}
                        </View>
                    )}
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color="#111827" />
                    </TouchableOpacity>
                </View>

                {/* Product Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.price}>{formatPrice(getUnitPrice())}</Text>

                    {product.category && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{product.category}</Text>
                        </View>
                    )}

                    {/* Seller Info */}
                    <TouchableOpacity
                        style={styles.sellerCard}
                        onPress={() => product.seller?._id && navigation.navigate('BusinessDetails', { sellerId: product.seller._id })}
                    >
                        <View style={styles.sellerAvatar}>
                            <Ionicons name="storefront" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sellerName}>
                                {product.seller?.businessName || product.seller?.name}
                            </Text>
                            <View style={styles.sellerMeta}>
                                <Ionicons name="location-outline" size={12} color="#9ca3af" />
                                <Text style={styles.sellerLocation}>
                                    {product.seller?.location?.city || 'Indonesia'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                    </TouchableOpacity>

                    {/* View on Map Button */}
                    {product.location?.coordinates && (
                        <TouchableOpacity
                            style={styles.mapBtn}
                            onPress={() => navigation.navigate('MapView', {
                                location: product.location,
                                title: product.name,
                                subtitle: product.seller?.businessName
                            })}
                        >
                            <Ionicons name="map" size={18} color={colors.primary} />
                            <Text style={styles.mapBtnText}>{t.viewMap || 'View on Map'}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t.description || 'Description'}</Text>
                        <Text style={styles.description}>{product.description || t.noDescriptionAvailable || 'No description available.'}</Text>
                    </View>

                    {/* Variant Selector */}
                    {product.hasVariants && product.variants?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.selectVariant || 'Select Variant'}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {product.variants.map((v) => (
                                    <TouchableOpacity
                                        key={v.name}
                                        onPress={() => { setSelectedVariant(v); setQuantity(1); }}
                                        disabled={v.stock <= 0}
                                        style={{
                                            paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                                            borderWidth: 2,
                                            borderColor: selectedVariant?.name === v.name ? colors.primary : colors.border,
                                            backgroundColor: selectedVariant?.name === v.name ? colors.primary + '15' : colors.input,
                                            opacity: v.stock <= 0 ? 0.4 : 1,
                                        }}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: selectedVariant?.name === v.name ? colors.primary : colors.text }}>
                                            {v.name}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                            {formatPrice(v.price)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Option Groups */}
                    {product.optionGroups?.length > 0 && product.optionGroups.map((group) => (
                        <View key={group.name} style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {group.name} {group.required ? '*' : ''} {group.multiple ? `(${t.multi || 'multi'})` : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {group.options.map((opt) => {
                                    const isSelected = selectedOptions[group.name]?.chosen?.includes(opt.name);
                                    return (
                                        <TouchableOpacity
                                            key={opt.name}
                                            onPress={() => handleOptionSelect(group.name, opt.name, opt.priceAdjust || 0, group.multiple)}
                                            style={{
                                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                                                borderWidth: 2,
                                                borderColor: isSelected ? colors.primary : colors.border,
                                                backgroundColor: isSelected ? colors.primary + '15' : colors.input,
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? colors.primary : colors.text }}>
                                                {opt.name}{opt.priceAdjust > 0 ? ` (+${formatPrice(opt.priceAdjust)})` : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}

                    {/* Stock */}
                    <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>{t.stock || 'Stock'}:</Text>
                        <Text style={[styles.stockValue, getAvailableStock() < 5 && { color: '#ef4444' }]}>
                            {getAvailableStock() > 0 ? `${getAvailableStock()} ${t.availableLabel || 'available'}` : (t.outOfStock || 'Out of stock')}
                        </Text>
                    </View>

                    {/* Quantity Selector */}
                    {getAvailableStock() > 0 && (
                        <View style={styles.quantityRow}>
                            <Text style={styles.quantityLabel}>{t.quantity || 'Quantity'}:</Text>
                            <View style={styles.quantityStepper}>
                                <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    <Ionicons name="remove" size={18} color="#374151" />
                                </TouchableOpacity>
                                <Text style={styles.quantityValue}>{quantity}</Text>
                                <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => setQuantity(Math.min(getAvailableStock(), quantity + 1))}
                                >
                                    <Ionicons name="add" size={18} color="#374151" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
                    <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.addToCartBtn, getAvailableStock() === 0 && styles.disabledBtn]}
                    onPress={handleAddToCart}
                    disabled={getAvailableStock() === 0}
                >
                    <Ionicons name="cart" size={20} color="#fff" />
                    <Text style={styles.addToCartText}>
                        {getAvailableStock() === 0
                            ? (t.outOfStock || 'Out of Stock')
                            : `${t.addToCart || 'Add to Cart'} - ${formatPrice(getUnitPrice() * quantity)}`}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
