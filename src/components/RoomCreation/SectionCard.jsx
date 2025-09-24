import PropTypes from "prop-types";

/**
 * セクションカードコンポーネント
 */
const SectionCard = ({ icon, title, badge, children }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">{icon}</span>
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {badge && (
          <span className="ml-auto bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
};

SectionCard.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  badge: PropTypes.string,
  children: PropTypes.node.isRequired
};

export default SectionCard;