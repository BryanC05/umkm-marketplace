import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';

const MAX_IMAGES = 4;

const CATEGORIES = [
    { id: 'website', name: 'Website', icon: 'globe-outline' },
    { id: 'game', name: 'Game', icon: 'game-controller-outline' },
    { id: 'app', name: 'App', icon: 'phone-portrait-outline' },
    { id: 'other', name: 'Other', icon: 'folder-outline' },
];

export default function AddProjectScreen({ navigation }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useTranslation();

    const [form, setForm] = useState({
        name: '',
        description: '',
        link: '',
        category: 'website',
    });
    const [images, setImages] = useState([]);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);

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
        setImages(images.filter((_, i) => i !== index));
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            Alert.alert('Error', 'Project name is required');
            return;
        }
        if (!form.description.trim()) {
            Alert.alert('Error', 'Description is required');
            return;
        }
        if (!form.link.trim()) {
            Alert.alert('Error', 'Project link is required');
            return;
        }

        try {
            setLoading(true);
            const projectData = {
                name: form.name.trim(),
                description: form.description.trim(),
                link: form.link.trim(),
                category: form.category,
                tags: tags,
                images: images,
            };
            await api.post('/projects', projectData);
            Alert.alert('Success', 'Project created successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    const themedStyles = {
        card: {
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
        },
        label: {
            color: colors.text,
            fontWeight: '600',
            fontSize: 14,
            marginBottom: 8,
        },
        sublabel: {
            color: colors.textSecondary,
            fontSize: 12,
            marginBottom: 12,
        },
        input: {
            backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
            color: colors.text,
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            borderWidth: 1,
            borderColor: colors.border,
        },
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 12 }}>
                        {t.addProject || 'Add Project'}
                    </Text>
                </View>

                {/* Images Section */}
                <View style={[themedStyles.card]}>
                    <Text style={[styles.sectionTitle, themedStyles.label]}>Project Images</Text>
                    <Text style={[styles.sectionSubtitle, themedStyles.sublabel]}>
                        Add up to {MAX_IMAGES} photos (optional)
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

                {/* Basic Info Section */}
                <View style={[themedStyles.card]}>
                    <Text style={[styles.sectionTitle, themedStyles.label]}>{t.basicInfo || 'Basic Information'}</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, themedStyles.label]}>Project Name *</Text>
                        <TextInput
                            style={[styles.input, themedStyles.input]}
                            placeholder="e.g. My Portfolio Website"
                            placeholderTextColor={colors.textSecondary}
                            value={form.name}
                            onChangeText={t => setForm({ ...form, name: t })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, themedStyles.label]}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, themedStyles.input]}
                            placeholder="Describe your project..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                            value={form.description}
                            onChangeText={t => setForm({ ...form, description: t })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, themedStyles.label]}>Project Link *</Text>
                        <TextInput
                            style={[styles.input, themedStyles.input]}
                            placeholder="https://example.com"
                            placeholderTextColor={colors.textSecondary}
                            value={form.link}
                            onChangeText={t => setForm({ ...form, link: t })}
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, themedStyles.label]}>Category *</Text>
                        <View style={styles.categoryContainer}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        { borderColor: colors.border, backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' },
                                        form.category === cat.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                                    ]}
                                    onPress={() => setForm({ ...form, category: cat.id })}
                                >
                                    <Ionicons 
                                        name={cat.icon} 
                                        size={16} 
                                        color={form.category === cat.id ? colors.primary : colors.textSecondary} 
                                    />
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            { color: colors.textSecondary },
                                            form.category === cat.id && { color: colors.primary, fontWeight: '700' },
                                        ]}
                                    >
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Tags Section */}
                <View style={[themedStyles.card]}>
                    <Text style={[styles.sectionTitle, themedStyles.label]}>Tags (Optional)</Text>
                    <Text style={[styles.sectionSubtitle, themedStyles.sublabel]}>
                        Add keywords to help people find your project
                    </Text>
                    
                    <View style={styles.tagInputContainer}>
                        <TextInput
                            style={[styles.input, themedStyles.input, { flex: 1 }]}
                            placeholder="Add a tag..."
                            placeholderTextColor={colors.textSecondary}
                            value={tagInput}
                            onChangeText={setTagInput}
                            onSubmitEditing={addTag}
                        />
                        <TouchableOpacity 
                            style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
                            onPress={addTag}
                        >
                            <Ionicons name="add" size={20} color={colors.card} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tagsContainer}>
                        {tags.map((tag, index) => (
                            <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                                <TouchableOpacity onPress={() => removeTag(tag)}>
                                    <Ionicons name="close" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={colors.card} />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color={colors.card} />
                            <Text style={styles.submitBtnText}>
                                {t.createProject || 'Create Project'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        fontSize: 14,
        padding: 14,
        borderRadius: 12,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    imageWrapper: {
        position: 'relative',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    removeImageBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
    },
    addImageBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageText: {
        marginTop: 4,
        fontSize: 12,
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    categoryText: {
        fontSize: 13,
    },
    tagInputContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    addTagBtn: {
        width: 46,
        height: 46,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 8,
        marginBottom: 32,
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
});
