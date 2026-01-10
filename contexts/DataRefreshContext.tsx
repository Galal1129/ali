import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DataRefreshContextType {
  triggerRefresh: (type?: 'movements' | 'customers' | 'all') => void;
  lastRefreshTime: number;
  isRefreshing: boolean;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const triggerRefresh = useCallback((type: 'movements' | 'customers' | 'all' = 'all') => {
    setIsRefreshing(true);
    setLastRefreshTime(Date.now());

    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, []);

  useEffect(() => {
    const realtimeChannel = supabase
      .channel('data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_movements',
        },
        (payload) => {
          triggerRefresh('movements');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          triggerRefresh('customers');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          triggerRefresh('all');
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [triggerRefresh]);

  return (
    <DataRefreshContext.Provider
      value={{
        triggerRefresh,
        lastRefreshTime,
        isRefreshing,
      }}
    >
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext);
  if (context === undefined) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider');
  }
  return context;
}
