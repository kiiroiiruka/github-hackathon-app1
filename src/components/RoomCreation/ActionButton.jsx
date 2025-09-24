import PropTypes from "prop-types";

/**
 * アクションボタンコンポーネント（作成/戻るボタン用）
 */
const ActionButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "primary",
  size = "large"
}) => {
  const getVariantClasses = () => {
    if (disabled) {
      return "bg-gray-300 text-gray-500 cursor-not-allowed";
    }
    
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]";
      case "secondary":
        return "text-gray-500 hover:text-gray-700 underline";
      default:
        return "bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "large":
        return "w-full py-4 px-6 rounded-2xl font-bold text-lg";
      case "small":
        return "py-2 px-4 rounded-lg font-medium text-sm";
      default:
        return "w-full py-4 px-6 rounded-2xl font-bold text-lg";
    }
  };

  const baseClasses = "transition-all duration-200 transform";
  const variantClasses = getVariantClasses();
  const sizeClasses = getSizeClasses();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${sizeClasses}`}
    >
      {children}
    </button>
  );
};

ActionButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary']),
  size: PropTypes.oneOf(['large', 'small'])
};

export default ActionButton;