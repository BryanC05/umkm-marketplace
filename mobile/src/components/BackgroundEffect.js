import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    Animated,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { useThemeStore } from '../store/themeStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Global Event Bus ────────────────────────────────────────────────────────
// A lightweight pub/sub that replaces window.dispatchEvent for React Native.
// Usage from any screen:
//   import { particleEvents } from '../components/BackgroundEffect';
//   particleEvents.emit('particle-burst', { type: 'add-to-cart', x, y });
class EventBus {
    constructor() { this._listeners = {}; }
    on(event, cb) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(cb);
        return () => this.off(event, cb);
    }
    off(event, cb) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(l => l !== cb);
    }
    emit(event, data) {
        (this._listeners[event] || []).forEach(cb => cb(data));
    }
}
export const particleEvents = new EventBus();

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BackgroundEffect() {
    const { colors } = useThemeStore();
    const [bursts, setBursts] = useState([]);

    useEffect(() => {
        const BURST_CONFIGS = {
            'add-to-cart': { icons: ['🛒', '🍜', '⭐', '✨', '🛍️'], count: 16 },
            'save': { icons: ['❤️', '💖', '💕', '✨', '💝'], count: 14 },
            'checkout': { icons: ['🎉', '🛒', '🛍️', '✨', '🥳'], count: 24 },
        };

        const unsub = particleEvents.on('particle-burst', ({ type, x, y }) => {
            const config = BURST_CONFIGS[type];
            if (!config || !x || !y) return;
            const id = Date.now() + Math.random();
            setBursts(prev => [...prev, { id, x, y, ...config }]);
        });

        return unsub;
    }, []);

    const removeBurst = useCallback((id) => {
        setBursts(prev => prev.filter(b => b.id !== id));
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Particle bursts */}
            {bursts.map(burst => (
                <ParticleBurst
                    key={burst.id}
                    x={burst.x}
                    y={burst.y}
                    icons={burst.icons}
                    count={burst.count}
                    onDone={() => removeBurst(burst.id)}
                />
            ))}
        </View>
    );
}
