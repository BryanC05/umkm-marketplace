import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_KEY = 'cart-storage';

const saveCart = async (items) => {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify({ items }));
};

const loadCart = async () => {
    try {
        const data = await AsyncStorage.getItem(CART_KEY);
        return data ? JSON.parse(data) : { items: [] };
    } catch {
        return { items: [] };
    }
};

// Build a composite key from product + variant + options
const buildItemKey = (item) => [
    item.product._id,
    item.variant?.name || '',
    ...(item.selectedOptions || []).map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
].join('|');

// Get seller ID from product
const getSellerId = (product) => product.seller?._id || product.seller?.id;

// Get seller display name (businessName preferred, fallback to name)
const getSellerName = (product) => {
    const seller = product.seller;
    if (!seller) return 'Unknown Store';
    return seller.businessName?.trim() || seller.name || 'Unknown Store';
};

// Get seller real name
const getSellerRealName = (product) => {
    const seller = product.seller;
    if (!seller) return 'Unknown';
    return seller.name || 'Unknown';
};

export const useCartStore = create((set, get) => ({
    items: [],
    isLoaded: false,

    loadCart: async () => {
        const data = await loadCart();
        set({ items: data.items || [], isLoaded: true });
    },

    addToCart: async (product, quantity = 1, variant = null, selectedOptions = []) => {
        const { items } = get();

        const newItemKey = buildItemKey({ product, variant, selectedOptions });
        const existingIndex = items.findIndex(item => buildItemKey(item) === newItemKey);
        let newItems;

        if (existingIndex >= 0) {
            newItems = items.map((item, i) =>
                i === existingIndex
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            );
        } else {
            newItems = [...items, { product, quantity, variant, selectedOptions }];
        }

        set({ items: newItems });
        await saveCart(newItems);
        return 'added';
    },

    removeFromCart: async (productId, variant = null, selectedOptions = []) => {
        const { items } = get();
        const targetKey = buildItemKey({ product: { _id: productId }, variant, selectedOptions });
        const newItems = items.filter(item => buildItemKey(item) !== targetKey);
        set({ items: newItems });
        await saveCart(newItems);
    },

    updateQuantity: async (productId, quantity, variant = null, selectedOptions = []) => {
        if (quantity <= 0) {
            await get().removeFromCart(productId, variant, selectedOptions);
            return;
        }
        const { items } = get();
        const targetKey = buildItemKey({ product: { _id: productId }, variant, selectedOptions });
        const newItems = items.map(item =>
            buildItemKey(item) === targetKey ? { ...item, quantity } : item
        );
        set({ items: newItems });
        await saveCart(newItems);
    },

    clearCart: async () => {
        set({ items: [] });
        await AsyncStorage.removeItem(CART_KEY);
    },

    clearSellerCart: async (sellerId) => {
        const { items } = get();
        const newItems = items.filter(item => {
            const itemSellerId = getSellerId(item.product);
            return itemSellerId !== sellerId;
        });
        set({ items: newItems });
        await saveCart(newItems);
    },

    getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),

    getTotalPrice: () => get().items.reduce((total, item) => {
        let unitPrice = item.variant ? item.variant.price : item.product.price;
        if (item.selectedOptions?.length > 0) {
            unitPrice += item.selectedOptions.reduce((sum, opt) => sum + (opt.priceAdjust || 0), 0);
        }
        return total + (unitPrice * item.quantity);
    }, 0),

    getSellerTotal: (sellerId) => {
        const { items } = get();
        return items
            .filter(item => getSellerId(item.product) === sellerId)
            .reduce((total, item) => {
                let unitPrice = item.variant ? item.variant.price : item.product.price;
                if (item.selectedOptions?.length > 0) {
                    unitPrice += item.selectedOptions.reduce((sum, opt) => sum + (opt.priceAdjust || 0), 0);
                }
                return total + (unitPrice * item.quantity);
            }, 0);
    },

    getItemsBySeller: () => {
        const { items } = get();
        const sellerMap = {};
        
        items.forEach(item => {
            const sellerId = getSellerId(item.product);
            const sellerName = getSellerName(item.product);
            const sellerRealName = getSellerRealName(item.product);
            
            if (!sellerMap[sellerId]) {
                sellerMap[sellerId] = {
                    sellerId,
                    sellerName,
                    sellerRealName,
                    items: [],
                };
            }
            sellerMap[sellerId].items.push(item);
        });
        
        return Object.values(sellerMap);
    },
}));
