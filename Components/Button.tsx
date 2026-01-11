'use client'

import React, { useEffect, useState } from 'react'

type ButtonProps = {
  variant?: 'frosted' | 'pop'
  color?: 'blue' | 'red' | 'purple'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  selected?: boolean
}

export default function Button({
  variant = 'frosted',
  color = 'purple',
  children,
  onClick,
  disabled = false,
  className = '',
  selected = false
}: ButtonProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(m.matches)
    const l = (e: MediaQueryListEvent) => setIsDark(e.matches)
    m.addEventListener('change', l)
    return () => m.removeEventListener('change', l)
  }, [])

  /* ---------------- SHADOW SYSTEM ---------------- */

  const outerShadow =
    variant === 'pop'
      ? '0_14px_30px_rgba(0,0,0,0.75)'
      : '0_8px_18px_rgba(0,0,0,0.55)'

  const innerHighlight = isDark
    ? 'inset_0_3px_8px_rgba(255,255,255,0.45)'
    : 'inset_0_2px_6px_rgba(255,255,255,0.25)'

  const innerDepth =
    variant === 'pop'
      ? 'inset_0_-2px_6px_rgba(0,0,0,0.4)'
      : ''

  const selectedGlow = selected
  ? `
    shadow-[0_10px_22px_rgba(0,0,0,0.6),
            inset_0_1px_0_rgba(255,255,255,0.4),
            inset_0_3px_8px_rgba(255,255,255,0.35),
            0_0_14px_rgba(217,70,239,0.4)]
  `
  : ''

  const shadowClass =
  variant === 'pop'
    ? `
      shadow-[0_10px_22px_rgba(0,0,0,0.65),
              inset_0_1px_0_rgba(255,255,255,0.35),
              inset_0_3px_10px_rgba(255,255,255,0.35)]
    `
    : `
      shadow-[0_8px_18px_rgba(0,0,0,0.55),
              inset_0_1px_0_rgba(255,255,255,0.28),
              inset_0_3px_8px_rgba(255,255,255,0.25)]
    `

  const madnessGlow = `
  ring-2 ring-amber-400
  shadow-[0_0_18px_rgba(251,191,36,0.85),
          0_0_32px_rgba(251,191,36,0.55),
          inset_0_1px_0_rgba(255,255,255,0.25)]
`
  /* ---------------- COLOURS ---------------- */

  const gradients: Record<string, string> = {
    purple: selected
      ? 'from-fuchsia-600 via-purple-700 to-indigo-800'
      : 'from-purple-800 via-purple-900 to-indigo-950',
    blue: 'from-blue-700 to-blue-900',
    red: 'from-red-700 to-red-900'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-bold text-white
        bg-gradient-to-br ${gradients[color]}
        ${shadowClass}
        transition-[filter,box-shadow]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
}
