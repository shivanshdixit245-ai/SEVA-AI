"use client";

import { useEffect, useRef } from "react";

export default function AuroraBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let time = 0;
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const draw = () => {
            if (!ctx || !canvas) return;

            // Clear background
            ctx.fillStyle = "#050510"; // Very dark blue/black
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            time += 0.002;

            // Create flowing gradient waves
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

            // Dynamic colors based on time
            const c1 = Math.sin(time) * 20 + 200; // Blue variation
            const c2 = Math.cos(time * 0.7) * 20 + 150; // Purple/Green variation

            // Draw multiple overlapping sine waves for "Northern Lights" effect
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();

                let prevX = 0;
                let prevY = canvas.height / 2;

                ctx.moveTo(0, canvas.height); // Start bottom left

                for (let x = 0; x <= canvas.width; x += 10) {
                    // Complex wave function
                    const y =
                        canvas.height / 2 +
                        Math.sin(x * 0.003 + time + i) * 100 +
                        Math.sin(x * 0.01 + time * 2) * 50;

                    ctx.lineTo(x, y);
                    prevX = x;
                    prevY = y;
                }

                ctx.lineTo(canvas.width, canvas.height); // Bottom right
                ctx.lineTo(0, canvas.height); // Back to bottom left
                ctx.closePath();

                // Aurora colors
                const opacity = 0.15;
                if (i === 0) ctx.fillStyle = `hsla(260, 80%, 60%, ${opacity})`; // Purple
                if (i === 1) ctx.fillStyle = `hsla(200, 90%, 50%, ${opacity})`; // Blue
                if (i === 2) ctx.fillStyle = `hsla(160, 80%, 50%, ${opacity})`; // Cyan/Green

                ctx.fill();

                // Add a blur effect for softness (simulated by layering or using filter if supported, 
                // but ctx.filter is expensive. We keep it sharp but low opacity for performance)
            }

            // Add stars/dust
            const starCount = 50;
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            for (let i = 0; i < starCount; i++) {
                const x = (Math.sin(i * 132.1 + time * 0.1) * 0.5 + 0.5) * canvas.width;
                const y = (Math.cos(i * 45.3 + time * 0.1) * 0.5 + 0.5) * canvas.height;
                const size = (Math.sin(i + time) + 2) * 0.8;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }


            animationFrameId = requestAnimationFrame(draw);
        };

        resize();
        window.addEventListener("resize", resize);
        draw();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full -z-10 pointer-events-none transition-opacity duration-1000"
        />
    );
}
