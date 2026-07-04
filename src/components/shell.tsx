import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Flame, HelpCircle, History, TrendingUp, Layers } from "lucide-react"
import { useStore } from "@/lib/store"
import { HelpSheet, Onboarding } from "@/components/intro"

const tabs = [
  { to: "/", label: "Today", icon: Flame },
  { to: "/history", label: "History", icon: History },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/programs", label: "Programs", icon: Layers },
]

export function Shell() {
  const location = useLocation()
  const { state } = useStore()
  const [helpOpen, setHelpOpen] = useState(false)
  const inSession = location.pathname === "/session"

  if (!state.onboarded) return <Onboarding />

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-3">
        <span className="font-display text-2xl leading-none">
          REP<span className="text-volt">FORGE</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="h-2 w-16 hazard opacity-70" />
          <button
            type="button"
            className="-m-2 p-2 text-dim active:text-ink"
            onClick={() => setHelpOpen(true)}
            aria-label="how Repforge works"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </span>
      </header>

      <main className="flex-1 px-4 pb-32">
        <Outlet />
      </main>

      {!inSession && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-md justify-around pb-[env(safe-area-inset-bottom)]">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    isActive ? "text-volt" : "text-dim"
                  }`
                }
              >
                <Icon className="h-5 w-5" strokeWidth={2.25} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
