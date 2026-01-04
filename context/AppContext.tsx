'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Template } from '../data/templateData';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

type User = {
  id: string;
  email: string;
};

export type TemplateCartItem = Pick<Template, 'slug' | 'name' | 'price'> & {
  img: string;
};

type AppContextValue = {
  user: User | null;
  isAuthLoading: boolean;  // NEW: Track if auth state is still loading
  cartCount: number;
  cartItems: TemplateCartItem[];
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addToCart: (item: TemplateCartItem) => void;
  resetCart: () => void;
  removeFromCart: (slug: string) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);  // NEW: Start as loading
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartItems, setCartItems] = useState<TemplateCartItem[]>([]);

  // Initialize Supabase auth state and subscribe to changes
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s?.user) {
        setUser({ id: s.user.id, email: s.user.email ?? '' });
      }
      setIsAuthLoading(false);  // Done loading
    }).catch(() => {
      setIsAuthLoading(false);  // Done loading even on error
    });

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' });
      } else {
        setUser(null);
        setCartCount(0);
        setCartItems([]);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      if (error) console.error('Supabase login error:', error.message);
      return false;
    }
    setUser({ id: data.user.id, email: data.user.email ?? '' });
    return true;
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName || null,
          last_name: lastName || null,
        },
      },
    });
    if (error) {
      console.error('Supabase signup error:', error.message);
      return false;
    }
    // If email confirmation is required, data.user may be null. Consider it a success and prompt user to verify.
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email ?? '' });
    }
    return true;
  };

  const logout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setCartCount(0);
    setCartItems([]);
  };

  // Sync cart from server
  const loadCartFromServer = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCartItems([]);
        setCartCount(0);
        return;
      }
      const res = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        const items = (json.items || []).map((i: any) => ({
          slug: i.slug,
          name: i.name,
          price: Number(i.price) || 0,
          img: i.img || '',
        })) as TemplateCartItem[];
        setCartItems(items);
        setCartCount(items.length);
      } else {
        setCartItems([]);
        setCartCount(0);
      }
    } catch {
      setCartItems([]);
      setCartCount(0);
    }
  };

  useEffect(() => {
    // Load cart when user logs in
    if (user) {
      loadCartFromServer();
    }
  }, [user]);

  const addToCart = async (item: TemplateCartItem) => {
    // Check if item already exists in cart
    const existing = cartItems.find((entry) => entry.slug === item.slug);
    if (existing) {
      // Item already in cart, don't add again
      return;
    }

    // Persist to server if logged in
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ...item, qty: 1 }),
        });
      }
    } catch (e) {
      console.error('Failed to persist cart item', e);
    }

    // Update local state
    setCartItems((prev) => [...prev, item]);
    setCartCount((prev) => prev + 1);
  };

  const resetCart = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Clear all cart entries for user by fetching and deleting
        const res = await fetch('/api/cart', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const json = await res.json();
        if (res.ok && json.ok) {
          const items = json.items || [];
          await Promise.all(items.map((i: any) => fetch('/api/cart', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ slug: i.slug }),
          })));
        }
      }
    } catch (e) {
      console.error('Failed to reset cart on server', e);
    } finally {
      setCartCount(0);
      setCartItems([]);
    }
  };

  const removeFromCart = async (slug: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ slug }),
        });
      }
    } catch (e) {
      console.error('Failed to remove cart item on server', e);
    } finally {
      setCartItems((prev) => prev.filter((entry) => entry.slug !== slug));
      setCartCount((prev) => Math.max(prev - 1, 0));
    }
  };

  const value = useMemo(
    () => ({ user, isAuthLoading, cartCount, cartItems, login, signUp, logout, addToCart, resetCart, removeFromCart }),
    [user, isAuthLoading, cartCount, cartItems]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
