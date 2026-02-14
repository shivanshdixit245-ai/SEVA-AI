'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Shield, Clock } from 'lucide-react';

const services = [
  { name: 'Deep Cleaning', icon: '🧹', color: 'bg-blue-500/20 text-blue-400' },
  { name: 'Plumbing', icon: '🚰', color: 'bg-cyan-500/20 text-cyan-400' },
  { name: 'Electrician', icon: '⚡', color: 'bg-yellow-500/20 text-yellow-400' },
  { name: 'Painting', icon: '🎨', color: 'bg-pink-500/20 text-pink-400' },
  { name: 'Carpentry', icon: '🪑', color: 'bg-orange-500/20 text-orange-400' },
  { name: 'Pest Control', icon: '🕷️', color: 'bg-red-500/20 text-red-400' },
];

const stats = [
  { label: 'Happy Customers', value: '10k+' },
  { label: 'Verified Experts', value: '500+' },
  { label: 'Service Rating', value: '4.9★' },
];

export default function Home() {
  return (
    <div className="space-y-16 animate-[fadeIn_0.5s_ease-out]">
      {/* Hero Section */}
      <section className="relative text-center space-y-6 pt-10 pb-6">

        <h1 className="text-5xl md:text-7xl font-bold font-[family-name:var(--font-display)] tracking-tight leading-tight">
          Home Services <br />
          <span className="text-gradient">Just a Chat Away</span>
        </h1>

        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          No more navigating complex menus. Just tell our AI what you need in English, Hindi, or Hinglish.
        </p>

        <div className="flex justify-center pt-6">
          <Link
            href="/chat"
            className="flex items-center gap-3 bg-gradient-to-r from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all transform hover:scale-105"
          >
            Start Booking Now
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mt-12 pt-8 border-t border-white/5">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-white/60 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Popular Services</h2>
          <Link href="/services" className="text-[var(--color-seva-glow)] hover:underline text-sm">View All</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {services.map((service, index) => (
            <Link
              href="/chat"
              key={service.name}
              className="glass-card p-6 rounded-2xl flex flex-col items-center gap-4 hover:bg-white/5 transition-all group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${service.color} group-hover:scale-110 transition-transform`}>
                {service.icon}
              </div>
              <span className="font-medium text-sm text-center">{service.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Zap size={20} />
          </div>
          <h3 className="font-bold text-lg">Instant Response</h3>
          <p className="text-sm text-white/60">Our AI processes your request in seconds and assigns the nearest available helper.</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
            <Shield size={20} />
          </div>
          <h3 className="font-bold text-lg">Verified Professionals</h3>
          <p className="text-sm text-white/60">Every helper goes through a strict background check and skills assessment.</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <h3 className="font-bold text-lg">Real-time Tracking</h3>
          <p className="text-sm text-white/60">Track your booking status and helper location in real-time on the app.</p>
        </div>
      </section>
    </div>
  );
}
