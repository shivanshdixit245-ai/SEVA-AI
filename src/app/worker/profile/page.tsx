'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Briefcase, Phone, Mail, Calendar, Info, CheckCircle2, ChevronRight, MapPin, Shield } from 'lucide-react';

const professions = [
    "Deep Cleaning",
    "Plumbing",
    "Electrician",
    "Painting",
    "Carpentry",
    "Appliance Repair",
    "Pest Control",
    "AC Service",
    "Other"
];

export default function WorkerProfilePage() {
    const { user, updateUser, getAuthHeaders } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        age: '',
        gender: 'Male',
        profession: 'Electrician',
        otherProfession: '',
        experience: '',
        phone: '',
        bio: '',
        address: '',
        docType: 'Aadhaar Card',
        docNumber: ''
    });

    useEffect(() => {
        setMounted(true);
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || prev.name,
                email: user.email || prev.email
            }));
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const res = await fetch('/api/v1/worker/profile', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...formData,
                    userId: user?.id
                })
            });

            if (res.ok) {
                // Update local auth state immediately
                updateUser({ hasProfile: true });
                setSuccess(true);
                setTimeout(() => router.push('/worker/dashboard'), 2000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Update failed:', err);
            alert('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-white/20">
                <div className="w-12 h-12 border-4 border-[var(--color-seva-accent)] border-t-transparent rounded-full animate-spin mb-4" />
                <p>Loading profile editor...</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <CheckCircle2 size={40} />
                </div>
                <h1 className="text-3xl font-bold text-gradient">Profile Created Successfully!</h1>
                <p className="text-white/60">Redirecting you to your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">Create Your <span className="text-gradient">Professional Identity</span></h1>
                <p className="text-white/60">Tell us about your skills and experience to start getting jobs.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="glass-panel p-8 rounded-3xl space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <User className="text-[var(--color-seva-accent)]" size={20} />
                        Personal Information
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Full Name</label>
                            <input 
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full glass-input"
                                placeholder="Enter your full name"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Age</label>
                                <input 
                                    type="number"
                                    value={formData.age}
                                    onChange={e => setFormData({...formData, age: e.target.value})}
                                    className="w-full glass-input"
                                    placeholder="25"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Gender</label>
                                <select 
                                    value={formData.gender}
                                    onChange={e => setFormData({...formData, gender: e.target.value})}
                                    className="w-full glass-input"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input 
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full glass-input pl-12"
                                    placeholder="+91 XXXXX XXXXX"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Home Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input 
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    className="w-full glass-input pl-12"
                                    placeholder="Area, City"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Professional Info */}
                <div className="glass-panel p-8 rounded-3xl space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Briefcase className="text-[var(--color-seva-glow)]" size={20} />
                        Professional Details
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Primary Profession</label>
                            <select 
                                value={formData.profession}
                                onChange={e => setFormData({...formData, profession: e.target.value})}
                                className="w-full glass-input"
                                required
                            >
                                {professions.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {formData.profession === 'Other' && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Specify Profession</label>
                                <input 
                                    type="text"
                                    value={formData.otherProfession}
                                    onChange={e => setFormData({...formData, otherProfession: e.target.value})}
                                    className="w-full glass-input"
                                    placeholder="e.g. Interior Designer"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Years of Experience</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input 
                                    type="number"
                                    value={formData.experience}
                                    onChange={e => setFormData({...formData, experience: e.target.value})}
                                    className="w-full glass-input pl-12"
                                    placeholder="5"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">About Your Expertise</label>
                            <textarea 
                                value={formData.bio}
                                onChange={e => setFormData({...formData, bio: e.target.value})}
                                className="w-full glass-input min-h-[100px] resize-none py-3"
                                placeholder="Tell clients why they should hire you..."
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Identity Verification */}
                <div className="glass-panel p-8 rounded-3xl space-y-6 md:col-span-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="text-green-400" size={20} />
                        Identity Verification
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Document Type</label>
                            <div className="flex gap-4">
                                {['Aadhaar Card', 'PAN Card'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setFormData({...formData, docType: type, docNumber: ''})}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${
                                            formData.docType === type 
                                            ? 'border-[var(--color-seva-accent)] bg-[var(--color-seva-accent)]/10 text-white' 
                                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">
                                {formData.docType} Number
                            </label>
                            <div className="relative">
                                <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input 
                                    type="text"
                                    value={formData.docNumber}
                                    onChange={e => setFormData({...formData, docNumber: e.target.value.toUpperCase()})}
                                    className="w-full glass-input pl-12"
                                    placeholder={formData.docType === 'PAN Card' ? 'ABCDE1234F' : '1234 5678 9012'}
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-white/30 mt-2 italic flex items-center gap-1">
                                <Shield size={10} /> Your data is encrypted and used only for background verification.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-3 bg-gradient-to-r from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    >
                        {isLoading ? 'Saving...' : 'Complete My Profile'}
                        <ChevronRight size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
}
