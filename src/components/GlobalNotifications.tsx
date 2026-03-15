'use client';

import { useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export default function GlobalNotifications() {
    const { user } = useAuth();
    const isFirstRender = useRef(true);
    
    useEffect(() => {
        isFirstRender.current = false;
    }, []);

    // 1. Worker Alerts: New pending jobs
    useSupabaseRealtime({
        table: 'bookings',
        onData: (payload: any) => {
            if (isFirstRender.current) return;
            const record = payload.new as any;
            if (payload.eventType === 'INSERT' && record.status === 'pending_acceptance') {
                toast.info('New Job Available!', {
                    description: `${record.service_type} requested in ${record.location}.`
                });
            }
        },
        enabled: user?.role === 'worker'
    });

    // 2. Client Alerts: Booking Status Changes
    useSupabaseRealtime({
        table: 'bookings',
        filter: user ? `user_id=eq.${user.id}` : undefined,
        onData: (payload: any) => {
            if (isFirstRender.current) return;
            const record = payload.new as any;
            const oldRecord = payload.old as any;
            
            if (payload.eventType === 'UPDATE' && record.status !== oldRecord?.status) {
                if (record.status === 'Confirmed') {
                    toast.success('Job Accepted!', {
                        description: `${record.worker_name} is coming to help you.`
                    });
                } else if (record.status === 'In Progress') {
                    toast.info('Job In Progress', {
                        description: `${record.worker_name} has started working.`
                    });
                } else if (record.status === 'Completed') {
                    toast.success('Job Completed', {
                        description: `Your ${record.service_type} job is finished.`
                    });
                }
            }
        },
        enabled: user?.role === 'client'
    });

    // 3. Global Chat Notifications via Broadcast
    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel(`user-${user.id}`)
            .on('broadcast', { event: 'global-message' }, ({ payload }: { payload: any }) => {
                if (isFirstRender.current) return;
                const record = payload as any;
                
                // Avoid showing toast if we are already on the chat page.
                if (typeof window !== 'undefined' && window.location.pathname.includes('/messages/')) {
                    return;
                }
                
                toast.message('New Message Received', {
                    description: record.content,
                    action: {
                        label: 'View',
                        onClick: () => {
                            if (user?.role === 'client') {
                                window.location.href = `/messages/${record.senderId}`;
                            } else {
                                window.location.href = `/worker/chats`;
                            }
                        }
                    }
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <Toaster 
            position="top-right" 
            theme="dark" 
            toastOptions={{
                className: 'bg-black/90 border border-white/10 text-white backdrop-blur-xl shadow-2xl rounded-2xl'
            }} 
        />
    );
}
