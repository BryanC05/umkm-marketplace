import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    AppState,
    TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { useDriverStore } from '../store/driverStore';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { API_HOST } from '../config';
import notificationService, { usePushNotifications } from '../services/NotificationService';
import BackgroundEffect from '../components/BackgroundEffect';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import CartScreen from '../screens/cart/CartScreen';
import MessagesScreen from '../screens/chat/MessagesScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import ForumScreen from '../screens/forum/ForumScreen';
import ThreadDetailScreen from '../screens/forum/ThreadDetailScreen';
import SellerDashboardScreen from '../screens/seller/SellerDashboardScreen';
import AddProductScreen from '../screens/seller/AddProductScreen';
import MyProductsScreen from '../screens/seller/MyProductsScreen';
import LogoGeneratorScreen from '../screens/seller/LogoGeneratorScreen';
import BusinessDetailsScreen from '../screens/seller/BusinessDetailsScreen';
import MapViewScreen from '../screens/location/MapViewScreen';
import NearbySellersScreen from '../screens/location/NearbySellersScreen';
import LiveTrackingMap from '../screens/location/LiveTrackingMap';
import DeliveryHubScreen from '../screens/delivery/DeliveryHubScreen';
import AdminMembershipScreen from '../screens/admin/AdminMembershipScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import WishlistScreen from '../screens/wishlist/WishlistScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ProductsStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const AddStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const DeliveryStack = createNativeStackNavigator();

// Wrapper component to add floating cart button to HomeScreen
function HomeScreenWithCart({ navigation, route }) {
    return (
        <View style={{ flex: 1 }}>
            <HomeScreen navigation={navigation} route={route} />
            <FloatingCartButton navigation={navigation} />
        </View>
    );
}

// Stack Navigators
function HomeStackNavigator() {
    const { colors } = useThemeStore();
    return (
        <View style={{ flex: 1 }}>
            <HomeStack.Navigator
                screenOptions={{
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                }}
            >
                <HomeStack.Screen name="Home" component={HomeScreenWithCart} options={{ headerShown: false }} />
                <HomeStack.Screen
                    name="ProductDetail"
                    component={ProductDetailScreen}
                    options={{ headerShown: false }}
                />
                <HomeStack.Screen
                    name="MapView"
                    component={MapViewScreen}
                    options={{ headerShown: false }}
                />
                <HomeStack.Screen
                    name="BusinessDetails"
                    component={BusinessDetailsScreen}
                    options={{ headerShown: false }}
                />
                <HomeStack.Screen
                    name="NearbySellers"
                    component={NearbySellersScreen}
                    options={{ headerShown: false }}
                />
            </HomeStack.Navigator>
        </View>
    );
}

