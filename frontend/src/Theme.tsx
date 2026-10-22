import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
type Theme = "light" | "dark"
const KEY = "preora-theme"
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(
  null,
)
function preference(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === "dark" || value === "light" ? value : null
  } catch {
    return null
  }
}
function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => preference() || systemTheme())
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle("dark", theme === "dark")
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0b1220" : "#f8fafc")
  }, [theme])
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onSystem = () => {
      if (!preference()) setTheme(systemTheme())
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null)
        setTheme(preference() || systemTheme())
    }
    media.addEventListener("change", onSystem)
    window.addEventListener("storage", onStorage)
    return () => {
      media.removeEventListener("change", onSystem)
      window.removeEventListener("storage", onStorage)
    }
  }, [])
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch { /* Continue in memory when storage is blocked. */ }
    setTheme(next);
  };
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
export function ThemeToggle() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("ThemeToggle requires ThemeProvider")
  const dark = context.theme === "dark"
  return (
    <button
      type="button"
      role="switch"
      aria-label="Chế độ tối"
      aria-checked={dark}
      title={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      onClick={context.toggle}
      className="theme-toggle"
    >
      <svg
        aria-hidden="true"
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </>
        ) : (
          <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
        )}
      </svg>
    </button>
  )
}
