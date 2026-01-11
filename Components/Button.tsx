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
  madness?: boolean
}

export default function Button({
  variant = 'frosted',
  color = 'purple',
  children,
  onClick,
  disabled = false,
  className = '',
  selected = false,
  madness = false
}: ButtonProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(m.matches)
    const l = (e: MediaQueryListEvent) => setIsDark(e.matches)
    m.addEventListener('change', l)
    return () => m.removeEventListener('change', l)
  }, [])

  /* ---------------- SHADOW SYSTEM (DECENT / FINAL) ---------------- */

  const shadowClass =
    variant === 'pop'
      ? isDark
        ? 'shadow-[0_6px_14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.55)]'
        : 'shadow-[0_5px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)]'
      : isDark
        ? 'shadow-[0_4px_10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)]'
        : 'shadow-[0_3px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'

  /* Selected state (clean glow, no borders) */
  const selectedGlow = selected
    ? 'shadow-[0_0_14px_rgba(217,70,239,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]'
    : ''

  /* Madness button (glow only, no depth shadow) */
  const madnessGlow = madness
    ? 'ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.9),0_0_32px_rgba(251,191,36,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]'
    : ''

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
        ${madness ? madnessGlow : shadowClass}
        ${selectedGlow}
        transition-[box-shadow,filter]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
}
