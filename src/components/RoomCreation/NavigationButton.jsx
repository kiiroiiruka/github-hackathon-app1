import PropTypes from "prop-types";

/**
 * ナビゲーションボタンコンポーネント
 */
const NavigationButton = ({ icon, title, description, onClick, hoverColor = "blue", dashed = false, disabled = false }) => {
  const getHoverClasses = () => {
    switch (hoverColor) {
      case "blue":
        return "hover:border-blue-300 hover:bg-blue-50 group-hover:text-blue-500";
      case "green":
        return "hover:border-green-300 hover:bg-green-50 group-hover:text-green-500";
      case "purple":
        return "hover:border-purple-300 hover:bg-purple-50 group-hover:text-purple-500";
      default:
        return "hover:border-blue-300 hover:bg-blue-50 group-hover:text-blue-500";
    }
  };

  const hoverClasses = getHoverClasses();
  const arrowColor = hoverColor === "blue" ? "group-hover:text-blue-500" 
                   : hoverColor === "green" ? "group-hover:text-green-500"
                   : "group-hover:text-purple-500";

  const borderStyle = dashed ? "border-dashed" : "border-solid";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center justify-between p-4 border-2 ${borderStyle} ${
        disabled 
          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50" 
          : "border-gray-300"
      } rounded-xl transition-all duration-200 group ${
        disabled ? "" : hoverClasses.split(' ').slice(0, 2).join(' ')
      }`}
    >
      <div className="flex items-center">
        <span className="text-2xl mr-3">{icon}</span>
        <div className="text-left">
          <div className="font-medium text-gray-800">{title}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </div>
      </div>
      <span className={`${disabled ? "text-gray-300" : "text-gray-400"} transition-colors ${disabled ? "" : arrowColor}`}>→</span>
    </button>
  );
};

NavigationButton.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  hoverColor: PropTypes.oneOf(['blue', 'green', 'purple']),
  dashed: PropTypes.bool,
  disabled: PropTypes.bool
};

export default NavigationButton;