import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_KEY = 'cart-storage';

const saveCart = async (items, sellerId) => {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify({ items, sellerId }));
};

const loadCart = async () => {
    try {
        const data = await AsyncStorage.getItem(CART_KEY);
        return data ? JSON.parse(data) : { items: [], sellerId: null };
    } catch {
        return { items: [], sellerId: null };
    }
};

// Build a composite key from product + variant + options
const buildItemKey = (item) => [
    item.product._id,
    item.variant?.name || '',
    ...(item.selectedOptions || []).map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
].join('|');

export const useCartStore = create((set, get) => ({
    items: [],
    sellerId: null,
    isLoaded: false,

    loadCart: async () => {
        const data = await loadCart();
        set({ items: data.items, sellerId: data.sellerId, isLoaded: true });
    },

    addToCart: async (product, quantity = 1, variant = null, selectedOptions = []) => {
        const { items, sellerId } = get();

        if (sellerId && sellerId !== product.seller._id) {
            const newItems = [{ product, quantity, variant, selectedOptions }];
            set({ items: newItems, sellerId: product.seller._id });
            await saveCart(newItems, product.seller._id);
            return 'replaced';
        }

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

        const newSellerId = product.seller._id;
        set({ items: newItems, sellerId: newSellerId });
        await saveCart(newItems, newSellerId);
        return 'added';
    },

    removeFromCart: async (productId, variant = null, selectedOptions = []) => {
        const { items } = get();
        const targetKey = buildItemKey({ product: { _id: productId }, variant, selectedOptions });
        const newItems = items.filter(item => buildItemKey(item) !== targetKey);
        const newSellerId = newItems.length > 0 ? get().sellerId : null;
        set({ items: newItems, sellerId: newSellerId });
        await saveCart(newItems, newSellerId);
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
        await saveCart(newItems, get().sellerId);
    },

    clearCart: async () => {
        set({ items: [], sellerId: null });
        await AsyncStorage.removeItem(CART_KEY);
    },

    getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),

    getTotalPrice: () => get().items.reduce((total, item) => {
        let unitPrice = item.variant ? item.variant.price : item.product.price;
        if (item.selectedOptions?.length > 0) {
            unitPrice += item.selectedOptions.reduce((sum, opt) => sum + (opt.priceAdjust || 0), 0);
        }
        return total + (unitPrice * item.quantity);
    }, 0),
}));
