import Button from "./Button";

/**
 * 統一された空状態コンポーネント
 * 全画面で一貫した空状態デザインを提供
 */
const EmptyState = ({
  icon = "📭",
  title = "データがありません",
  description = "表示するデータがありません",
  actionLabel = null,
  actionOnClick = null,
  className = "",
  iconSize = "text-6xl",
  titleSize = "text-xl",
  descriptionSize = "text-sm",
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className={`${iconSize} mb-4`}>{icon}</div>
      <h3 className={`${titleSize} font-semibold text-gray-800 mb-2`}>{title}</h3>
      <p className={`${descriptionSize} text-gray-600 mb-6`}>{description}</p>
      {actionLabel && actionOnClick && (
        <Button onClick={actionOnClick} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
