'use client'

import React, { useEffect, useState } from 'react'

type ButtonProps = {
  variant?: 'frosted' | 'pop'
  color?: 'blue' | 'red' | 'purple'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  selected?: boolean       // <-- new prop for selection
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
    const darkMatch = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(darkMatch.matches)
    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches)
    darkMatch.addEventListener('change', listener)
    return () => darkMatch.removeEventListener('change', listener)
  }, [])

  // Frosted inner shadow
  const frostedClass =
    isDark
      ? 'shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all'
      : 'shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] transition-all'

  const popClass =
    isDark
      ? 'shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.3)] transition-all'
      : 'shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.3)] transition-all'

  const colorGradients: Record<string, string> = {
    purple: 'from-purple-700 via-purple-900 to-blue-900',
    blue: 'from-blue-700 to-blue-900',
    red: 'from-red-700 to-red-900',
    lime: selected ? 'from-lime-500 to-lime-700' : 'from-lime-800 to-lime-950'
  }

  const shadowClass = variant === 'pop' ? popClass : frostedClass

  // Slightly brighten if selected
  const selectedClass = selected ? 'brightness-110' : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-bold text-white
        bg-gradient-to-br ${colorGradients[color]}
        ${shadowClass}
        hover:brightness-110 active:translate-y-[2px]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${selectedClass}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
