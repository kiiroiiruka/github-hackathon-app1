import React from 'react';

/**
 * 統一されたローディングスピナーコンポーネント
 * 全画面で一貫したローディングデザインを提供
 */
const LoadingSpinner = ({ 
  size = "md",
  text = "読み込み中...",
  className = "",
  showText = true,
  variant = "default"
}) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  const variants = {
    default: "text-blue-600",
    white: "text-white",
    gray: "text-gray-600"
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-current ${sizes[size]} ${variants[variant]}`}></div>
      {showText && text && (
        <p className={`text-sm ${variants[variant]}`}>{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
