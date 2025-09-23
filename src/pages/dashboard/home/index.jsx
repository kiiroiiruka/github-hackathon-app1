import React from "react";
import HeaderComponent2 from "../../../components/Header/Header2"; 
// ← 実際のファイルパスに合わせて調整してください

const HomeScreen = () => {
  return (
    <div>
      {/* ヘッダー */}
      <HeaderComponent2 title="ホーム画面" />

      {/* メインコンテンツ */}
      <div style={{ padding: "20px" }}>
        Home
      </div>
    </div>
  );
};

export default HomeScreen;
