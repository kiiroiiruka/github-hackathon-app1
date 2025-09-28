import React from 'react';

/**
 * 統一されたカードコンポーネント
 * 全画面で一貫したカードデザインを提供
 */
const Card = ({ 
  children, 
  className = "", 
  variant = "default",
  padding = "p-6",
  shadow = "shadow-lg",
  ...props 
}) => {
  const baseClasses = "bg-white rounded-xl border border-gray-100";
  
  const variants = {
    default: "bg-white",
    primary: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
    success: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
    warning: "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200",
    error: "bg-gradient-to-br from-red-50 to-pink-50 border-red-200",
    info: "bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200"
  };

  return (
    <div 
      className={`${baseClasses} ${variants[variant]} ${padding} ${shadow} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
