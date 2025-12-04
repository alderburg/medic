import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, required, containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label htmlFor={props.id}>
          {label} {required && <span className={cn(error ? "text-red-500" : "text-gray-400")}>*</span>}
        </Label>
        <Input
          ref={ref}
          {...props}
          className={cn(
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
            className
          )}
        />
        {error && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({ label, error, required, containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label htmlFor={props.id}>
          {label} {required && <span className={error ? "text-red-500" : "text-gray-400"}>*</span>}
        </Label>
        <Textarea
          ref={ref}
          {...props}
          className={cn(
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
            className
          )}
        />
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = "ValidatedTextarea";

interface ValidatedSelectProps {
  id?: string;
  label: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  options?: Array<{ value: string; label: string }>;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  id,
  label,
  error,
  required,
  containerClassName,
  value,
  onValueChange,
  placeholder,
  children,
  options,
}) => {
  return (
    <div className={cn("space-y-2", containerClassName)}>
      <Label htmlFor={id}>
        {label} {required && <span className={cn("text-red-500", error ? "" : "text-gray-400")}>*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(
          error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
        )}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options ? (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            children
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};

interface ValidatedPasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export const ValidatedPasswordInput = React.forwardRef<HTMLInputElement, ValidatedPasswordInputProps>(
  ({ label, error, required, containerClassName, className, showPassword, onTogglePassword, ...props }, ref) => {
    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label htmlFor={props.id}>
          {label} {required && <span className={cn("text-red-500", error ? "" : "text-gray-400")}>*</span>}
        </Label>
        <div className="relative">
          <Input
            ref={ref}
            {...props}
            type={showPassword ? "text" : "password"}
            className={cn(
              "pr-10",
              error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
              className
            )}
          />
          {onTogglePassword && (
            <button
              type="button"
              onClick={onTogglePassword}
              disabled={props.disabled}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    );
  }
);

ValidatedPasswordInput.displayName = "ValidatedPasswordInput";