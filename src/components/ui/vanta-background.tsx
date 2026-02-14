"use client";

import { useEffect, useRef, useState } from "react";
// @ts-ignore
import CLOUDS from "vanta/dist/vanta.clouds.min";
import * as THREE from "three";

export default function VantaBackground() {
    const vantaRef = useRef<HTMLDivElement>(null);
    const [vantaEffect, setVantaEffect] = useState<any>(null);

    useEffect(() => {
        if (!vantaEffect && vantaRef.current) {
            try {
                setVantaEffect(
                    CLOUDS({
                        el: vantaRef.current,
                        THREE: THREE,
                        mouseControls: true,
                        touchControls: true,
                        gyroControls: false,
                        minHeight: 200.0,
                        minWidth: 200.0,
                        skyColor: 0x68b8d7,
                        cloudColor: 0xadc1de,
                        cloudShadowColor: 0x183550,
                        sunColor: 0xff9919,
                        sunGlareColor: 0xff6633,
                        sunlightColor: 0xff9933
                    })
                );
            } catch (error) {
                console.error("Failed to load Vanta effect:", error);
            }
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    return (
        <div ref={vantaRef} className="fixed inset-0 w-full h-full -z-50 pointer-events-none" />
    );
}
