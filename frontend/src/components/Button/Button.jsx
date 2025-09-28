

const Button = ({ label, onClick, type = "button" }) => {
  return (
    <button
      className="px-5 py-2.5 my-2 text-base font-bold border-none rounded-md cursor-pointer bg-blue-600 text-white transition-colors duration-300 ease-in-out hover:bg-blue-700"
      onClick={onClick}
      type={type}
    >
      {label}
    </button>
  );
};

export default Button;