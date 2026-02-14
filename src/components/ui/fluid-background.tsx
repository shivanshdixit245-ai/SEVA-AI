"use client";

import { useEffect, useRef } from "react";

export default function FluidBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        let mouseX = width / 2;
        let mouseY = height / 2;
        // Smoothed mouse position for camera/orb influence
        let targetX = width / 2;
        let targetY = height / 2;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initOrbs();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        class Orb {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            color: string;
            originalX: number;
            originalY: number;
            angle: number;
            speed: number;

            constructor(color: string, xPercent: number, yPercent: number, sizePercent: number) {
                this.x = width * xPercent;
                this.y = height * yPercent;
                this.originalX = this.x;
                this.originalY = this.y;
                this.vx = 0;
                this.vy = 0;
                this.radius = Math.max(width, height) * sizePercent;
                this.color = color;
                this.angle = Math.random() * Math.PI * 2;
                this.speed = 0.5 + Math.random() * 0.5;
            }

            update() {
                // 1. Natural floating movement (sine waves)
                this.angle += 0.002 * this.speed;
                const floatX = Math.sin(this.angle) * 50;
                const floatY = Math.cos(this.angle * 0.8) * 50;

                // 2. Mouse Interaction (attraction/repulsion mix)
                // Calculate vector to smoothed mouse position
                const dx = targetX - this.x;
                const dy = targetY - this.y;

                // Move slightly towards mouse (camera parallax effect)
                this.x += dx * 0.02;
                this.y += dy * 0.02;

                // Keep orbs somewhat centered but floating
                // We blend the floating position with the mouse-influenced position
            }

            draw() {
                if (!ctx) return;

                // Create a massive soft gradient
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.radius
                );

                // Using screen/lighten blend modes via colors
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, "rgba(0,0,0,0)");

                ctx.globalCompositeOperation = "screen"; // This creates the glowing interaction
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";
            }
        }

        let orbs: Orb[] = [];

        function initOrbs() {
            orbs = [
                // Cyan/Blue center-left
                new Orb("rgba(6, 182, 212, 0.4)", 0.3, 0.4, 0.4),
                // Purple center-right
                new Orb("rgba(139, 92, 246, 0.4)", 0.7, 0.3, 0.5),
                // Pink bottom
                new Orb("rgba(236, 72, 153, 0.3)", 0.5, 0.8, 0.6),
                // Blue top
                new Orb("rgba(59, 130, 246, 0.3)", 0.5, 0.2, 0.5),
                // Teal floater
                new Orb("rgba(20, 184, 166, 0.2)", 0.8, 0.8, 0.3)
            ];
        }

        function animate() {
            if (!ctx || !canvas) return;

            // Smooth mouse tracking
            targetX += (mouseX - targetX) * 0.05;
            targetY += (mouseY - targetY) * 0.05;

            // Clear
            ctx.fillStyle = "#020617"; // Deep dark background
            ctx.fillRect(0, 0, width, height);

            orbs.forEach(orb => {
                orb.update();
                orb.draw();
            });

            // Optional: blur container via CSS, but let's see how it looks sharp first. 
            // Actually, a slight overlay for noise/texture makes it look premium.

            animationFrameId = requestAnimationFrame(animate);
        }

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", handleMouseMove);
        animate();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="fixed inset-0 w-full h-full -z-20 pointer-events-none"
            />
            {/* Glass overlay for that "frosted" fluid look */}
            <div className="fixed inset-0 -z-10 bg-transparent backdrop-blur-[80px]" />
        </>
    );
}
