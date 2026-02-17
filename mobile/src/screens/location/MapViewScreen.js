import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import Map from '../../components/Map';

const { width, height } = Dimensions.get('window');

export default function MapViewScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors } = useThemeStore();
    const { location, title, subtitle } = route.params || {};

    const lat = location?.coordinates?.[1];
    const lng = location?.coordinates?.[0];

    const mapRegion = lat && lng ? {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01 * (width / height),
    } : null;

    const markers = lat && lng ? [{
        id: 'location',
        coordinate: { latitude: lat, longitude: lng },
        title: title || 'Location',
        description: subtitle || location?.address || '',
        number: 1,
    }] : [];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { 
                backgroundColor: colors.card, 
                paddingTop: insets.top + 12,
                borderBottomColor: colors.border 
            }]}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.input }]} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Location</Text>
                <View style={styles.headerRight}>
                    {lat && lng && (
                        <TouchableOpacity 
                            style={[styles.externalBtn, { backgroundColor: colors.primary + '20' }]}
                            onPress={() => {
                                const url = Platform.OS === 'ios' 
                                    ? `https://maps.apple.com/?ll=${lat},${lng}`
                                    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                Linking.openURL(url);
                            }}
                        >
                            <Ionicons name="open-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {mapRegion ? (
                <Map
                    region={mapRegion}
                    markers={markers}
                    showsUserLocation={false}
                />
            ) : (
                <View style={[styles.placeholder, { backgroundColor: colors.input }]}>
                    <Ionicons name="map" size={64} color={colors.textSecondary} />
                    <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>No location available</Text>
                </View>
            )}

            {location && (
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <View style={[styles.infoIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="location" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>
                            {title || 'Product Location'}
                        </Text>
                        <Text style={[styles.infoAddress, { color: colors.textSecondary }]}>
                            {location?.address || 'No address available'}
                        </Text>
                        {location?.coordinates && (
                            <Text style={[styles.infoCoords, { color: colors.textSecondary }]}>
                                {location.coordinates[1]?.toFixed(4)}, {location.coordinates[0]?.toFixed(4)}
                            </Text>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    externalBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 16,
        marginTop: 12,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderTopWidth: 1,
    },
    infoIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    infoAddress: {
        fontSize: 14,
        marginTop: 2,
    },
    infoCoords: {
        fontSize: 12,
        marginTop: 4,
    },
});
