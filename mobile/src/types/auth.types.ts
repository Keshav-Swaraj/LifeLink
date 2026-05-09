// ============================================================
// auth.types.ts
// All shared types for the Authentication & User Classification
// module. Import these types from any other part of the project
// to ensure type safety during integration.
// ============================================================

export type UserRole = 'user' | 'medical_professional';
export type MedicalProfessionalType = 'Doctor' | 'Nurse' | 'Paramedic';

/**
 * The user profile object stored in the `users` table in Supabase.
 * Other team members: this maps 1:1 to the DB schema.
 */
export interface UserProfile {
  id: string;                           // UUID from Supabase Auth
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  is_verified_medical: boolean;         // Set by admin after document review
  // Medical professional fields (null for regular users)
  professional_type?: MedicalProfessionalType;
  experience_years?: number;
  registration_number?: string;
  certificate_url?: string;             // Supabase Storage URL
  onboarding_complete: boolean;         // Flag to know if onboarding is done
  created_at?: string;
}

/**
 * Data passed to the sign-up function for a regular user.
 */
export interface UserSignupData {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

/**
 * Data passed to the sign-up function for a medical professional.
 */
export interface MedicalSignupData extends UserSignupData {
  // These are filled in the onboarding step post-signup
  professional_type?: MedicalProfessionalType;
  experience_years?: number;
  registration_number?: string;
  certificate_url?: string;
}

/**
 * Data passed to the login function (same for both user types).
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * The shape of the AuthContext value.
 * This is the primary integration point for other team members.
 * When you integrate the real Supabase logic, implement these functions
 * in AuthContext.tsx and the rest of the app will work automatically.
 */
export interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUpUser: (data: UserSignupData) => Promise<{ error: string | null }>;
  signUpMedical: (data: MedicalSignupData) => Promise<{ error: string | null }>;
  login: (data: LoginData) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateMedicalProfile: (
    data: Omit<MedicalSignupData, 'email' | 'password' | 'full_name' | 'phone'>
  ) => Promise<{ error: string | null }>;
  uploadCertificate: (
    fileUri: string,
    fileName: string
  ) => Promise<{ url: string | null; error: string | null }>;
}
