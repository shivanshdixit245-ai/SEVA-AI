"use client";

import { useEffect, useRef } from "react";

export default function LiveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let hue = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;

            constructor() {
                this.x = Math.random() * (canvas?.width ?? 0);
                this.y = Math.random() * (canvas?.height ?? 0);
                this.size = Math.random() * 5 + 1;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.size > 0.2) this.size -= 0.05; // Shrink slightly

                // Wrap around screen
                if (canvas) {
                    if (this.x > canvas.width) this.x = 0;
                    if (this.x < 0) this.x = canvas.width;
                    if (this.y > canvas.height) this.y = 0;
                    if (this.y < 0) this.y = canvas.height;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.1)`; // Dynamic color
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            const numberOfparticles = 50; // Performance friendly count
            for (let i = 0; i < numberOfparticles; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            if (!ctx || !canvas) return;

            // Clear with slight trail effect
            ctx.fillStyle = "rgba(10, 10, 15, 0.05)"; // Dark background with trail
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw flowing mesh/gradient blobs instead of just dots
            hue += 0.5;

            // Draw 3 big moving gradient orbs
            const time = Date.now() * 0.001;

            // Orb 1
            const x1 = Math.sin(time) * 200 + canvas.width / 2;
            const y1 = Math.cos(time * 0.8) * 100 + canvas.height / 3;
            const gradient1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, 400);
            gradient1.addColorStop(0, "rgba(139, 92, 246, 0.15)"); // Purple
            gradient1.addColorStop(1, "transparent");
            ctx.fillStyle = gradient1;
            ctx.beginPath();
            ctx.arc(x1, y1, 400, 0, Math.PI * 2);
            ctx.fill();

            // Orb 2
            const x2 = Math.cos(time * 0.5) * 300 + canvas.width / 2;
            const y2 = Math.sin(time * 0.5) * 200 + canvas.height / 2;
            const gradient2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, 350);
            gradient2.addColorStop(0, "rgba(6, 182, 212, 0.15)"); // Cyan
            gradient2.addColorStop(1, "transparent");
            ctx.fillStyle = gradient2;
            ctx.beginPath();
            ctx.arc(x2, y2, 350, 0, Math.PI * 2);
            ctx.fill();

            // Orb 3 (Mouse follower if we added interaction, or just random)
            const x3 = Math.sin(time * 0.3) * 400 + canvas.width / 2;
            const y3 = Math.cos(time * 1.2) * 150 + canvas.height * 0.7;
            const gradient3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, 300);
            gradient3.addColorStop(0, "rgba(236, 72, 153, 0.1)"); // Pink
            gradient3.addColorStop(1, "transparent");
            ctx.fillStyle = gradient3;
            ctx.beginPath();
            ctx.arc(x3, y3, 300, 0, Math.PI * 2);
            ctx.fill();

            animationFrameId = requestAnimationFrame(animate);
        }

        resize();
        animate();

        window.addEventListener("resize", resize);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
            style={{ background: "#0a0a0f" }} // Fallback bg
        />
    );
}
