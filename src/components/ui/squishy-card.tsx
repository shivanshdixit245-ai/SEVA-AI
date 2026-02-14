'use client';

import React from "react";
import { ServiceCategory } from "@/types/booking";
import {
    User,
    Mail,
    CreditCard,
    Users,
    Zap,
    Droplet,
    Hammer,
    Paintbrush,
    Wrench,
    Bug,
    Snowflake,
    Sparkles,
    ArrowRight,
    Star
} from "lucide-react";
import Link from 'next/link';

interface SquishyCardProps {
    service: ServiceCategory;
}

// Map service names to Lucide icons
const getIcon = (name: string) => {
    switch (name) {
        case 'Deep Cleaning': return Sparkles;
        case 'Plumbing': return Droplet;
        case 'Electrician': return Zap;
        case 'Painting': return Paintbrush;
        case 'Carpentry': return Hammer;
        case 'Appliance Repair': return Wrench;
        case 'Pest Control': return Bug;
        case 'AC Service': return Snowflake;
        default: return Sparkles;
    }
};

const SquishyCard = ({ service }: SquishyCardProps) => {
    const Icon = getIcon(service.name);

    return (
        <Link
            href={`/bookings?service=${encodeURIComponent(service.name)}`}
            className="w-full p-4 rounded-2xl border border-white/10 relative overflow-hidden group bg-white/5 h-80 flex flex-col justify-between hover:border-white/20 transition-colors"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />

            <Icon className="absolute z-10 -top-12 -right-12 text-9xl text-white/5 group-hover:text-white/20 group-hover:rotate-12 transition-transform duration-300" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <Icon className="mb-2 text-3xl text-[var(--color-seva-accent)] group-hover:text-white transition-colors duration-300" />
                    <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-yellow-400 backdrop-blur-md border border-white/5 group-hover:bg-white/20 group-hover:border-white/10 transition-colors">
                        <Star size={12} fill="currentColor" />
                        4.8
                    </span>
                </div>

                <h3 className="font-bold text-xl text-white group-hover:text-white transition-colors duration-300 mb-2">
                    {service.name}
                </h3>
                <p className="text-white/60 text-sm group-hover:text-white/90 transition-colors duration-300 line-clamp-3">
                    {service.description}
                </p>
            </div>

            <div className="relative z-10 mt-auto pt-4 border-t border-white/10 group-hover:border-white/20 transition-colors">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-xs text-white/40 group-hover:text-white/70 transition-colors">Starts at</p>
                        <p className="font-bold text-xl text-[var(--color-seva-glow)] group-hover:text-white transition-colors">₹{service.basePrice}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[var(--color-seva-accent)] transition-colors">
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default SquishyCard;
