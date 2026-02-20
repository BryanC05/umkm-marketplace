import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';

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

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ProductsStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const AddStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Stack Navigators
function HomeStackNavigator() {
    const { colors } = useThemeStore();
    return (
        <HomeStack.Navigator
            screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
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
    );
}

function ProductsStackNavigator() {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();

    const ProductsWrapper = ({ navigation, route }) => {
        React.useEffect(() => {
            if (route?.params?.reset) {
                navigation.setParams({ reset: undefined });
                navigation.popToTop();
            }
        }, [navigation, route?.params?.reset]);

        return <ProductsScreen navigation={navigation} route={route} />;
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
                name="NearbySellers"
                component={NearbySellersScreen}
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
    const { t } = useLanguageStore();
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

function ProfileStackNavigator() {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
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
    const { t } = useLanguageStore();

    return (
        <Tab.Navigator
            screenOptions={({ route, navigation }) => ({
                tabBarOnPress: ({ defaultHandler }) => {
                    const isFocused = navigation.isFocused();
                    if (isFocused && route.name === 'ProductsTab') {
                        navigation.navigate('ProductsTab', { screen: 'Products', params: { reset: true } });
                    } else if (isFocused && route.name === 'HomeTab') {
                        navigation.navigate('HomeTab', { screen: 'Home', params: { reset: true } });
                    } else if (isFocused && route.name === 'CartTab') {
                        navigation.navigate('CartTab', { screen: 'CartMain', params: { reset: true } });
                    } else if (isFocused && route.name === 'ProfileTab') {
                        navigation.navigate('ProfileTab', { screen: 'ProfileMain', params: { reset: true } });
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
                        case 'CartTab': iconName = focused ? 'cart' : 'cart-outline'; break;
                        case 'AddTab': iconName = focused ? 'add-circle' : 'add-circle-outline'; break;
                        case 'ProfileTab': iconName = focused ? 'person' : 'person-outline'; break;
                        default: iconName = 'ellipse';
                    }
                    return (
                        <View>
                            <Ionicons name={iconName} size={22} color={color} />
                            {route.name === 'CartTab' && <CartBadge />}
                        </View>
                    );
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: 85,
                    paddingTop: 8,
                    paddingBottom: 28,
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
            <Tab.Screen name="CartTab" component={CartStackNavigator} options={{ tabBarLabel: t.tabCart }} />
            <Tab.Screen name="AddTab" component={AddStackNavigator} options={{ tabBarLabel: t.tabAdd }} />
            <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ tabBarLabel: t.tabProfile }} />
        </Tab.Navigator>
    );
}
