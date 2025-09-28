import React from 'react';
import HeaderComponent from '../Header/Header';

/**
 * 統一されたページレイアウトコンポーネント
 * 全画面で一貫したデザインを提供
 */
const PageLayout = ({ 
  title, 
  children, 
  className = "", 
  showHeader = true,
  headerProps = {},
  containerClassName = "",
  contentClassName = ""
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ${className}`}>
      {showHeader && (
        <HeaderComponent title={title} {...headerProps} />
      )}
      
      <div className={`px-4 py-6 ${containerClassName}`} style={{ paddingTop: showHeader ? '100px' : '24px' }}>
        <div className={`max-w-4xl mx-auto ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
