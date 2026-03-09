import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
    Dimensions, Alert, ActivityIndicator, TextInput, Share, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const CATEGORIES = {
    website: { name: 'Website', icon: 'globe-outline', color: '#3b82f6' },
    game: { name: 'Game', icon: 'game-controller-outline', color: '#8b5cf6' },
    app: { name: 'App', icon: 'phone-portrait-outline', color: '#10b981' },
    other: { name: 'Other', icon: 'folder-outline', color: '#6b7280' },
};

export default function ProjectDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { projectId } = route.params;
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const token = useAuthStore((s) => s.token);

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        link: '',
        category: '',
    });
    const [saving, setSaving] = useState(false);

    const isOwner = user && project && user._id === project.userId;

    useEffect(() => {
        fetchProject();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
            setEditForm({
                name: response.data.name,
                description: response.data.description,
                link: response.data.link,
                category: response.data.category,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to load project');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Project',
            'Are you sure you want to delete this project?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/projects/${projectId}`);
                            Alert.alert('Success', 'Project deleted', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete project');
                        }
                    }
                },
            ]
        );
    };

    const handleSaveEdit = async () => {
        if (!editForm.name.trim() || !editForm.description.trim() || !editForm.link.trim()) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        try {
            setSaving(true);
            await api.put(`/projects/${projectId}`, editForm);
            setProject({ ...project, ...editForm });
            setShowEditModal(false);
            Alert.alert('Success', 'Project updated');
        } catch (error) {
            Alert.alert('Error', 'Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this project: ${project.name}\n${project.link}`,
                title: project.name,
            });
        } catch (error) {
            console.log('Share error:', error);
        }
    };

    const handleOpenLink = async () => {
        const { Link } = await import('react-native');
        try {
            await Link.openURL(project.link);
        } catch (error) {
            Alert.alert('Error', 'Could not open link');
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!project) return null;

    const categoryInfo = CATEGORIES[project.category] || CATEGORIES.other;
    const images = project.images && project.images.length > 0 
        ? project.images 
        : project.image 
            ? [project.image] 
            : [];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.card }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    {isOwner && (
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.headerBtn}>
                                <Ionicons name="create-outline" size={22} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
                                <Ionicons name="trash-outline" size={22} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Image Gallery */}
                {images.length > 0 ? (
                    <View style={styles.imageContainer}>
                        <Image 
                            source={{ uri: images[selectedImage] }} 
                            style={styles.mainImage}
                            resizeMode="cover"
                        />
                        {images.length > 1 && (
                            <View style={styles.thumbnailContainer}>
                                {images.map((img, index) => (
                                    <TouchableOpacity 
                                        key={index} 
                                        onPress={() => setSelectedImage(index)}
                                    >
                                        <Image 
                                            source={{ uri: img }} 
                                            style={[
                                                styles.thumbnail,
                                                selectedImage === index && { borderColor: colors.primary, borderWidth: 2 }
                                            ]}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: colors.card }]}>
                        <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
                    </View>
                )}

                {/* Content */}
                <View style={styles.content}>
                    {/* Category Badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                        <Ionicons name={categoryInfo.icon} size={16} color={categoryInfo.color} />
                        <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                            {categoryInfo.name}
                        </Text>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.text }]}>{project.name}</Text>

                    {/* User Info */}
                    <View style={styles.userInfo}>
                        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                            {project.userAvatar ? (
                                <Image source={{ uri: project.userAvatar }} style={styles.avatarImg} />
                            ) : (
                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                    {(project.username || 'U').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.username, { color: colors.text }]}>
                            {project.username || 'Unknown'}
                        </Text>
                    </View>

                    {/* Description */}
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        {project.description}
                    </Text>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {project.tags.map((tag, index) => (
                                <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                            onPress={handleOpenLink}
                        >
                            <Ionicons name="open-outline" size={20} color={colors.card} />
                            <Text style={[styles.primaryBtnText, { color: colors.card }]}>
                                View Project
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.secondaryBtn, { borderColor: colors.border }]}
                            onPress={handleShare}
                        >
                            <Ionicons name="share-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => setShowEditModal(false)}>
                            <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Project</Text>
                        <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Project Name *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                value={editForm.name}
                                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Description *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                value={editForm.description}
                                onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Project Link *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                value={editForm.link}
                                onChangeText={(text) => setEditForm({ ...editForm, link: text })}
                                keyboardType="url"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Category *</Text>
                            <View style={styles.categoryContainer}>
                                {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.categoryChip,
                                            { borderColor: colors.border },
                                            editForm.category === key && { backgroundColor: cat.color + '20', borderColor: cat.color },
                                        ]}
                                        onPress={() => setEditForm({ ...editForm, category: key })}
                                    >
                                        <Ionicons name={cat.icon} size={16} color={editForm.category === key ? cat.color : colors.textSecondary} />
                                        <Text style={[styles.categoryChipText, { color: editForm.category === key ? cat.color : colors.textSecondary }]}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        padding: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    headerBtn: {
        padding: 4,
    },
    imageContainer: {
        width: width,
    },
    mainImage: {
        width: width,
        height: width * 0.75,
    },
    thumbnailContainer: {
        flexDirection: 'row',
        padding: 12,
        gap: 8,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    placeholderImage: {
        width: width,
        height: width * 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        marginBottom: 12,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '700',
    },
    username: {
        fontSize: 14,
        fontWeight: '500',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    primaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalCancel: {
        fontSize: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalSave: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        fontSize: 15,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
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
    categoryChipText: {
        fontSize: 13,
    },
});
