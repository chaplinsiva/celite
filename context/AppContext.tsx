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
  quantity: number;
};

type AppContextValue = {
  user: User | null;
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
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartItems, setCartItems] = useState<TemplateCartItem[]>([]);

  // Initialize Supabase auth state and subscribe to changes
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s?.user) {
        setUser({ id: s.user.id, email: s.user.email ?? '' });
        // Load cart for this user
        loadCart(s.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' });
        loadCart(session.user.id);
      } else {
        setUser(null);
        setCartCount(0);
        setCartItems([]);
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const loadCart = async (userId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('cart_items')
      .select('slug,name,price,img,quantity')
      .eq('user_id', userId);
    if (error) return;
    const items: TemplateCartItem[] = (data ?? []).map((row: any) => ({
      slug: row.slug,
      name: row.name,
      price: Number(row.price),
      img: row.img,
      quantity: Number(row.quantity),
    }));
    setCartItems(items);
    const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
    setCartCount(totalQty);
  };

  const login = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      if (error) console.error('Supabase login error:', error.message);
      return false;
    }
    setUser({ id: data.user.id, email: data.user.email ?? '' });
    await loadCart(data.user.id);
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

  const addToCart = async (item: TemplateCartItem) => {
    // Update local state optimistically
    setCartItems((prev) => {
      const existing = prev.find((entry) => entry.slug === item.slug);
      if (existing) {
        return prev.map((entry) => entry.slug === item.slug ? { ...entry, quantity: entry.quantity + 1 } : entry);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartCount((prev) => prev + 1);

    // Persist to Supabase if logged in
    if (user) {
      const supabase = getSupabaseBrowserClient();
      // Read current quantity
      const { data } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('slug', item.slug)
        .maybeSingle();
      const nextQty = (data?.quantity ?? 0) + 1;
      await supabase.from('cart_items').upsert({
        user_id: user.id,
        slug: item.slug,
        name: item.name,
        price: item.price,
        img: item.img,
        quantity: nextQty,
      }, { onConflict: 'user_id,slug' });
    }
  };

  const resetCart = async () => {
    setCartCount(0);
    setCartItems([]);
    if (user) {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('cart_items').delete().eq('user_id', user.id);
    }
  };

  const removeFromCart = async (slug: string) => {
    let removedOne = false;
    setCartItems((prev) => {
      const existing = prev.find((entry) => entry.slug === slug);
      if (!existing) return prev;
      removedOne = true;
      const newItems = prev
        .map((entry) => entry.slug === slug ? { ...entry, quantity: entry.quantity - 1 } : entry)
        .filter((entry) => entry.quantity > 0);
      return newItems;
    });
    if (removedOne) setCartCount((prev) => Math.max(prev - 1, 0));

    if (user) {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('slug', slug)
        .maybeSingle();
      const currentQty = Number(data?.quantity ?? 0);
      const nextQty = Math.max(currentQty - 1, 0);
      if (nextQty === 0) {
        await supabase.from('cart_items').delete().eq('user_id', user.id).eq('slug', slug);
      } else {
        await supabase.from('cart_items').upsert({ user_id: user.id, slug, quantity: nextQty }, { onConflict: 'user_id,slug' });
      }
    }
  };

  const value = useMemo(
    () => ({ user, cartCount, cartItems, login, signUp, logout, addToCart, resetCart, removeFromCart }),
    [user, cartCount, cartItems]
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

