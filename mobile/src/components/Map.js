import React, { useRef, useImperativeHandle, forwardRef, Component } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useThemeStore } from '../store/themeStore';

const { width, height } = Dimensions.get('window');

// Try to import MapView - it may crash on standalone builds without a valid API key
let MapView, Marker, Circle, Polyline;
try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Circle = maps.Circle;
    Polyline = maps.Polyline;
} catch (e) {
    console.warn('Failed to load react-native-maps:', e);
    MapView = null;
    Marker = null;
    Circle = null;
    Polyline = null;
}

// Error boundary to catch runtime map crashes
class MapErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.warn('Map crashed:', error.message);
    }

    render() {
        if (this.state.hasError || !MapView) {
            return (
                <View style={[styles.fallbackContainer, this.props.style]}>
                    <Text style={styles.fallbackIcon}>🗺️</Text>
                    <Text style={styles.fallbackTitle}>Map Unavailable</Text>
                    <Text style={styles.fallbackText}>
                        Google Maps API key is not configured.{'\n'}
                        Seller data is still shown in the list below.
                    </Text>
                </View>
            );
        }
        return this.props.children;
    }
}

/**
 * Reusable Map Component with error handling
 */
const Map = forwardRef(({
    region,
    userLocation,
    radius,
    markers = [],
    polylineCoordinates = [],
    polylineColor,
    polylineWidth = 4,
    onMarkerPress,
    selectedMarkerId,
    style,
    showsUserLocation = true,
    showsMyLocationButton = true,
    showsCompass = true,
    children,
}, ref) => {
    const innerMapRef = useRef(null);

    useImperativeHandle(ref, () => ({
        animateToRegion: (region, duration) => {
            innerMapRef.current?.animateToRegion(region, duration);
        },
    }));
    const { colors } = useThemeStore();

    if (!MapView) {
        return (
            <View style={[styles.fallbackContainer, style]}>
                <Text style={styles.fallbackIcon}>🗺️</Text>
                <Text style={styles.fallbackTitle}>Map Unavailable</Text>
                <Text style={styles.fallbackText}>
                    Google Maps API key is not configured.
                </Text>
            </View>
        );
    }

    return (
        <MapErrorBoundary style={style}>
            <View style={[styles.container, style]}>
                <MapView
                    ref={innerMapRef}
                    style={styles.map}
                    region={region}
                    showsUserLocation={showsUserLocation}
                    showsMyLocationButton={showsMyLocationButton}
                    showsCompass={showsCompass}
                >
                    {/* User Location Circle */}
                    {userLocation && radius && Circle && (
                        <Circle
                            center={userLocation}
                            radius={radius}
                            strokeColor={colors.primary + '50'}
                            fillColor={colors.primary + '20'}
                            strokeWidth={2}
                        />
                    )}

                    {/* Custom Markers */}
                    {markers.map((marker, index) => (
                        Marker ? (
                            <Marker
                                key={marker.id || index}
                                coordinate={marker.coordinate}
                                title={marker.title}
                                description={marker.description}
                                onPress={() => onMarkerPress?.(marker)}
                            >
                                <View style={[
                                    styles.markerContainer,
                                    selectedMarkerId === marker.id && styles.markerSelected
                                ]}>
                                    <View style={[styles.markerBubble, { backgroundColor: colors.primary }]}>
                                        <Text style={styles.markerText}>
                                            {marker.number || index + 1}
                                        </Text>
                                    </View>
                                    <View style={[styles.markerArrow, { borderTopColor: colors.primary }]} />
                                </View>
                            </Marker>
                        ) : null
                    ))}

                    {Polyline && Array.isArray(polylineCoordinates) && polylineCoordinates.length > 1 && (
                        <Polyline
                            coordinates={polylineCoordinates}
                            strokeColor={polylineColor || colors.primary}
                            strokeWidth={polylineWidth}
                        />
                    )}

                    {children}
                </MapView>
            </View>
        </MapErrorBoundary>
    );
});

export default Map;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    fallbackIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    fallbackTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    fallbackText: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 40,
    },
    markerContainer: {
        alignItems: 'center',
    },
    markerBubble: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 4,
    },
    markerSelected: {
        transform: [{ scale: 1.2 }],
    },
    markerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    markerArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -2,
    },
});
