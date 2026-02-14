"use client";

import { useState, useEffect } from "react";
import { MapPin, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function AddressSelector() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [addresses, setAddresses] = useState<string[]>([]);
    const [selected, setSelected] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAddresses();
        } else {
            // Default for guest/logged out
            setAddresses(["Delhi, India"]);
            setSelected("Delhi, India");
        }
    }, [user]);

    const fetchAddresses = async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/user/addresses?userId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    setAddresses(data);
                    setSelected(data[0]);
                } else {
                    setAddresses([]);
                    setSelected("Add an address");
                }
            }
        } catch (error) {
            console.error("Failed to fetch addresses", error);
        }
    };

    const handleAddAddress = async () => {
        if (newAddress.trim() && user) {
            try {
                const res = await fetch('/api/user/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, address: newAddress })
                });

                if (res.ok) {
                    const updatedAddresses = await res.json();
                    setAddresses(updatedAddresses);
                    setSelected(newAddress);
                    setNewAddress("");
                    setIsAdding(false);
                }
            } catch (error) {
                console.error("Failed to add address", error);
            }
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all text-xs text-white font-medium min-w-[200px] shadow-sm"
            >
                <MapPin size={14} className="text-[var(--color-seva-accent)]" />
                <span className="truncate max-w-[150px]">{selected}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl z-50 p-2">
                        <h3 className="text-xs font-semibold text-white/50 px-2 py-1 mb-1">Select Location</h3>

                        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {addresses.map((addr) => (
                                <button
                                    key={addr}
                                    onClick={() => {
                                        setSelected(addr);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-2 py-2 text-xs rounded-lg flex items-center gap-2 transition-colors",
                                        selected === addr ? "bg-white/10 text-white font-medium" : "text-white/60 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <MapPin size={12} />
                                    <span className="truncate">{addr}</span>
                                    {selected === addr && <Check size={12} className="ml-auto" />}
                                </button>
                            ))}
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/10">
                            {isAdding ? (
                                <div className="px-1">
                                    <input
                                        type="text"
                                        value={newAddress}
                                        onChange={(e) => setNewAddress(e.target.value)}
                                        placeholder="Enter new address..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-[var(--color-seva-accent)] placeholder:text-white/20"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddAddress()}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddAddress}
                                            className="flex-1 bg-[var(--color-seva-accent)] hover:bg-[var(--color-seva-accent)]/80 text-white text-xs py-1 rounded-lg"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => setIsAdding(false)}
                                            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-1 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="w-full flex items-center justify-center gap-2 text-xs text-[var(--color-seva-accent)] hover:bg-white/5 py-1.5 rounded-lg transition-colors font-medium"
                                >
                                    <Plus size={12} />
                                    Add New Address
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
