'use client'

import React from 'react'

type ButtonProps = {
  variant?: 'frosted' | 'pop'
  color?: 'blue' | 'red' | 'purple'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  selected?: boolean
  outlineColor?: string // for the Madness button neon
}

export default function Button({
  variant = 'frosted',
  color = 'purple',
  children,
  onClick,
  disabled = false,
  className = '',
  selected = false,
  outlineColor
}: ButtonProps) {
  // Frosted shadow, works for dark mode too
  const baseShadow =
    'shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all'
  const popShadow =
    'shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.3)] transition-all'

  const shadowClass = variant === 'pop' ? popShadow : baseShadow

  // Gradient mapping
  const colorGradients: Record<string, string> = {
    purple: selected
      ? 'from-purple-600 via-purple-800 to-fuchsia-700'
      : 'from-purple-700 via-purple-900 to-blue-900',
    blue: selected ? 'from-blue-500 to-blue-700' : 'from-blue-700 to-blue-900',
    red: selected ? 'from-red-500 to-red-700' : 'from-red-700 to-red-900'
  }

  // Outline style for special buttons
  const outlineStyle = outlineColor
    ? `border-2 border-[${outlineColor}]`
    : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-bold text-white
        bg-gradient-to-br ${colorGradients[color]}
        ${shadowClass}
        ${outlineStyle}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
        focus:outline-none
      `}
    >
      {children}
    </button>
  )
}
