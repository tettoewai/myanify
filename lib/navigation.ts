"use client"

import { useRouter } from "next/navigation"

export function useNavigation() {
  const router = useRouter()

  const navigate = (view: string, id?: string) => {
    if (view === "home") {
      router.push("/home")
    } else if (view === "search") {
      router.push("/search")
    } else if (view === "library") {
      router.push("/library")
    } else if (view === "premium") {
      router.push("/premium")
    } else if (view === "genre" && id) {
      router.push(`/genre/${id}`)
    } else if (view === "artist" && id) {
      router.push(`/artist/${id}`)
    } else if (view === "playlist" && id) {
      router.push(`/playlist/${id}`)
    } else if (view === "album" && id) {
      router.push(`/album/${id}`)
    }
  }

  return { navigate }
}
