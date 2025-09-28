import React from 'react';

/**
 * 統一された入力フィールドコンポーネント
 * 全画面で一貫した入力デザインを提供
 */
const Input = ({ 
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
  inputClassName = "",
  labelClassName = "",
  error = null,
  helperText = null,
  icon = null,
  disabled = false,
  required = false,
  ...props 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
        
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            block w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 
            placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 
            focus:ring-offset-0 transition-colors duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${inputClassName}
          `}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
