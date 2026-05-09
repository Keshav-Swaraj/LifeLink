// ============================================================
// AuthContext.js — Unified Auth State (Member 4 integration)
//
// Supports both regular users (SOS victims) and medical professionals
// (responders). Auth functions available via useAuth():
//   - user, profile, loading, isAuthenticated
//   - signUpUser, signUpMedical, login, logout
//   - updateMedicalProfile, uploadCertificate
//   - refreshProfile, signOut (legacy alias for logout)
// ============================================================

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // Supabase auth user
  const [profile, setProfile] = useState(null); // DB profile from 'users' table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('[AuthContext] Profile fetch error:', error.message);
      }
      setProfile(data || null);
      // Persist to AsyncStorage for quick restore
      if (data) await AsyncStorage.setItem('@lifelink_user', JSON.stringify(data));
    } catch (err) {
      console.error('[AuthContext] Unexpected profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Sign up a regular user (victim / bystander) ───────────────
  const signUpUser = useCallback(async (data) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Sign up failed');

      const profileData = {
        id: authData.user.id,
        email: data.email,
        phone: data.phone,
        full_name: data.full_name,
        role: 'user',
        is_verified_medical: false,
        onboarding_complete: true,
      };

      const { error: dbError } = await supabase.from('users').insert(profileData);
      if (dbError) throw dbError;

      setProfile(profileData);
      await AsyncStorage.setItem('@lifelink_user', JSON.stringify(profileData));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Sign up a medical professional (responder) ────────────────
  const signUpMedical = useCallback(async (data) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Sign up failed');

      const profileData = {
        id: authData.user.id,
        email: data.email,
        phone: data.phone,
        full_name: data.full_name,
        role: 'medical_professional',
        is_verified_medical: false,
        onboarding_complete: false,
      };

      const { error: dbError } = await supabase.from('users').insert(profileData);
      if (dbError) throw dbError;

      setProfile(profileData);
      await AsyncStorage.setItem('@lifelink_user', JSON.stringify(profileData));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Login (both user types) ───────────────────────────────────
  const login = useCallback(async (data) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (authError) throw authError;

      const { data: profileData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user?.id)
        .single();
      if (dbError) throw dbError;

      setProfile(profileData);
      await AsyncStorage.setItem('@lifelink_user', JSON.stringify(profileData));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    setLoading(true);
    await AsyncStorage.removeItem('@lifelink_user');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  // ── Update medical professional details (onboarding step 2/3) ─
  const updateMedicalProfile = useCallback(async (data) => {
    if (!user) return { error: 'Not authenticated' };
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ ...data, onboarding_complete: true })
        .eq('id', user.id);
      if (error) throw error;

      const updated = { ...profile, ...data, onboarding_complete: true };
      setProfile(updated);
      await AsyncStorage.setItem('@lifelink_user', JSON.stringify(updated));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // ── Upload certificate to Supabase Storage ────────────────────
  const uploadCertificate = useCallback(async (fileUri, fileName) => {
    if (!user) return { url: null, error: 'Not authenticated' };
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('users')
        .update({ certificate_url: publicUrl })
        .eq('id', user.id);
      if (dbError) throw dbError;

      const updated = { ...profile, certificate_url: publicUrl };
      setProfile(updated);
      await AsyncStorage.setItem('@lifelink_user', JSON.stringify(updated));
      return { url: publicUrl, error: null };
    } catch (err) {
      return { url: null, error: err.message };
    }
  }, [user, profile]);

  return (
    <AuthContext.Provider
      value={{
        // Core state
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        // Auth actions
        signUpUser,
        signUpMedical,
        login,
        logout,
        // Profile actions
        updateMedicalProfile,
        uploadCertificate,
        refreshProfile: () => fetchProfile(user?.id),
        // Legacy alias used by old screens
        signOut: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
