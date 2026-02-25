import { useEffect, useState, useRef } from 'react';

// ─── Layer 1: Slow warm gradient that cycles through Indonesian-inspired tones ───
const GradientBackground = () => (
    <div
        className="absolute inset-0 pointer-events-none z-[-2]"
        aria-hidden="true"
    >
        <style>{`
            @keyframes warmGradientCycle {
                0%   { background-position: 0% 50%; }
                50%  { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            .warm-gradient-bg {
                position: absolute;
                inset: 0;
                background: linear-gradient(
                    -45deg,
                    hsl(33,  90%, 97%),
                    hsl(42,  90%, 95%),
                    hsl(25,  80%, 96%),
                    hsl(50,  85%, 94%),
                    hsl(18,  75%, 96%)
                );
                background-size: 400% 400%;
                animation: warmGradientCycle 30s ease infinite;
                opacity: 1;
            }
            .dark .warm-gradient-bg {
                background: linear-gradient(
                    -45deg,
                    hsl(220, 25%, 9%),
                    hsl(240, 20%, 11%),
                    hsl(260, 20%, 10%),
                    hsl(210, 25%, 9%),
                    hsl(230, 22%, 8%)
                );
                background-size: 400% 400%;
            }
        `}</style>
        <div className="warm-gradient-bg" />
    </div>
);

// ─── Main: Mouse spotlight + ⭐ cursor trail + cart burst + layers above ───
const InteractiveBackground = () => {
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        setIsClient(true);
        let rafId;
        let lastSpawnTime = 0;

        const handleMouseMove = (e) => {
            if (rafId) cancelAnimationFrame(rafId);

            rafId = requestAnimationFrame(() => {
                const now = Date.now();
                // Spawn a ⭐ star every ~40ms to avoid DOM overload
                if (now - lastSpawnTime > 40 && containerRef.current) {
                    lastSpawnTime = now;

                    const particle = document.createElement('div');
                    particle.textContent = '⭐';
                    particle.style.position = 'absolute';
                    particle.style.left = `${e.clientX}px`;
                    particle.style.top = `${e.clientY}px`;
                    particle.style.fontSize = `${14 + Math.random() * 18}px`;
                    particle.style.pointerEvents = 'none';
                    particle.style.userSelect = 'none';
                    particle.style.zIndex = '50';
                    particle.style.filter = 'drop-shadow(0 0 4px rgba(234,179,8,0.5))';

                    const angle = Math.random() * Math.PI * 2;
                    const velocity = 40 + Math.random() * 100;
                    const dx = Math.cos(angle) * velocity;
                    const dy = Math.sin(angle) * velocity + Math.random() * 60;
                    const rotation = (Math.random() - 0.5) * 360;

                    particle.style.transition = 'transform 1s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1s ease-out';
                    particle.style.transform = 'translate(-50%, -50%) scale(0.5)';
                    particle.style.opacity = '0.5'; // 50% as requested

                    containerRef.current.appendChild(particle);

                    requestAnimationFrame(() => {
                        particle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rotation}deg) scale(1.2)`;
                        particle.style.opacity = '0';
                    });

                    setTimeout(() => {
                        if (particle.parentNode === containerRef.current) {
                            containerRef.current.removeChild(particle);
                        }
                    }, 1000);
                }
            });
        };

        const handleCartBurst = (e) => {
            const { x, y } = e.detail || {};
            if (!containerRef.current || !x || !y) return;

            const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
            const icons = ['🛒', '✨', '🛍️', '🎉'];

            for (let i = 0; i < 30; i++) {
                const particle = document.createElement('div');
                particle.textContent = icons[Math.floor(Math.random() * icons.length)];
                particle.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                    color: ${colors[Math.floor(Math.random() * colors.length)]};
                    font-size: ${16 + Math.random() * 24}px;
                    pointer-events: none;
                    user-select: none;
                    z-index: 60;
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.1);
                    transition: transform 1.5s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 1.5s ease-out;
                `;
                containerRef.current.appendChild(particle);

                const angle = Math.random() * Math.PI * 2;
                const vel = 100 + Math.random() * 300;
                const dx = Math.cos(angle) * vel;
                const dy = Math.sin(angle) * vel + (Math.random() * 150 - 50);
                const rot = (Math.random() - 0.5) * 1080;

                requestAnimationFrame(() => {
                    particle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg) scale(${1 + Math.random()})`;
                    particle.style.opacity = '0';
                });

                setTimeout(() => {
                    if (particle.parentNode === containerRef.current) {
                        containerRef.current.removeChild(particle);
                    }
                }, 1500);
            }
        };

        const spawnBurst = (x, y, icons, count = 20, velocityRange = 300) => {
            for (let i = 0; i < count; i++) {
                const particle = document.createElement('div');
                particle.textContent = icons[Math.floor(Math.random() * icons.length)];

                // Append to body — the container has overflow:hidden which clips fixed children
                particle.style.cssText = `
                    position: fixed;
                    left: ${x}px;
                    top: ${y}px;
                    font-size: ${24 + Math.random() * 24}px;
                    pointer-events: none;
                    user-select: none;
                    z-index: 9999;
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3);
                    transition: transform 1.4s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 1.4s ease-out;
                `;
                document.body.appendChild(particle);

                const angle = Math.random() * Math.PI * 2;
                const vel = 80 + Math.random() * velocityRange;
                const dx = Math.cos(angle) * vel;
                const dy = Math.sin(angle) * vel - (50 + Math.random() * 100);
                const rot = (Math.random() - 0.5) * 720;

                // Double rAF so browser paints initial state before the transition fires
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        particle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg) scale(1.2)`;
                        particle.style.opacity = '0';
                    });
                });

                setTimeout(() => {
                    if (particle.parentNode === document.body) document.body.removeChild(particle);
                }, 1400);
            }
        };

        const handleParticleBurst = (e) => {
            const { type, x, y } = e.detail || {};
            if (!x || !y) return;
            if (type === 'add-to-cart') {
                spawnBurst(x, y, ['🛒', '🍜', '⭐', '✨', '🛍️'], 20, 280);
            } else if (type === 'save') {
                spawnBurst(x, y, ['❤️', '💖', '💕', '✨', '💝'], 18, 240);
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('trigger-cart-burst', handleCartBurst);
        window.addEventListener('particle-burst', handleParticleBurst);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('trigger-cart-burst', handleCartBurst);
            window.removeEventListener('particle-burst', handleParticleBurst);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    if (!isClient) return null;

    return (
        <>
            {/* Gradient layer sits beneath everything */}
            <GradientBackground />

            {/* Particle container — ⭐ trail lives here */}
            <div
                ref={containerRef}
                className="interactive-bg-container pointer-events-none fixed inset-0 z-0 overflow-hidden"
                aria-hidden="true"
            />
        </>
    );
};

export default InteractiveBackground;
