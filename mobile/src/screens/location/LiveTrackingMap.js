import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function LiveTrackingMap() {
    const route = useRoute();
    const navigation = useNavigation();
    const mapRef = useRef(null);
    
    const { destination, title } = route.params || {};
    
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [following, setFollowing] = useState(true);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({});
            setLocation(currentLocation.coords);
            
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 3000,
                    distanceInterval: 10,
                },
                (newLocation) => {
                    setLocation(newLocation.coords);
                    if (following && mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        });
                    }
                }
            );

            return () => subscription.remove();
        })();
    }, [following]);

    const centerOnUser = () => {
        if (location && mapRef.current) {
            setFollowing(true);
            mapRef.current.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    const destinationCoords = destination ? {
        latitude: destination.coordinates[1],
        longitude: destination.coordinates[0],
    } : null;

    const routeCoordinates = location && destinationCoords ? [
        { latitude: location.latitude, longitude: location.longitude },
        destinationCoords,
    ] : [];

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass
                initialRegion={{
                    latitude: location?.latitude || -6.2088,
                    longitude: location?.longitude || 106.8456,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                {destinationCoords && (
                    <>
                        <Marker
                            coordinate={destinationCoords}
                            title={title || 'Destination'}
                            description={destination?.address}
                        >
                            <View style={styles.destinationMarker}>
                                <Ionicons name="location" size={24} color="#fff" />
                            </View>
                        </Marker>
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="#3B82F6"
                            strokeWidth={4}
                            lineDashPattern={[0]}
                        />
                    </>
                )}
            </MapView>

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Live Tracking</Text>
                <View style={{ width: 40 }} />
            </View>

            {errorMsg && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            <TouchableOpacity style={styles.followBtn} onPress={centerOnUser}>
                <Ionicons name="locate" size={24} color={following ? '#fff' : '#3B82F6'} />
            </TouchableOpacity>

            {location && (
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="navigate" size={20} color="#3B82F6" />
                        <Text style={styles.infoText}>
                            Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                        </Text>
                    </View>
                    {destinationCoords && (
                        <View style={styles.infoRow}>
                            <Ionicons name="flag" size={20} color="#10B981" />
                            <Text style={styles.infoText}>
                                Distance: {calculateDistance(
                                    location.latitude, location.longitude,
                                    destinationCoords.latitude, destinationCoords.longitude
                                ).toFixed(2)} km
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    map: { flex: 1 },
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    errorContainer: {
        position: 'absolute',
        top: 120,
        left: 20,
        right: 20,
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 8,
    },
    errorText: { color: '#DC2626', textAlign: 'center' },
    followBtn: {
        position: 'absolute',
        right: 16,
        bottom: 120,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    infoCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 16,
        paddingBottom: 34,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#374151',
    },
    destinationMarker: {
        backgroundColor: '#10B981',
        padding: 8,
        borderRadius: 20,
    },
});
