import { useId } from "react"

export function PreoraIcon({
  size = 64,
  dark = true,
}: {
  size?: number
  dark?: boolean
}) {
  const id = useId().replace(/:/g, "")

  const bg0 = dark ? "#141f36" : "#0f172a"

  const bg1 = dark ? "#0a1018" : "#050d1a"

  const counterFill = dark ? "#0a1018" : "#071025"

  const stemFill = dark ? "#f0f6ff" : "#f0f6ff"

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={`${id}-bg`}
          x1="0"
          y1="0"
          x2="512"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={bg0} />
          <stop offset="100%" stopColor={bg1} />
        </linearGradient>
        <radialGradient id={`${id}-rim`} cx="20%" cy="16%" r="58%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="112" fill={`url(#${id}-rim)`} />
      <rect x="148" y="268" width="220" height="144" rx="22" fill="#0d9488" />
      <rect x="148" y="260" width="220" height="18" rx="9" fill="#2dd4bf" />
      <path
        d="M 196 268 A 62 88 0 0 1 324 268"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <path
        d="M 218 268 A 40 62 0 0 1 302 268"
        fill="none"
        stroke={bg1}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <rect x="204" y="108" width="56" height="284" rx="28" fill={stemFill} />
      <path d="M 260 108 A 96 96 0 0 1 260 300 Z" fill="#14b8a6" />
      <path d="M 260 148 A 56 56 0 0 1 260 260 Z" fill={counterFill} />
      <circle cx="288" cy="204" r="11" fill="#5eead4" opacity="0.9" />
      <circle
        cx="316"
        cy="338"
        r="26"
        stroke="#5eead4"
        strokeWidth="4"
        fill="none"
        opacity="0.75"
      />
      <line
        x1="316"
        y1="338"
        x2="309"
        y2="318"
        stroke="#5eead4"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <line
        x1="316"
        y1="338"
        x2="334"
        y2="338"
        stroke="#5eead4"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <circle cx="316" cy="338" r="4" fill="#5eead4" />
    </svg>
  )
}

export default function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="brand-lockup">
      <PreoraIcon size={40} />
      <span className={`brand-wordmark${light ? " brand-wordmark-light" : ""}`}>
        PRE<span>ORA</span>
      </span>
    </span>
  )
}
