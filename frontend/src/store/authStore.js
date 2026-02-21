import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object') {
    return user ?? null;
  }

  const normalizedId = user._id || user.id || null;
  return {
    ...user,
    id: normalizedId,
    _id: normalizedId,
  };
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({ user: normalizeUser(user), token, isAuthenticated: true });
        localStorage.setItem('token', token);
      },

      setUser: (user) => {
        set({ user: normalizeUser(user) });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('token');
        localStorage.removeItem('saved-products-storage');
      },

      initializeAuth: () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const payload = JSON.parse(jsonPayload);

            if (payload.exp * 1000 > Date.now()) {
              set({ token, isAuthenticated: true });
            } else {
              localStorage.removeItem('token');
            }
          } catch {
            localStorage.removeItem('token');
          }
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      getSellerId: () => {
        const { items } = get();
        if (items.length === 0) return null;
        return items[0].product.seller?._id || items[0].product.seller?.id;
      },

      addToCart: (product, quantity = 1, variant = null, selectedOptions = []) => {
        const { items } = get();
        const productSellerId = product.seller?._id || product.seller?.id;

        const itemKey = [
          product._id,
          variant?.name || '',
          ...selectedOptions.map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
        ].join('|');

        const existingIndex = items.findIndex(item => {
          const existKey = [
            item.product._id,
            item.variant?.name || '',
            ...(item.selectedOptions || []).map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
          ].join('|');
          return existKey === itemKey;
        });

        if (existingIndex >= 0) {
          set({
            items: items.map((item, i) =>
              i === existingIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { product, quantity, variant, selectedOptions }],
          });
        }
      },

      removeFromCart: (productId, variant = null, selectedOptions = []) => {
        const { items } = get();
        const itemKey = [
          productId,
          variant?.name || '',
          ...(selectedOptions || []).map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
        ].join('|');

        const newItems = items.filter(item => {
          const existKey = [
            item.product._id,
            item.variant?.name || '',
            ...(item.selectedOptions || []).map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
          ].join('|');
          return existKey !== itemKey;
        });
        set({ items: newItems });
      },

      updateQuantity: (productId, quantity, variant = null, selectedOptions = []) => {
        const { items } = get();
        if (quantity <= 0) {
          get().removeFromCart(productId, variant, selectedOptions);
          return;
        }
        const itemKey = [
          productId,
          variant?.name || '',
          ...(selectedOptions || []).map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
        ].join('|');

        set({
          items: items.map(item => {
            const existKey = [
              item.product._id,
              item.variant?.name || '',
              ...(item.selectedOptions || []).map(o => `${o.groupName}:${o.chosen.join(',')}`).sort()
            ].join('|');
            return existKey === itemKey ? { ...item, quantity } : item;
          }),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      clearSellerCart: (sellerId) => {
        const { items } = get();
        const newItems = items.filter(item => {
          const itemSellerId = item.product.seller?._id || item.product.seller?.id;
          return itemSellerId !== sellerId;
        });
        set({ items: newItems });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          let unitPrice = item.variant ? item.variant.price : item.product.price;
          if (item.selectedOptions && item.selectedOptions.length > 0) {
            unitPrice += item.selectedOptions.reduce((sum, opt) => sum + (opt.priceAdjust || 0), 0);
          }
          return total + (unitPrice * item.quantity);
        }, 0);
      },

      getItemsBySeller: () => {
        const { items } = get();
        const sellerMap = {};
        
        items.forEach(item => {
          const sellerId = item.product.seller?._id || item.product.seller?.id;
          const sellerName = item.product.seller?.businessName || item.product.seller?.name || 'Unknown Store';
          
          if (!sellerMap[sellerId]) {
            sellerMap[sellerId] = {
              sellerId,
              sellerName,
              items: [],
            };
          }
          sellerMap[sellerId].items.push(item);
        });
        
        return Object.values(sellerMap);
      },

      getSellerTotal: (sellerId) => {
        const { items } = get();
        return items
          .filter(item => (item.product.seller?._id || item.product.seller?.id) === sellerId)
          .reduce((total, item) => {
            let unitPrice = item.variant ? item.variant.price : item.product.price;
            if (item.selectedOptions && item.selectedOptions.length > 0) {
              unitPrice += item.selectedOptions.reduce((sum, opt) => sum + (opt.priceAdjust || 0), 0);
            }
            return total + (unitPrice * item.quantity);
          }, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
