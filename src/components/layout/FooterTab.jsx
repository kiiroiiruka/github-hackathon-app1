import clsx from "clsx";
import PropTypes from "prop-types";

function FooterTab({ value, onChange, tabs }) {
	return (
		<nav className="fixed bottom-0 inset-x-0 h-16 border-t border-gray-200 bg-white shadow-sm">
			<ul className="grid grid-cols-5 h-full">
				{tabs.map((tab) => {
					const isActive = value === tab.key;
					return (
						<li key={tab.key} className="flex items-stretch">
							<button
								type="button"
								className={clsx(
									"w-full flex flex-col items-center justify-center gap-1 text-sm select-none",
									isActive
										? "text-blue-600"
										: "text-gray-500 hover:text-gray-700",
								)}
								aria-current={isActive ? "page" : undefined}
								onClick={() => onChange(tab.key)}
							>
								{tab.icon && (
									<span className="w-5 h-5" aria-hidden="true">
										{tab.icon}
									</span>
								)}
								<span>{tab.label}</span>
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

FooterTab.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	tabs: PropTypes.arrayOf(
		PropTypes.shape({
			key: PropTypes.string.isRequired,
			label: PropTypes.string.isRequired,
			icon: PropTypes.node,
		}),
	).isRequired,
};

export default FooterTab;
