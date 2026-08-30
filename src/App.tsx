import { useEffect } from "react"
import { createHashRouter, RouterProvider } from "react-router-dom"
import { primeAudio, resumeAudioIfNeeded } from "@/lib/audio"
import { StoreProvider } from "@/lib/store"
import { Shell } from "@/components/shell"
import HomePage from "@/pages/home"
import SessionPage from "@/pages/session"
import HistoryPage from "@/pages/history"
import ProgressPage from "@/pages/progress"
import ProgramsPage from "@/pages/programs"
import ProgramEditPage from "@/pages/program-edit"

const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "session", element: <SessionPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "progress", element: <ProgressPage /> },
      { path: "programs", element: <ProgramsPage /> },
      { path: "programs/:programId", element: <ProgramEditPage /> },
    ],
  },
])

export default function App() {
  useEffect(() => {
    // belt and braces: the very first tap anywhere wakes audio, so the rest
    // timer can still chime even if the session started from a restored state
    window.addEventListener("pointerdown", primeAudio, { once: true })
    // iOS suspends the context while the app is backgrounded
    document.addEventListener("visibilitychange", resumeAudioIfNeeded)
    return () => {
      window.removeEventListener("pointerdown", primeAudio)
      document.removeEventListener("visibilitychange", resumeAudioIfNeeded)
    }
  }, [])

  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  )
}
