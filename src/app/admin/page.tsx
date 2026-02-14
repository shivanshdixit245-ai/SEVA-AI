'use client';

import { Users, Calendar, DollarSign, Star, MoreVertical, Check, X } from 'lucide-react';
import { BookingStatus } from '@/types/booking';
import clsx from 'clsx';
import { useState } from 'react';

const MOCK_STATS = [
    { label: 'Total Bookings', value: '1,248', change: '+12%', icon: Calendar },
    { label: 'Active Helpers', value: '48', change: '+5%', icon: Users },
    { label: 'Total Revenue', value: '₹8.4L', change: '+18%', icon: DollarSign },
    { label: 'Avg Rating', value: '4.8', change: '+0.1', icon: Star },
];

const RECENT_BOOKINGS = [
    { id: 'BK-1025', user: 'Amit Kumar', service: 'Plumbing', status: 'Pending', time: '10 mins ago' },
    { id: 'BK-1024', user: 'Priya Singh', service: 'Deep Cleaning', status: 'In Progress', time: '2 hours ago' },
    { id: 'BK-1023', user: 'Rajesh Gupta', service: 'Electrician', status: 'Completed', time: '5 hours ago' },
    { id: 'BK-1022', user: 'Sneha Verma', service: 'AC Service', status: 'Cancelled', time: '1 day ago' },
];

export default function AdminPage() {
    const [bookings, setBookings] = useState(RECENT_BOOKINGS);

    const updateStatus = (id: string, newStatus: BookingStatus) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            'Pending': 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
            'In Progress': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
            'Completed': 'bg-green-400/10 text-green-400 border-green-400/20',
            'Cancelled': 'bg-red-400/10 text-red-400 border-red-400/20',
        };
        return styles[status as keyof typeof styles] || 'bg-gray-400/10 text-gray-400';
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">Dashboard</h1>
                <button className="bg-[var(--color-seva-accent)] hover:bg-[var(--color-seva-accent)]/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Download Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {MOCK_STATS.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="glass-card p-6 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                <span className="text-xs text-green-400">{stat.change} from last month</span>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[var(--color-seva-glow)]">
                                <Icon size={24} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Bookings Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Recent Bookings</h2>
                    <button className="text-sm text-[var(--color-seva-glow)] hover:underline">View All</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Booking ID</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm text-gray-400">{booking.id}</td>
                                    <td className="px-6 py-4 font-medium">{booking.user}</td>
                                    <td className="px-6 py-4">{booking.service}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx("px-2 py-1 rounded-full text-xs border", getStatusBadge(booking.status))}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">{booking.time}</td>
                                    <td className="px-6 py-4 text-right">
                                        {booking.status === 'Pending' && (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => updateStatus(booking.id, 'Confirmed')}
                                                    className="p-1 hover:bg-green-400/20 text-green-400 rounded transition-colors"
                                                    title="Approve"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(booking.id, 'Cancelled')}
                                                    className="p-1 hover:bg-red-400/20 text-red-400 rounded transition-colors"
                                                    title="Reject"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                        {booking.status !== 'Pending' && (
                                            <button className="p-1 hover:bg-white/10 text-gray-400 rounded transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