function ProductsStackNavigator() {
    const { colors } = useThemeStore();
    const { t, languageVersion } = useLanguageStore();

    const ProductsWrapper = ({ navigation: nav, route }) => {
        React.useEffect(() => {
            if (route?.params?.reset) {
                nav.setParams({ reset: undefined });
                nav.popToTop();
            }
        }, [nav, route?.params?.reset]);

        return (
            <View style={{ flex: 1 }}>
                <ProductsScreen navigation={nav} route={route} />
                <FloatingCartButton navigation={nav} />
            </View>
        );
    };

    return (
        <ProductsStack.Navigator
            screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <ProductsStack.Screen
                name="Products"
                component={ProductsWrapper}
                options={{
                    title: t.navProducts,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />
            <ProductsStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{ headerShown: false }}
            />
            <ProductsStack.Screen
                name="MapView"
                component={MapViewScreen}
                options={{ headerShown: false }}
            />
            <ProductsStack.Screen
                name="BusinessDetails"
                component={BusinessDetailsScreen}
                options={{ headerShown: false }}
            />
        </ProductsStack.Navigator>
    );
}

function CartStackNavigator() {
    const { colors } = useThemeStore();
    const { t, languageVersion } = useLanguageStore();
    return (
        <CartStack.Navigator
            screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <CartStack.Screen
                name="CartMain"
                component={CartScreen}
                options={{
                    title: t.navCart,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />
        </CartStack.Navigator>
    );
}

function AddStackNavigator() {
    const { colors } = useThemeStore();
    return (
        <AddStack.Navigator
            screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <AddStack.Screen
                name="AddProduct"
                component={AddProductScreen}
                options={{ headerShown: false }}
            />
        </AddStack.Navigator>
    );
}

function DeliveryStackNavigator() {
    const { colors } = useThemeStore();
    const { t, languageVersion } = useLanguageStore();
    return (
        <DeliveryStack.Navigator
            screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <DeliveryStack.Screen
                name="DeliveryHub"
                component={DeliveryHubScreen}
                options={{ headerShown: false }}
            />
        </DeliveryStack.Navigator>
    );
}

function ProfileStackNavigator() {
    const { colors } = useThemeStore();
    const { t, languageVersion } = useLanguageStore();
    return (
        <ProfileStack.Navigator
            screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <ProfileStack.Screen
                name="ProfileMain"
                component={ProfileScreen}
                options={{
                    title: t.navProfile,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />
            <ProfileStack.Screen
                name="Orders"
                component={OrdersScreen}
                options={{
                    title: t.navOrders,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />
            <ProfileStack.Screen
                name="Forum"
                component={ForumScreen}
                options={{
                    title: t.navForum,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />
            <ProfileStack.Screen
                name="ThreadDetail"
                component={ThreadDetailScreen}
                options={{
                    title: t.navDiscussion,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '600', fontSize: 16, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />

            {/* Seller Screens */}
            <ProfileStack.Screen
                name="SellerDashboard"
                component={SellerDashboardScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="AddProduct"
                component={AddProductScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="MyProducts"
                component={MyProductsScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="LogoGenerator"
                component={LogoGeneratorScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="MapView"
                component={MapViewScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="NearbySellers"
                component={NearbySellersScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="BusinessDetails"
                component={BusinessDetailsScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="Wishlist"
                component={WishlistScreen}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="LiveTracking"
                component={LiveTrackingMap}
                options={{
                    headerShown: false,
                }}
            />
            <ProfileStack.Screen
                name="Messages"
                component={MessagesScreen}
                options={{
                    title: t.navMessages,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />
            <ProfileStack.Screen
                name="Chat"
                component={ChatScreen}
                options={({ route }) => ({
                    title: route.params?.otherUser?.name || t.navChat,
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '600', fontSize: 16, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                })}
            />
            <ProfileStack.Screen
                name="AdminMembership"
                component={AdminMembershipScreen}
                options={{
                    title: 'Membership Approvals',
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.text },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                }}
            />
            <ProfileStack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ headerShown: false }}
            />
        </ProfileStack.Navigator>
    );
}

// Cart badge component
function CartBadge() {
    const items = useCartStore((s) => s.items);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    if (count === 0) return null;
    return (
        <View style={badgeStyles.badge}>
            <Text style={badgeStyles.text}>{count > 9 ? '9+' : count}</Text>
        </View>
    );
}

// Floating Cart Button - appears on Home and Products screens
function FloatingCartButton({ navigation }) {
    const items = useCartStore((s) => s.items);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const { colors } = useThemeStore();

    if (count === 0) return null;

    return (
        <TouchableOpacity
            style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
            }}
            onPress={() => navigation.navigate('CartTab', { screen: 'CartMain' })}
        >
            <Ionicons name="cart" size={24} color={colors.white} />
            <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: colors.danger,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 4,
            }}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>
                    {count > 9 ? '9+' : count}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// Delivery badge component
function DeliveryBadge() {
    const { isDriverMode, activeDelivery } = useDriverStore();
    if (!isDriverMode || !activeDelivery) return null;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: '#10b981' }]}>
            <Text style={badgeStyles.text}>1</Text>
        </View>
    );
}

// Notification badge for profile tab
function NotificationBadge() {
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    if (unreadCount === 0) return null;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: '#f43f5e' }]}>
            <Text style={badgeStyles.text}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
    );
}

// WebSocket listener for real-time notifications
function NotificationListener() {
    const { token, isAuthenticated } = useAuthStore();
    const { addNotification, fetchUnreadCount } = useNotificationStore();
    const wsRef = useRef(null);
    const reconnectRef = useRef(null);
    const pingRef = useRef(null);

    // Request permissions and setup listeners for push/local notifications
    usePushNotifications();

    useEffect(() => {
        if (!isAuthenticated || !token) return;

        fetchUnreadCount();

        function connect() {
            // Clean up existing connection
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
            
            const wsProtocol = API_HOST.startsWith('https') ? 'wss' : 'ws';
            // Remove any trailing slashes and protocol
            const wsHost = API_HOST.replace(/^https?:\/\//, '').replace(/\/+$/, '');
            const wsUrl = `${wsProtocol}://${wsHost}/ws?token=${token}`;
            
            console.log('🔌 [WebSocket] Attempting to connect to:', `${wsProtocol}://${wsHost}/ws`);
            
            // First test if server is reachable
            fetch(`${API_HOST}/api/health`, { method: 'GET' })
                .then(res => {
                    console.log('✅ [WebSocket] Server reachable:', res.status);
                })
                .catch(err => {
                    console.log('❌ [WebSocket] Server not reachable:', err.message);
                });
            
            try {
                const ws = new WebSocket(wsUrl);
                
                // Add connection timeout
                const connectionTimeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        console.log('⏱️ [WebSocket] Connection timeout, closing...');
                        ws.close();
                    }
                }, 10000);
                
                ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log('🟢 [WebSocket] Connected successfully');
                    pingRef.current = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30000);
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'pong' || message.type === 'ping') return;

                        console.log('🔵 [WebSocket] Message received:', event.data);

                        if (message.type === 'notification' && message.data) {
                            // Handle both camelCase and PascalCase from backend
                            const title = message.data.title || message.data.Title || 'New Notification';
                            const body = message.data.message || message.data.Message || message.data.body || 'You have a new notification';
                            const notifType = message.data.type || message.data.Type || 'notification';

                            console.log('🔔 [Notification] Received:', notifType, title, body);

                            // Add to store first (this updates the UI)
                            addNotification(message.data);

                            // Then show popup notification
                            notificationService.initialize()
                                .then(() => {
                                    console.log('🔔 [Notification] Service initialized, scheduling...');
                                    return notificationService.scheduleLocalNotification(
                                        title,
                                        body,
                                        message.data.data || message.data.Data || { type: notifType },
                                        1
                                    );
                                })
                                .then(() => {
                                    console.log('🔔 [Notification] Scheduled successfully');
                                })
                                .catch((err) => {
                                    console.error('🔔 [Notification] Failed:', err.message);
                                });
                        }
                    } catch (e) {
                        console.error('🔴 [WebSocket] Parse error:', e);
                    }
                };

                ws.onclose = (event) => {
                    clearInterval(pingRef.current);
                    clearTimeout(connectionTimeout);
                    console.log('🔌 [WebSocket] Closed:', event.code, event.reason);
                    
                    if (wsRef.current === ws) {
                        // Only reconnect if not a normal closure
                        if (event.code !== 1000) {
                            console.log('🔄 [WebSocket] Reconnecting in 5s...');
                            reconnectRef.current = setTimeout(() => {
                                if (isAuthenticated && token) connect();
                            }, 5000);
                        }
                    }
                };

                ws.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.log('⚠️ [WebSocket] Error - readyState:', ws.readyState);
                    console.log('⚠️ [WebSocket] Error details:', error);
                };
                
                wsRef.current = ws;
            } catch (e) {
                console.error('🔴 [WebSocket] Failed to create:', e);
            }
        }

        connect();

        // Handle App going to background / foreground
        const appStateSubscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
                    console.log('🔄 [WebSocket] App returned to foreground, forcing reconnect...');
                    clearInterval(pingRef.current);
                    clearTimeout(reconnectRef.current);
                    connect();
                }
                // Also fetch fresh notifications when app becomes active
                fetchUnreadCount();
            }
        });

        return () => {
            appStateSubscription.remove();
            clearInterval(pingRef.current);
            clearTimeout(reconnectRef.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isAuthenticated, token, addNotification, fetchUnreadCount]);

    // Fallback: Poll for notifications every 30 seconds if WebSocket fails
    useEffect(() => {
        if (!isAuthenticated) return;
        
        const pollInterval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);
        
        return () => clearInterval(pollInterval);
    }, [isAuthenticated, fetchUnreadCount]);

    return null;
}

