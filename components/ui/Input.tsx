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
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}

        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full rounded-xl border bg-gray-50 py-2.5 text-sm text-gray-900',
              'placeholder:text-gray-400',
              'transition-all duration-150',
              'focus:bg-white focus:outline-none focus:ring-2',
              error
                ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-400/20'
                : 'border-gray-200 focus:border-brand focus:ring-brand/20',
              leftIcon  ? 'pl-10' : 'pl-4',
              (rightAction || isPassword) ? 'pr-10' : 'pr-4',
              className,
            )}
            {...props}
          />

          {/* Right action or password toggle */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="hover:text-gray-600 transition-colors"
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
          <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export { Input }
