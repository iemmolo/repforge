import { createHashRouter, RouterProvider } from "react-router-dom"
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
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  )
}
