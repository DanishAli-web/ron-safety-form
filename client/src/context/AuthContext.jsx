import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { apiFetch } from '../lib/api.js';

const AuthContext = createContext(null);

export function homePathFor(role) {
  return role === 'admin' ? '/admin' : '/submit';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, full_name, role } from our API
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Keep `session` in sync with Supabase (initial load, login, logout, token refresh)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // When a different user logs in, load their name and role from our API
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    setLoading(true);
    apiFetch('/api/me')
      .then((me) => {
        if (!cancelled) setProfile(me);
      })
      .catch((err) => {
        if (cancelled) return;
        setAuthError(err.message);
        supabase.auth.signOut(); // logged in to Supabase but unusable here
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function signIn(email, password) {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Incorrect email or password.');
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ profile, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}