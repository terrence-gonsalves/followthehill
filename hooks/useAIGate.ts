"use client"
import { useSubscription } from "./useSubscription"

/**
 * Returns whether the current user can access AI features.
 * Used to show UpgradePrompt vs AISummaryCard.
 */
export function useAIGate() {
  const { isActive, loading } = useSubscription()
  return { canUseAI: isActive, loading }
}
