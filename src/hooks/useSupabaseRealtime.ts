'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
    table: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onData: (payload: any) => void;
    enabled?: boolean;
}

/**
 * A reusable hook for Supabase Realtime subscriptions.
 * Auto-subscribes, auto-unsubscribes on unmount, and auto-reconnects.
 */
export function useSupabaseRealtime({ table, event = '*', filter, onData, enabled = true }: UseRealtimeOptions) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const onDataRef = useRef(onData);
    onDataRef.current = onData;

    useEffect(() => {
        if (!enabled) return;

        const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`;
        const config: any = {
            event,
            schema: 'public',
            table,
        };
        if (filter) config.filter = filter;

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', config, (payload: any) => {
                onDataRef.current(payload);
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Realtime subscribed: ${table}`);
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [table, event, filter, enabled]);
}

/**
 * Hook to fetch data with fast initial load + realtime updates.
 * Combines an initial fetch with Supabase Realtime for instant updates.
 */
export function useRealtimeData<T>(
    fetchFn: () => Promise<T[]>,
    realtimeConfig: { table: string; filter?: string },
    enabled: boolean = true
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const refresh = useCallback(async () => {
        try {
            const result = await fetchFn();
            if (mountedRef.current) {
                setData(result);
                setError(null);
            }
        } catch (err: any) {
            if (mountedRef.current) {
                setError(err.message || 'Failed to fetch');
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [fetchFn]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;
        if (enabled) refresh();
        return () => { mountedRef.current = false; };
    }, [refresh, enabled]);

    // Realtime subscription — apply granular updates to local state for instant feel
    useSupabaseRealtime({
        table: realtimeConfig.table,
        filter: realtimeConfig.filter,
        onData: (payload) => {
            console.log(`Realtime event [${payload.eventType}] on ${realtimeConfig.table}`);
            
            if (payload.eventType === 'INSERT') {
                const newItem = payload.new as T;
                setData(prev => [newItem, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                const updatedItem = payload.new as any;
                setData(prev => prev.map(item => (item as any).id === updatedItem.id ? { ...item, ...updatedItem } : item));
            } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as any).id;
                setData(prev => prev.filter(item => (item as any).id !== deletedId));
            }
        },
        enabled
    });

    return { data, loading, error, refresh, setData };
}
