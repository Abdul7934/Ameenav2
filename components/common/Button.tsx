import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <svg
      className="loading-spinner"
      style={{width: '20px', height: '20px'}}
      xmlns="http://www.w.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle style={{opacity: 0.25}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path style={{opacity: 0.75}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost';
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, leftIcon, rightIcon, isLoading, className, variant = 'primary', ...props }, ref) => {
    const variantClass = `btn-${variant}`;
    
    return (
      <button
        ref={ref}
        className={`btn ${variantClass} ${className || ''}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? <LoadingSpinner /> : leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;