import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { formatRelativeTime, truncateText } from '../utils/helpers';

export default function ForumPostCard({ post, onPress }) {
    const { colors } = useThemeStore();

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.header}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                        {(post.author?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.authorName, { color: colors.text }]}>{post.author?.name || 'Anonymous'}</Text>
                    <Text style={[styles.date, { color: colors.textSecondary }]}>{formatRelativeTime(post.createdAt)}</Text>
                </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{post.title}</Text>
            <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={3}>
                {truncateText(post.content, 150)}
            </Text>
            <View style={styles.footer}>
                <View style={styles.stat}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{post.replyCount || 0}</Text>
                </View>
                <View style={styles.stat}>
                    <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{post.likes?.length || 0}</Text>
                </View>
                {post.category && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>{post.category}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    headerInfo: {
        flex: 1,
    },
    authorName: {
        fontSize: 13,
        fontWeight: '600',
    },
    date: {
        fontSize: 11,
        marginTop: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
        lineHeight: 20,
    },
    content: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
    },
    badge: {
        marginLeft: 'auto',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
