"use server"

/**
 * Server action to validate admin key securely
 * The actual key is only accessible on the server side
 */
export async function validateAdminKey(key: string): Promise<boolean> {
  const adminKey = process.env.DEMO_ADMIN_KEY || "letmein"
  return key === adminKey
}
