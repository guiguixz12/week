'use client'

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:       string
  error?:       string
  hint?:        string
  leftIcon?:    ReactNode
  rightAction?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightAction, type, className, ...props }, ref) => {
    const [showPwd, setShowPwd] = useState(false)
    const isPassword = type === 'password'
    const inputType  = isPassword ? (showPwd ? 'text' : 'password') : type

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-[#E6EDF3]">
            {label}
          </label>
        )}

        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full rounded-xl border bg-surface-subtle py-2.5 text-sm text-[#E6EDF3]',
              'placeholder:text-[#8B949E]',
              'transition-all duration-150',
              'focus:bg-surface focus:outline-none focus:ring-2',
              error
                ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-400/20'
                : 'border-surface-border focus:border-brand focus:ring-brand/20',
              leftIcon  ? 'pl-10' : 'pl-4',
              (rightAction || isPassword) ? 'pr-10' : 'pr-4',
              className,
            )}
            {...props}
          />

          {/* Right action or password toggle */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E]">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="hover:text-[#8B949E] transition-colors"
                tabIndex={-1}
                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye    className="h-4 w-4" />
                }
              </button>
            ) : rightAction}
          </span>
        </div>

        {/* Error or hint */}
        {error && (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-[#8B949E]">{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export { Input }
