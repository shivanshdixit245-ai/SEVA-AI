"use client";

import { useEffect, useRef } from "react";

export default function MouseReactiveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            targetX = e.clientX;
            targetY = e.clientY;
        };

        class Orb {
            x: number;
            y: number;
            radius: number;
            color: string;
            vx: number;
            vy: number;
            friction: number = 0.95;
            spring: number = 0.01; // How strongly it follows mouse

            constructor(x: number, y: number, radius: number, color: string) {
                this.x = x;
                this.y = y;
                this.radius = radius;
                this.color = color;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
            }

            update() {
                // Simple physics to follow mouse loosely
                const dx = targetX - this.x;
                const dy = targetY - this.y;

                this.vx += dx * this.spring;
                this.vy += dy * this.spring;

                this.vx *= this.friction;
                this.vy *= this.friction;

                this.x += this.vx;
                this.y += this.vy;
            }

            draw() {
                if (!ctx) return;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, "transparent");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const orbs: Orb[] = [
            new Orb(canvas.width / 2, canvas.height / 2, 400, "rgba(139, 92, 246, 0.15)"), // Purple
            new Orb(canvas.width / 3, canvas.height / 3, 350, "rgba(6, 182, 212, 0.15)"),  // Cyan
            new Orb(canvas.width * 0.7, canvas.height * 0.7, 300, "rgba(236, 72, 153, 0.1)") // Pink
        ];

        function animate() {
            if (!ctx || !canvas) return;

            // Smooth mouse interpolation
            mouseX += (targetX - mouseX) * 0.1;
            mouseY += (targetY - mouseY) * 0.1;

            ctx.fillStyle = "#0a0a0f"; // Background color
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add a subtle grid pattern
            ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
            ctx.lineWidth = 1;
            const gridSize = 50;

            // Moving grid effect
            const offsetX = (mouseX * 0.05) % gridSize;
            const offsetY = (mouseY * 0.05) % gridSize;

            for (let x = -gridSize; x < canvas.width + gridSize; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x + offsetX, 0);
                ctx.lineTo(x + offsetX, canvas.height);
                ctx.stroke();
            }
            for (let y = -gridSize; y < canvas.height + gridSize; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y + offsetY);
                ctx.lineTo(canvas.width, y + offsetY);
                ctx.stroke();
            }


            orbs.forEach((orb, i) => {
                // Make orbs float around the mouse position with different offsets
                const time = Date.now() * 0.001;
                const offset = i * 2;

                // Override simplistic update with complex floating relative to mouse
                const floatX = Math.sin(time + offset) * 100;
                const floatY = Math.cos(time * 0.8 + offset) * 100;

                const dx = (mouseX + floatX) - orb.x;
                const dy = (mouseY + floatY) - orb.y;

                orb.vx += dx * 0.005; // Gentle pull
                orb.vy += dy * 0.005;
                orb.vx *= 0.95; // Drag
                orb.vy *= 0.95;

                orb.x += orb.vx;
                orb.y += orb.vy;

                orb.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        }

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", handleMouseMove);

        // Initial mouse position center
        targetX = window.innerWidth / 2;
        targetY = window.innerHeight / 2;

        animate();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
        />
    );
}
