import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
    ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import api from '../api/api';

export default function DriverRatingModal({ visible, orderId, driverName, onClose, onRated }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t } = useLanguageStore();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [hoveredStar, setHoveredStar] = useState(0);

    const handleSubmit = async () => {
        if (rating < 1 || rating > 5) {
            Alert.alert(t.error || 'Error', t.pleaseSelectRating || 'Please select a rating');
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/driver-rating/${orderId}`, {
                rating,
                comment: comment.trim(),
            });
            
            if (onRated) {
                onRated(rating);
            }
            
            Alert.alert(t.success || 'Success', t.ratingSubmitted || 'Thank you for your rating!');
            onClose();
        } catch (error) {
            Alert.alert(t.error || 'Error', error.response?.data?.message || t.failedSubmitRating || 'Failed to submit rating');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setRating(5);
        setComment('');
        setHoveredStar(0);
        onClose();
    };

    const styles = useMemo(() => StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modal: {
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 340,
        },
        title: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 24,
        },
        driverName: {
            fontWeight: '600',
            color: colors.primary,
        },
        starsContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: 24,
            gap: 8,
        },
        starBtn: {
            padding: 4,
        },
        ratingLabel: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 20,
        },
        commentInput: {
            backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            color: colors.text,
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
        },
        buttonsContainer: {
            flexDirection: 'row',
            gap: 12,
        },
        skipBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
            alignItems: 'center',
        },
        skipBtnText: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        submitBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
        },
        submitBtnDisabled: {
            backgroundColor: colors.textSecondary,
        },
        submitBtnText: {
            fontSize: 15,
            fontWeight: '700',
            color: '#fff',
        },
    }), [colors, isDarkMode]);

    const ratingLabels = {
        1: t.rating1 || 'Poor',
        2: t.rating2 || 'Fair',
        3: t.rating3 || 'Good',
        4: t.rating4 || 'Very Good',
        5: t.rating5 || 'Excellent',
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>{t.rateDriver || 'Rate Your Driver'}</Text>
                    <Text style={styles.subtitle}>
                        {t.howWasDelivery || 'How was your delivery with'}{' '}
                        <Text style={styles.driverName}>{driverName || 'Driver'}</Text>?
                    </Text>

                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                style={styles.starBtn}
                                onPress={() => setRating(star)}
                                onPressIn={() => setHoveredStar(star)}
                                onPressOut={() => setHoveredStar(0)}
                            >
                                <Ionicons
                                    name={star <= (hoveredStar || rating) ? 'star' : 'star-outline'}
                                    size={40}
                                    color={star <= (hoveredStar || rating) ? '#f59e0b' : colors.textSecondary}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.ratingLabel}>
                        {ratingLabels[hoveredStar || rating] || ratingLabels[5]}
                    </Text>

                    <TextInput
                        style={styles.commentInput}
                        placeholder={t.addComment || 'Add a comment (optional)'}
                        placeholderTextColor={colors.textSecondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        maxLength={200}
                    />

                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleClose}>
                            <Text style={styles.skipBtnText}>{t.skip || 'Skip'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.submitBtnText}>{t.submit || 'Submit'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
