import PropTypes from "prop-types";

const ButtonBool = ({ label, afterlabel, onClick, executed = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded transition-colors ${
        executed
          ? "bg-gray-500 text-white cursor-not-allowed"
          : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      disabled={executed}
    >
      {executed && afterlabel ? afterlabel : label}
    </button>
  );
};

ButtonBool.propTypes = {
  label: PropTypes.string.isRequired,
  afterlabel: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  executed: PropTypes.bool,
};

export default ButtonBool;