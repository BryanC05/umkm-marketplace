import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal,
    ActivityIndicator, Alert, Dimensions, Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';

const { width, height } = Dimensions.get('window');
const DEFAULT_DELTA = { latitudeDelta: 0.005, longitudeDelta: 0.005 };
const JAKARTA = { latitude: -6.2088, longitude: 106.8456 };

export default function LocationPicker({ visible, onClose, onLocationSelect, initialLocation }) {
    const { colors, isDarkMode } = useThemeStore();
    const mapRef = useRef(null);

    const [markerCoord, setMarkerCoord] = useState(
        initialLocation?.coordinates
            ? { latitude: initialLocation.coordinates[1], longitude: initialLocation.coordinates[0] }
            : JAKARTA
    );
    const [address, setAddress] = useState(initialLocation?.address || '');
    const [city, setCity] = useState(initialLocation?.city || '');
    const [loading, setLoading] = useState(false);
    const [geocoding, setGeocoding] = useState(false);

    // Get current location on first open
    useEffect(() => {
        if (visible && !initialLocation) {
            goToMyLocation();
        }
    }, [visible]);

    const goToMyLocation = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please enable location permissions');
                setLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setMarkerCoord(coord);
            mapRef.current?.animateToRegion({ ...coord, ...DEFAULT_DELTA }, 600);
            await reverseGeocode(coord.latitude, coord.longitude);
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert('Error', 'Could not get your location');
        }
        setLoading(false);
    };

    const reverseGeocode = async (latitude, longitude) => {
        setGeocoding(true);
        try {
            const results = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (results.length > 0) {
                const addr = results[0];
                const parts = [
                    addr.street,
                    addr.city || addr.district,
                    addr.region,
                ].filter(Boolean);
                setAddress(parts.join(', '));
                setCity(addr.city || addr.district || '');
            }
        } catch (e) {
            console.error('Geocode error:', e);
        }
        setGeocoding(false);
    };

    const handleMapPress = (e) => {
        const coord = e.nativeEvent.coordinate;
        setMarkerCoord(coord);
        reverseGeocode(coord.latitude, coord.longitude);
    };

    const handleMarkerDragEnd = (e) => {
        const coord = e.nativeEvent.coordinate;
        setMarkerCoord(coord);
        reverseGeocode(coord.latitude, coord.longitude);
    };

    const handleConfirm = () => {
        const locationData = {
            type: 'Point',
            coordinates: [markerCoord.longitude, markerCoord.latitude],
            address: address || `${markerCoord.latitude.toFixed(6)}, ${markerCoord.longitude.toFixed(6)}`,
            city: city || 'Unknown',
            state: 'Indonesia',
        };
        onLocationSelect(locationData);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Pick Location</Text>
                    <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
                        <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                </View>

                {/* Map */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={{ ...markerCoord, ...DEFAULT_DELTA }}
                        onPress={handleMapPress}
                        showsUserLocation
                        showsMyLocationButton={false}
                    >
                        <Marker
                            coordinate={markerCoord}
                            draggable
                            onDragEnd={handleMarkerDragEnd}
                        >
                            <View style={styles.markerOuter}>
                                <View style={[styles.markerInner, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="location" size={20} color="#fff" />
                                </View>
                                <View style={[styles.markerArrow, { borderTopColor: colors.primary }]} />
                            </View>
                        </Marker>
                    </MapView>

                    {/* Instruction overlay */}
                    <View style={styles.instructionBanner}>
                        <Text style={styles.instructionText}>
                            Tap or drag the pin to set product location
                        </Text>
                    </View>

                    {/* My Location FAB */}
                    <TouchableOpacity
                        style={[styles.myLocationBtn, { backgroundColor: colors.card }]}
                        onPress={goToMyLocation}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="locate" size={22} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Bottom Info Panel */}
                <View style={[styles.infoPanel, { backgroundColor: colors.card }]}>
                    <View style={styles.infoPanelContent}>
                        <View style={[styles.locationDot, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="location" size={22} color={colors.primary} />
                        </View>
                        <View style={styles.infoText}>
                            {geocoding ? (
                                <View style={styles.geocodingRow}>
                                    <ActivityIndicator size="small" color={colors.textSecondary} />
                                    <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>
                                        Finding address...
                                    </Text>
                                </View>
                            ) : (
                                <Text style={[styles.addressLabel, { color: colors.text }]} numberOfLines={2}>
                                    {address || 'Tap on the map to select location'}
                                </Text>
                            )}
                            <Text style={[styles.coordLabel, { color: colors.textSecondary }]}>
                                {markerCoord.latitude.toFixed(6)}, {markerCoord.longitude.toFixed(6)}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                        onPress={handleConfirm}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.confirmText}>Confirm Location</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 8, paddingTop: Platform.OS === 'ios' ? 56 : 12, paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerBtn: { padding: 8, minWidth: 50, alignItems: 'center' },
    title: { fontSize: 17, fontWeight: '700' },
    doneText: { fontSize: 16, fontWeight: '700' },

    // Map
    mapContainer: { flex: 1 },
    map: { ...StyleSheet.absoluteFillObject },

    instructionBanner: {
        position: 'absolute', top: 12, alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20,
    },
    instructionText: { color: '#fff', fontSize: 13, fontWeight: '500' },

    myLocationBtn: {
        position: 'absolute', bottom: 20, right: 16,
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
    },

    // Marker
    markerOuter: { alignItems: 'center' },
    markerInner: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
    },
    markerArrow: {
        width: 0, height: 0,
        borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        marginTop: -3,
    },

    // Bottom Panel
    infoPanel: {
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
    },
    infoPanelContent: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12,
    },
    locationDot: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
    },
    infoText: { flex: 1 },
    geocodingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressLabel: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    coordLabel: { fontSize: 12, marginTop: 2 },

    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, borderRadius: 14, gap: 8,
    },
    confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
