import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'Landing', to: '/' },
  { label: 'New vault', to: '/vault/new' },
  { label: 'Unlock', to: '/vault/unlock' },
  { label: 'Vault', to: '/vault' },
  { label: 'Capture', to: '/capture' },
  { label: 'Export', to: '/export' },
]

const linkBase =
  'rounded-full px-3 py-1 text-xs font-medium transition hover:bg-sand-100 hover:text-sand-900'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f6f1e7_45%,_#e8ddcc_100%)]">
      <header className="border-b border-sand-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.32em] text-sand-600">
              Evidence Vault
            </span>
            <span className="text-lg font-semibold text-sand-900">App shell</span>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sand-700">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    linkBase,
                    isActive ? 'bg-sand-900 text-white hover:bg-sand-800' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
