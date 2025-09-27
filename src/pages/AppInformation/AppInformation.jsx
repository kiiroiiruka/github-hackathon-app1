import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "@/components/Header/Header2";

const AppInformation = () => {
	const navigate = useNavigate();

	// 戻るボタンの処理
	const handleBackClick = () => {
		navigate(-1);
	};

	return (
		<div>
			<HeaderComponent2 
				title="アプリ情報" 
				onBackClick={handleBackClick}
			/>
			<div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
				{/* アプリ情報カード */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-xl font-bold text-center mb-4">アプリ情報</h2>
					
					{/* アプリ名 */}
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">アプリ名</h3>
						<p className="text-gray-700">Enteli Web App</p>
					</div>

					{/* バージョン情報 */}
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">バージョン</h3>
						<p className="text-gray-700">1.0.0</p>
					</div>

					{/* 開発者情報 */}
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">開発者</h3>
						<p className="text-gray-700">Galaxyバナナ</p>
					</div>

					{/* 説明 */}
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">アプリの説明</h3>
						<p className="text-gray-700">
							友達と一緒にドライブやお出かけを計画できるソーシャルアプリです。
							位置情報を共有しながら、みんなで楽しい時間を過ごしましょう。
						</p>
					</div>

					{/* 主な機能 */}
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">主な機能</h3>
						<ul className="list-disc list-inside text-gray-700 space-y-1">
							<li>友達との位置情報共有</li>
							<li>ルート検索・ナビゲーション</li>
							<li>駐車場情報の検索</li>
							<li>メモ機能</li>
							<li>友達招待・管理</li>
						</ul>
					</div>

					{/* 利用規約・プライバシーポリシー */}
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">法的情報</h3>
						<div className="space-y-2">
							<button
								type="button"
								onClick={() => navigate("/dashboard/policy")}
								className="block w-full text-left text-blue-600 hover:text-blue-800 underline"
							>
								利用規約・プライバシーポリシー
							</button>
						</div>
					</div>

					{/* お問い合わせ */}
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">お問い合わせ</h3>
						<p className="text-gray-700">
							ご質問やお困りのことがございましたら、以下までお気軽にお問い合わせください。
						</p>
						<p className="text-blue-600 mt-2">support@enteli.com</p>
					</div>

					{/* コピーライト */}
					<div className="border-t pt-4 mt-6">
						<p className="text-center text-sm text-gray-500">
							© 2025 Galaxyバナナ. All rights reserved.
						</p>
					</div>
				</div>

				{/* 戻るボタン */}
				<div className="flex justify-center">
					<button
						type="button"
						onClick={handleBackClick}
						className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition-colors"
					>
						戻る
					</button>
				</div>
			</div>
		</div>
	);
};

export default AppInformation;