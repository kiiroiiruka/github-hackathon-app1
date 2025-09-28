import clsx from "clsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "@/firebase";
import reactLogo from "../assets/react.svg";

function LoginScreen() {
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	const handleLogin = async () => {
		try {
			setIsLoading(true);
			await loginWithGoogle();
		} catch {
			// already logged by loginWithGoogle
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className={clsx(
				"min-h-dvh w-dvw flex items-center justify-center", // layout
				"bg-white", // surface
			)}
		>
			<div
				className={clsx(
					"flex flex-col items-center", // layout
					"gap-12", // spacing
				)}
			>
				{/* App icon placeholder */}
				<div
					className={clsx(
						"w-[140px] h-[140px]", // size
						"rounded-xl", // shape
						"border border-black/40", // border
						"shadow-[0_0_0_2px_#fff_inset]", // effects
						"flex items-center justify-center", // layout
					)}
				>
					<img
						src={reactLogo}
						alt="アプリアイコン"
						className="w-16 h-16 opacity-90"
					/>
				</div>

				{/* Google login button */}
				<button
					onClick={handleLogin}
					type="button"
					disabled={isLoading}
					className={clsx(
						"relative", // position
						"flex items-center", // layout
						"gap-3 px-8 py-4", // spacing
						"text-[28px] leading-none font-medium tracking-wide", // typography
						"border-2 border-black/60 rounded-2xl", // border/shape
						"shadow-sm transition active:scale-[0.99]", // effect
						isLoading
							? "bg-gray-200 text-gray-500"
							: "bg-white hover:bg-gray-50", // surface/state
					)}
					aria-busy={isLoading}
				>
					<span className="pl-1">
						{isLoading ? "処理中..." : "ログインする"}
					</span>
					<span
						className={clsx(
							"inline-flex items-center justify-center",
							"w-8 h-8",
						)}
					>
						{/* Google G logo as SVG */}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 48 48"
							className="w-8 h-8"
							aria-hidden="true"
							focusable="false"
						>
							<title>Google</title>
							<path
								fill="#FFC107"
								d="M43.611 20.083H42V20H24v8h11.303C33.826 32.438 29.274 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.79 6.053 29.122 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
							/>
							<path
								fill="#FF3D00"
								d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.79 6.053 29.122 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
							/>
							<path
								fill="#4CAF50"
								d="M24 44c5.167 0 9.86-1.977 13.409-5.192l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.252 0-9.815-3.589-11.289-8.438l-6.553 5.047C9.474 39.556 16.227 44 24 44z"
							/>
							<path
								fill="#1976D2"
								d="M43.611 20.083H42V20H24v8h11.303c-1.054 3.438-3.617 6.166-6.885 7.571l.001.001 6.191 5.238C33.978 41.045 40 36 40 24c0-1.341-.138-2.651-.389-3.917z"
							/>
						</svg>
					</span>
				</button>

				{/* Policy button */}
				<button
					onClick={() => navigate("/policy")}
					type="button"
					className={clsx(
						"mt-2",
						"text-sm text-gray-600 underline underline-offset-2 hover:text-gray-800",
					)}
					aria-label="利用規約を開く"
				>
					利用規約
				</button>
			</div>
		</div>
	);
}

export default LoginScreen;
