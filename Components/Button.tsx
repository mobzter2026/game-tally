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
  const shadowClass =
    variant === 'pop'
      ? 'shadow-[0_6px_14px_rgba(0,0,0,0.55),inset_0_3px_8px_rgba(255,255,255,0.45)]'
      : 'shadow-[0_4px_10px_rgba(0,0,0,0.45),inset_0_2px_6px_rgba(255,255,255,0.35)]'

  const selectedGlow = selected
    ? 'shadow-[0_0_14px_rgba(217,70,239,0.4)]'
    : ''

  const gradients: Record<string, string> = {
    purple: selected
      ? 'from-fuchsia-600 via-purple-700 to-indigo-800'
      : 'from-purple-800 via-purple-900 to-indigo-950',
    blue: 'from-blue-700 to-blue-900',
    red: 'from-red-700 to-red-900'
  }

  // Check if className contains a custom gradient (bg-gradient-)
  const hasCustomGradient = className.includes('bg-gradient-')
  const backgroundClass = hasCustomGradient ? '' : `bg-gradient-to-br ${gradients[color]}`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-bold text-white
        ${backgroundClass}
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
