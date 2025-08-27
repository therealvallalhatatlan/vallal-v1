/**
 * Authentication utilities - Demo stubs
 * TODO: Replace with actual authentication provider (NextAuth, Supabase Auth, etc.)
 */

export interface User {
  id: string
  email: string
  name: string
}

export interface Session {
  user: User
  expires: string
}

/**
 * Demo hook that always returns null (no authentication)
 * TODO: Implement actual session management
 */
export function useSession(): { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" } {
  return {
    data: null,
    status: "unauthenticated",
  }
}
