import HeaderComponent from "../../../components/Header/Header";

const MemoScreen = () => {
	return (
		<div>
			<HeaderComponent title="メモ" />
			<div className="p-4" style={{ paddingTop: "88px" }}>
				<p>メモページの内容</p>
			</div>
		</div>
	);
};

export default MemoScreen;
