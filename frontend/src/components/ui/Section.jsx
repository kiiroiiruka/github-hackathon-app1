import React from 'react';
import Card from './Card';

/**
 * 統一されたセクションコンポーネント
 * 全画面で一貫したセクションデザインを提供
 */
const Section = ({ 
  title,
  subtitle,
  icon,
  children,
  className = "",
  cardClassName = "",
  titleClassName = "",
  subtitleClassName = "",
  variant = "default",
  ...props 
}) => {
  return (
    <section className={`space-y-4 ${className}`} {...props}>
      {(title || subtitle || icon) && (
        <div className="text-center mb-6">
          {icon && (
            <div className="text-4xl mb-3">{icon}</div>
          )}
          {title && (
            <h2 className={`text-2xl font-bold text-gray-800 mb-2 ${titleClassName}`}>
              {title}
            </h2>
          )}
          {subtitle && (
            <div className={`text-gray-600 ${subtitleClassName}`}>
              {subtitle}
            </div>
          )}
        </div>
      )}
      
      <Card variant={variant} className={cardClassName}>
        {children}
      </Card>
    </section>
  );
};

export default Section;
