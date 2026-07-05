import React from 'react';

/**
 * LoadingButton — Reusable button with built-in spinner
 * Use across the entire site: public pages, dashboard, modals, etc.
 */
export default function LoadingButton({
  children,
  loading = false,
  loadingText = 'Loading...',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) {
  const variantClass = {
    primary: 'btn btn-primary',
    outline: 'btn btn-outline',
    danger: 'btn', // fallback — add .btn-danger to your global CSS if needed
  }[variant] || 'btn btn-primary';

  const sizeStyle = size === 'sm'
    ? { padding: '6px 12px', fontSize: '0.8rem' }
    : size === 'lg'
    ? { padding: '14px 24px', fontSize: '1rem' }
    : {};

  return (
    <button
      type={type}
      className={`${variantClass} ${className}`.trim()}
      disabled={disabled || loading}
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', ...sizeStyle }}
      {...rest}
    >
      {loading && (
        <span
          className="spinner"
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: variant === 'outline' ? 'currentColor' : '#fff',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block',
          }}
        />
      )}
      {loading ? loadingText : children}
    </button>
  );
}