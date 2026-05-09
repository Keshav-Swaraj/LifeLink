// ============================================================
// AuthContext.d.ts — Type declarations for AuthContext.js
//
// This file provides TypeScript types for the AuthContext so
// that .tsx screens can safely destructure from useAuth()
// without "Property X does not exist on type '{}'" errors.
// ============================================================

import React from 'react';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
  role: 'user' | 'medical_professional';
  is_verified_medical: boolean;
  onboarding_complete: boolean;
  certificate_url?: string;
  [key: string]: unknown;
}

export interface SignUpUserPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  error: string | null;
}

export interface CertUploadResult {
  url: string | null;
  error: string | null;
}

export interface AuthContextValue {
  // Core state
  /** Supabase auth user merged with DB profile fields */
  user: (import('@supabase/supabase-js').User & Partial<UserProfile>) | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Alias for `loading` — used by existing screens */
  isLoading: boolean;
  isAuthenticated: boolean;

  // Auth actions
  signUpUser: (data: SignUpUserPayload) => Promise<AuthResult>;
  signUpMedical: (data: SignUpUserPayload) => Promise<AuthResult>;
  login: (data: LoginPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;

  // Profile actions
  updateMedicalProfile: (data: Partial<UserProfile>) => Promise<AuthResult>;
  uploadCertificate: (fileUri: string, fileName: string) => Promise<CertUploadResult>;
  refreshProfile: () => void;

  // Legacy alias
  signOut: () => Promise<void>;
}

export declare const AuthProvider: React.FC<{ children: React.ReactNode }>;
export declare function useAuth(): AuthContextValue;
