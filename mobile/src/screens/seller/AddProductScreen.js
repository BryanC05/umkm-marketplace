import React, { useMemo, useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';
import { CATEGORIES_EN, CATEGORIES_ID } from '../../config';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import LocationPicker from '../../components/location/LocationPicker';

const UNITS_EN = [
    { id: 'pieces', name: 'Pieces' },
    { id: 'kg', name: 'Kg' },
    { id: 'grams', name: 'Grams' },
    { id: 'liters', name: 'Liters' },
    { id: 'meters', name: 'Meters' },
    { id: 'pairs', name: 'Pairs' },
    { id: 'dozen', name: 'Dozen' },
];

const UNITS_ID = [
    { id: 'pieces', name: 'Pcs' },
    { id: 'kg', name: 'Kg' },
    { id: 'grams', name: 'Gram' },
    { id: 'liters', name: 'Liter' },
    { id: 'meters', name: 'Meter' },
    { id: 'pairs', name: 'Pasang' },
    { id: 'dozen', name: 'Lusin' },
];

const MAX_IMAGES = 4;

export default function AddProductScreen({ navigation }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useLanguageStore();

    const categories = language === 'id' ? CATEGORIES_ID : CATEGORIES_EN;
    const units = language === 'id' ? UNITS_ID : UNITS_EN;
    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: 'food',
        unit: 'pieces',
        location: null,
    });
    const [images, setImages] = useState([]);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState([]);
    const [optionGroups, setOptionGroups] = useState([]);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const pickImage = async () => {
        if (images.length >= MAX_IMAGES) {
            Alert.alert('Limit Reached', `You can add up to ${MAX_IMAGES} images`);
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const ext = (asset.uri || '').split('.').pop()?.toLowerCase() || 'jpeg';
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${asset.base64}`;
            setImages([...images, dataUrl]);
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const addTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(prev => prev.filter(t => t !== tagToRemove));
    };

    const resetForm = useCallback(() => {
        setForm({
            name: '',
            description: '',
            price: '',
            stock: '',
            category: 'food',
            unit: 'pieces',
            location: null,
        });
        setImages([]);
        setTags([]);
        setTagInput('');
        setHasVariants(false);
        setVariants([]);
        setOptionGroups([]);
    }, []);

    const handleGenerateDescription = async () => {
        if (!form.name) {
            Alert.alert('Info', 'Please enter a product name first');
            return;
        }

        setIsGeneratingAI(true);
        try {
            const response = await api.post('/ai/generate-description', {
                name: form.name,
                keywords: tags.join(', '),
            });
            setForm(prev => ({ ...prev, description: response.data.description }));
        } catch (error) {
            console.error('AI Generation failed:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to generate AI description. Please try again.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.price || !form.stock) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (images.length === 0) {
            Alert.alert('Error', 'Please add at least one product image');
            return;
        }

        setLoading(true);
        try {
            const currentLocation = form.location || {
                type: 'Point',
                coordinates: [106.8456, -6.2088],
                address: 'Jakarta, Indonesia',
                city: 'Jakarta',
                state: 'DKI Jakarta',
            };

            const productData = {
                name: form.name,
                description: form.description,
                price: Number(form.price),
                stock: Number(form.stock),
                category: form.category,
                unit: form.unit,
                images: images,
                tags,
                currentLocation,
                hasVariants,
                variants: hasVariants ? variants.map(v => ({ name: v.name, price: Number(v.price), stock: Number(v.stock) })) : [],
                optionGroups: optionGroups.map(g => ({
                    name: g.name,
                    required: g.required || false,
                    multiple: g.multiple || false,
                    options: g.options.map(o => ({ name: o.name, priceAdjust: Number(o.priceAdjust) || 0 }))
                })),
            };

            await api.post('/products', productData);

            Alert.alert('Success', 'Product added successfully', [
                { 
                    text: 'Add Another', 
                    onPress: () => resetForm()
                },
                { 
                    text: 'Done', 
                    onPress: () => {
                        resetForm();
                        navigation.goBack();
                    }
                },
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    const themedStyles = {
        container: { backgroundColor: colors.background },
        card: { backgroundColor: colors.card },
        input: {
            backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
            borderColor: colors.border,
            color: colors.text,
        },
        label: { color: colors.text },
        sublabel: { color: colors.textSecondary },
    };

    const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={[styles.container, themedStyles.container]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={styles.form}>
                    {/* ===== IMAGES SECTION ===== */}
                    <View style={[styles.section, themedStyles.card]}>
                        <Text style={[styles.sectionTitle, themedStyles.label]}>Product Images</Text>
                        <Text style={[styles.sectionSubtitle, themedStyles.sublabel]}>
                            Add up to {MAX_IMAGES} photos
                        </Text>
                        <View style={styles.imageGrid}>
                            {images.map((uri, index) => (
                                <View key={index} style={styles.imageWrapper}>
                                    <Image source={{ uri }} style={styles.imagePreview} />
                                    <TouchableOpacity
                                        style={styles.removeImageBtn}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {images.length < MAX_IMAGES && (
                                <TouchableOpacity
                                    style={[styles.addImageBtn, { borderColor: colors.border }]}
                                    onPress={pickImage}
                                >
                                    <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
                                    <Text style={[styles.addImageText, themedStyles.sublabel]}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ===== BASIC INFO SECTION ===== */}
                    <View style={[styles.section, themedStyles.card]}>
                        <Text style={[styles.sectionTitle, themedStyles.label]}>{t.addProduct || 'Basic Information'}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, themedStyles.label]}>{t.productName || 'Product Name'} *</Text>
                            <TextInput
                                style={[styles.input, themedStyles.input]}
                                placeholder="e.g. Nasi Goreng Spesial"
                                placeholderTextColor={colors.textSecondary}
                                value={form.name}
                                onChangeText={t => setForm({ ...form, name: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.label, themedStyles.label]}>{t.description || 'Description'}</Text>
                                <TouchableOpacity
                                    style={[styles.aiBtn, { backgroundColor: isGeneratingAI ? colors.textSecondary : colors.primary }]}
                                    onPress={handleGenerateDescription}
                                    disabled={isGeneratingAI}
                                >
                                    {isGeneratingAI ? (
                                        <ActivityIndicator size="small" color={colors.card} />
                                    ) : (
                                        <>
                                            <Ionicons name="sparkles" size={14} color={colors.card} />
                                            <Text style={styles.aiBtnText}>AI Generate</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[styles.input, styles.textArea, themedStyles.input]}
                                placeholder={t.productDescription || 'Describe your product...\n\nTip: Use **bold** and *italic* for formatting'}
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={4}
                                value={form.description}
                                onChangeText={t => setForm({ ...form, description: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, themedStyles.label]}>{t.category || 'Category'}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {categories.filter(c => c.id !== 'all').map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.chip,
                                            { borderColor: colors.border, backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' },
                                            form.category === cat.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                                        ]}
                                        onPress={() => setForm({ ...form, category: cat.id })}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                { color: colors.textSecondary },
                                                form.category === cat.id && { color: colors.primary, fontWeight: '700' },
                                            ]}
                                        >
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* ===== PRICING & STOCK SECTION ===== */}
                    <View style={[styles.section, themedStyles.card]}>
                        <Text style={[styles.sectionTitle, themedStyles.label]}>Pricing & Stock</Text>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, themedStyles.label]}>Price (Rp) *</Text>
                                <TextInput
                                    style={[styles.input, themedStyles.input]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={form.price}
                                    onChangeText={t => setForm({ ...form, price: t })}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, themedStyles.label]}>Stock *</Text>
                                <TextInput
                                    style={[styles.input, themedStyles.input]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={form.stock}
                                    onChangeText={t => setForm({ ...form, stock: t })}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, themedStyles.label]}>{t.unit || 'Unit'}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {units.map(u => (
                                    <TouchableOpacity
                                        key={u.id}
                                        style={[
                                            styles.chip,
                                            { borderColor: colors.border, backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' },
                                            form.unit === u.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                                        ]}
                                        onPress={() => setForm({ ...form, unit: u.id })}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                { color: colors.textSecondary },
                                                form.unit === u.id && { color: colors.primary, fontWeight: '700' },
                                            ]}
                                        >
                                            {u.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* ===== VARIANTS SECTION ===== */}
                    <View style={[styles.section, themedStyles.card]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[styles.sectionTitle, themedStyles.label, { marginBottom: 0 }]}>Product Variants</Text>
                            <TouchableOpacity
                                onPress={() => setHasVariants(!hasVariants)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            >
                                <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: hasVariants ? colors.primary : colors.border, justifyContent: 'center', paddingHorizontal: 2 }}>
                                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: hasVariants ? 'flex-end' : 'flex-start' }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.sectionSubtitle, themedStyles.sublabel]}>
                            e.g. sizes with different prices and stock
                        </Text>

                        {hasVariants && (
                            <View style={{ marginTop: 12 }}>
                                {variants.map((v, idx) => (
                                    <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.input, themedStyles.input, { flex: 2 }]}
                                            placeholder={t.name || 'Name'}
                                            placeholderTextColor={colors.textSecondary}
                                            value={v.name}
                                            onChangeText={t => {
                                                const nv = [...variants]; nv[idx].name = t; setVariants(nv);
                                            }}
                                        />
                                        <TextInput
                                            style={[styles.input, themedStyles.input, { flex: 1 }]}
                                            placeholder={t.price || 'Price'}
                                            placeholderTextColor={colors.textSecondary}
                                            keyboardType="numeric"
                                            value={v.price}
                                            onChangeText={t => {
                                                const nv = [...variants]; nv[idx].price = t; setVariants(nv);
                                            }}
                                        />
                                        <TextInput
                                            style={[styles.input, themedStyles.input, { flex: 1 }]}
                                            placeholder={t.stock || 'Stock'}
                                            placeholderTextColor={colors.textSecondary}
                                            keyboardType="numeric"
                                            value={v.stock}
                                            onChangeText={t => {
                                                const nv = [...variants]; nv[idx].stock = t; setVariants(nv);
                                            }}
                                        />
                                        <TouchableOpacity onPress={() => setVariants(variants.filter((_, i) => i !== idx))}>
                                            <Ionicons name="close-circle" size={22} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}
                                    onPress={() => setVariants([...variants, { name: '', price: '', stock: '' }])}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Add Variant</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* ===== OPTION GROUPS SECTION ===== */}
                    <View style={[styles.section, themedStyles.card]}>
                        <Text style={[styles.sectionTitle, themedStyles.label]}>Custom Options</Text>
                        <Text style={[styles.sectionSubtitle, themedStyles.sublabel]}>
                            e.g. Chicken Part, Ice Level, Toppings
                        </Text>

                        {optionGroups.map((group, gi) => (
                            <View key={gi} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <TextInput
                                        style={[styles.input, themedStyles.input, { flex: 1 }]}
                                        placeholder={t.groupName || 'Group name (e.g. Ice Level)'}
                                        placeholderTextColor={colors.textSecondary}
                                        value={group.name}
                                        onChangeText={t => {
                                            const ng = [...optionGroups]; ng[gi].name = t; setOptionGroups(ng);
                                        }}
                                    />
                                    <TouchableOpacity onPress={() => setOptionGroups(optionGroups.filter((_, i) => i !== gi))}>
                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => { const ng = [...optionGroups]; ng[gi].required = !ng[gi].required; setOptionGroups(ng); }}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                    >
                                        <Ionicons name={group.required ? 'checkbox' : 'square-outline'} size={18} color={colors.primary} />
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Required</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => { const ng = [...optionGroups]; ng[gi].multiple = !ng[gi].multiple; setOptionGroups(ng); }}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                    >
                                        <Ionicons name={group.multiple ? 'checkbox' : 'square-outline'} size={18} color={colors.primary} />
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Multi-select</Text>
                                    </TouchableOpacity>
                                </View>
                                {group.options.map((opt, oi) => (
                                    <View key={oi} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.input, themedStyles.input, { flex: 2 }]}
                                            placeholder={t.optionName || 'Option name'}
                                            placeholderTextColor={colors.textSecondary}
                                            value={opt.name}
                                            onChangeText={t => {
                                                const ng = [...optionGroups]; ng[gi].options[oi].name = t; setOptionGroups(ng);
                                            }}
                                        />
                                        <TextInput
                                            style={[styles.input, themedStyles.input, { flex: 1 }]}
                                            placeholder="+Price"
                                            placeholderTextColor={colors.textSecondary}
                                            keyboardType="numeric"
                                            value={opt.priceAdjust}
                                            onChangeText={t => {
                                                const ng = [...optionGroups]; ng[gi].options[oi].priceAdjust = t; setOptionGroups(ng);
                                            }}
                                        />
                                        <TouchableOpacity onPress={() => {
                                            const ng = [...optionGroups]; ng[gi].options = ng[gi].options.filter((_, i) => i !== oi); setOptionGroups(ng);
                                        }}>
                                            <Ionicons name="close-circle" size={20} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity
                                    onPress={() => {
                                        const ng = [...optionGroups]; ng[gi].options = [...ng[gi].options, { name: '', priceAdjust: '' }]; setOptionGroups(ng);
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
                                >
                                    <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Add Option</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={() => setOptionGroups([...optionGroups, { name: '', required: false, multiple: false, options: [{ name: '', priceAdjust: '' }] }])}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginTop: 8 }}
                        >
                            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Add Option Group</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ===== TAGS SECTION ===== */}
                    <View style={[styles.section, themedStyles.card]}>
                        <Text style={[styles.sectionTitle, themedStyles.label]}>Tags</Text>
                        <Text style={[styles.sectionSubtitle, themedStyles.sublabel]}>
                            Add keywords to help buyers find your product
                        </Text>

                        <View style={styles.tagInputRow}>
                            <TextInput
                                style={[styles.input, styles.tagInput, themedStyles.input]}
                                placeholder="e.g. handmade, organic"
                                placeholderTextColor={colors.textSecondary}
                                value={tagInput}
                                onChangeText={setTagInput}
                                onSubmitEditing={addTag}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                style={[styles.tagAddBtn, { backgroundColor: colors.primary }]}
                                onPress={addTag}
                            >
                                <Ionicons name="add" size={22} color={colors.card} />
                            </TouchableOpacity>
                        </View>

                        {tags.length > 0 && (
                            <View style={styles.tagsList}>
                                {tags.map(tag => (
                                    <View
                                        key={tag}
                                        style={[styles.tag, { backgroundColor: colors.primary + '15' }]}
                                    >
                                        <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                                        <TouchableOpacity onPress={() => removeTag(tag)}>
                                            <Ionicons name="close-circle" size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ===== LOCATION SECTION ===== */}
                    <View style={[styles.section, themedStyles.card]}>
                        <Text style={[styles.sectionTitle, themedStyles.label]}>Product Location</Text>
                        <Text style={[styles.sectionSubtitle, themedStyles.sublabel]}>
                            Where is this product located?
                        </Text>

                        <TouchableOpacity
                            style={[styles.locationBtn, { borderColor: colors.border, backgroundColor: isDarkMode ? '#374151' : '#f9fafb' }]}
                            onPress={() => setShowLocationPicker(true)}
                        >
                            <View style={[styles.locationIcon, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="location" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.locationInfo}>
                                {form.location?.address ? (
                                    <Text style={[styles.locationAddress, { color: colors.text }]} numberOfLines={2}>
                                        {form.location.address}
                                    </Text>
                                ) : (
                                    <Text style={[styles.locationPlaceholder, { color: colors.textSecondary }]}>
                                        Tap to set location on map
                                    </Text>
                                )}
                                <Text style={[styles.locationCoords, { color: colors.textSecondary }]}>
                                    {form.location?.coordinates
                                        ? `${form.location.coordinates[1]?.toFixed(4)}, ${form.location.coordinates[0]?.toFixed(4)}`
                                        : 'Defaults to current location'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <LocationPicker
                        visible={showLocationPicker}
                        onClose={() => setShowLocationPicker(false)}
                        onLocationSelect={(location) => setForm({ ...form, location })}
                        initialLocation={form.location}
                    />

                    {/* ===== SUBMIT ===== */}
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={styles.submitInner}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.card} />
                                <Text style={styles.submitText}>Create Product</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerPlaceholder: { width: 40 },
    form: { padding: 16, paddingTop: 8, gap: 16 },

    // Sections
    section: {
        borderRadius: 16, padding: 18,
        shadowColor: isDarkMode ? '#000' : '#e2e8f0', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.3 : 0.8, shadowRadius: 4, elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    sectionSubtitle: { fontSize: 13, marginBottom: 14 },

    // Images
    imageGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    imageWrapper: {
        width: 90, height: 90, borderRadius: 12, overflow: 'hidden',
    },
    imagePreview: { width: '100%', height: '100%' },
    removeImageBtn: {
        position: 'absolute', top: -2, right: -2,
        backgroundColor: colors.card, borderRadius: 12,
    },
    addImageBtn: {
        width: 90, height: 90, borderRadius: 12,
        borderWidth: 2, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    addImageText: { fontSize: 12, fontWeight: '500' },

    // Inputs
    inputGroup: { gap: 6, marginTop: 12 },
    label: { fontSize: 13, fontWeight: '600' },
    input: {
        borderWidth: 1, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    aiBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    },
    aiBtnText: { color: colors.card, fontSize: 11, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 12 },

    // Chips (category + unit)
    chip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        marginRight: 8, borderWidth: 1,
    },
    chipText: { fontSize: 13, fontWeight: '500' },

    // Tags
    tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    tagInput: { flex: 1 },
    tagAddBtn: {
        width: 44, height: 44, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    tagsList: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12,
    },
    tag: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    tagText: { fontSize: 13, fontWeight: '600' },

    // Location
    locationBtn: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderRadius: 12, padding: 12,
    },
    locationIcon: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    locationInfo: { flex: 1 },
    locationAddress: { fontSize: 14, fontWeight: '500' },
    locationPlaceholder: { fontSize: 14 },
    locationCoords: { fontSize: 12, marginTop: 2 },

    // Submit
    submitBtn: {
        height: 52, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', marginTop: 4,
        shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    disabledBtn: { opacity: 0.6 },
    submitText: { color: colors.card, fontSize: 16, fontWeight: '700' },
});
