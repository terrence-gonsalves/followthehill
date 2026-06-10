"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { AppUser } from "@/types"

export function useUser() {
  const [authUser, setAuthUser]   = useState<User | null>(null)
  const [appUser, setAppUser]     = useState<AppUser | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user)
      if (user) {
        supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            setAppUser(data)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setAuthUser(session?.user ?? null)
        if (!session?.user) {
          setAppUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { authUser, appUser, loading }
}
