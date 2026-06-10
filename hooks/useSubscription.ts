"use client"
import { useUser } from "./useUser"
import type { SubscriptionStatus } from "@/types"

export function useSubscription() {
  const { appUser, loading } = useUser()

  const status: SubscriptionStatus = appUser?.subscription_status ?? "free"
  const isActive  = status === "active"
  const isPastDue = status === "past_due"
  const isFree    = status === "free" || status === "canceled"

  return { status, isActive, isPastDue, isFree, loading }
}
