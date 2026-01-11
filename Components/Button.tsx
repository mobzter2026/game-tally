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

  /* ---------------- SHADOW SYSTEM (AUTHORITATIVE) ---------------- */

  const shadowClass =
  variant === 'pop'
    ? isDark
      ? 'shadow-[0_6px_14px_rgba(0,0,0,0.55),inset_0_3px_8px_rgba(255,255,255,0.45)]'
      : 'shadow-[0_5px_12px_rgba(0,0,0,0.4),inset_0_3px_7px_rgba(255,255,255,0.3)]'
    : isDark
      ? 'shadow-[0_4px_10px_rgba(0,0,0,0.45),inset_0_2px_6px_rgba(255,255,255,0.4)]'
      : 'shadow-[0_3px_8px_rgba(0,0,0,0.35),inset_0_2px_5px_rgba(255,255,255,0.25)]'

  const selectedGlow = selected
    ? 'shadow-[0_0_16px_rgba(217,70,239,0.45),inset_0_2px_6px_rgba(255,255,255,0.35)]'
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
        ${shadowClass}
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
