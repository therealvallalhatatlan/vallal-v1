/**
 * Demo admin authentication utilities
 * Client-side helper functions for admin functionality
 */

/**
 * @deprecated Use validateAdminKey server action from lib/actions.ts instead
 * This function is kept for reference but should not be used in production
 */
export function isDemoAdmin(key: string): boolean {
  console.warn("isDemoAdmin is deprecated - use validateAdminKey server action instead")
  return false // Always return false to prevent client-side validation
}

/**
 * Helper function to check if we're in demo mode
 */
export function isDemoMode(): boolean {
  return process.env.NODE_ENV === "development"
}
