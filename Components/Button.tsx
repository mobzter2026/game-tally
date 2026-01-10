'use client'

import React from 'react'

// Props for the button
type ButtonProps = {
  variant?: 'frosted' | 'pop'       // Choose style
  color?: 'blue' | 'red' | 'purple' // Optional gradient color
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string                // Extra classes if needed
}

export default function Button({
  variant = 'frosted',
  color = 'purple',
  children,
  onClick,
  disabled = false,
  className = ''
}: ButtonProps) {
  // Base frosted shadow class
  const frostedClass =
    "shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] transition-all"

  // Enhanced pop shadow for deal/clear style
  const popClass =
    "shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.3)] transition-all"

  // Gradient mapping
  const colorGradients: Record<string, string> = {
    purple: 'from-purple-700 via-purple-900 to-blue-900',
    blue: 'from-blue-700 to-blue-900',
    red: 'from-red-700 to-red-900'
  }

  // Select shadow based on variant
  const shadowClass = variant === 'pop' ? popClass : frostedClass

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
        ${className}
      `}
    >
      {children}
    </button>
  )
}
