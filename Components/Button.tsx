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

  const innerShadow = isDark
    ? 'inset_0_2px_6px_rgba(255,255,255,0.35)'
    : 'inset_0_2px_6px_rgba(255,255,255,0.2)'

  const baseShadow = '0_6px_12px_rgba(0,0,0,0.45)'

  const shadowClass =
    variant === 'pop'
      ? `shadow-[${baseShadow},inset_0_2px_8px_rgba(255,255,255,0.35)]`
      : `shadow-[${baseShadow},${innerShadow}]`

  const gradients: Record<string, string> = {
    purple: selected
      ? 'from-fuchsia-600 via-purple-700 to-indigo-800'
      : 'from-purple-800 via-purple-900 to-indigo-950',
    blue: 'from-blue-700 to-blue-900',
    red: 'from-red-700 to-red-900'
  }

  const selectedGlow = selected
    ? 'ring-2 ring-fuchsia-400/60 shadow-[0_0_14px_rgba(217,70,239,0.55)]'
    : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-bold text-white
        bg-gradient-to-br ${gradients[color]}
        border border-white/5
        ${shadowClass}
        ${selectedGlow}
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
}