const badgeStyles = StyleSheet.create({
    badge: {
        position: 'absolute', top: -4, right: -8,
        backgroundColor: '#ef4444', borderRadius: 10,
        minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4,
    },
    text: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

// Main Tab Navigator
export default function AppNavigator() {
    const { colors, isDarkMode } = useThemeStore();
    const { t, languageVersion } = useLanguageStore();
    const isDriverMode = useDriverStore((s) => s.isDriverMode);

    return (
        <>
            <NotificationListener />
            <Tab.Navigator
                screenOptions={({ route, navigation }) => ({
                    tabBarOnPress: ({ defaultHandler, navigation: tabNavigation }) => {
                        const state = tabNavigation.getState();
                        const currentRoute = state.routes[state.index];
                        const currentScreenName = currentRoute?.state?.routes?.[currentRoute?.state?.index]?.name;
                        const isFocused = tabNavigation.isFocused();
                        
                        // If already on Products tab and not on Products screen, reset to Products
                        if (route.name === 'ProductsTab') {
                            if (isFocused && currentScreenName !== 'Products') {
                                tabNavigation.navigate('ProductsTab', { 
                                    screen: 'Products', 
                                    params: { reset: true },
                                    merge: true 
                                });
                            } else if (isFocused) {
                                tabNavigation.navigate('ProductsTab', { screen: 'Products', params: { reset: true } });
                            } else {
                                defaultHandler();
                            }
                        } else if (isFocused) {
                            // Handle other tabs similarly
                            const screenName = route.name.replace('Tab', '');
                            tabNavigation.navigate(route.name, { screen: screenName, params: { reset: true } });
                        } else {
                            defaultHandler();
                        }
                    },
                    headerShown: false,
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName;
                        switch (route.name) {
                            case 'HomeTab': iconName = focused ? 'home' : 'home-outline'; break;
                            case 'ProductsTab': iconName = focused ? 'grid' : 'grid-outline'; break;
                            case 'DeliveryTab': iconName = focused ? 'bicycle' : 'bicycle-outline'; break;
                            case 'AddTab': iconName = focused ? 'add-circle' : 'add-circle-outline'; break;
                            case 'ProfileTab': iconName = focused ? 'person' : 'person-outline'; break;
                            default: iconName = 'ellipse';
                        }
                        return (
                            <View>
                                <Ionicons name={iconName} size={22} color={color} />
                                {route.name === 'DeliveryTab' && <DeliveryBadge />}
                                {route.name === 'ProfileTab' && <NotificationBadge />}
                            </View>
                        );
                    },
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.textSecondary,
                    tabBarStyle: {
                        backgroundColor: colors.card,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        height: 70,
                        paddingTop: 6,
                        paddingBottom: 20,
                        shadowColor: isDarkMode ? colors.primary : '#000',
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: isDarkMode ? 0.1 : 0.05,
                        shadowRadius: 8,
                        elevation: 5,
                    },
                    tabBarItemStyle: {
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: '600',
                        marginTop: 2,
                    },
                })}
                sceneContainerStyle={{ backgroundColor: colors.background }}
            >
                <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ tabBarLabel: t.tabHome }} />
                <Tab.Screen name="ProductsTab" component={ProductsStackNavigator} options={{ tabBarLabel: t.tabProducts }} />
                <Tab.Screen 
                    name="CartTab" 
                    component={CartStackNavigator} 
                    options={{ 
                        tabBarLabel: t.tabCart,
                        tabBarButton: () => null, // Hide from tab bar but keep navigable
                    }} 
                />
                {/* Delivery disabled
                {isDriverMode && (
                    <Tab.Screen name="DeliveryTab" component={DeliveryStackNavigator} options={{ tabBarLabel: t.tabDelivery || 'Delivery' }} />
                )}
                */}
                <Tab.Screen name="AddTab" component={AddStackNavigator} options={{ tabBarLabel: t.tabAdd }} />
                <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ tabBarLabel: t.tabProfile }} />
            </Tab.Navigator>
            {/* Global background: floating food icons + particle bursts */}
            <BackgroundEffect />
        </>
    );
}
