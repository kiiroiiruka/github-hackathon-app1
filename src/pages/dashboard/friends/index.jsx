// src/pages/dashboard/friends/index.jsx
import HeaderComponent2 from "../../../components/header/header2"; // コンポーネントをimport

const FriendsAddScreen = () => {
  return (
    <div>
      <HeaderComponent2 title="友達追加" />
      <div style={styles.container}>
        <p>このユーザーIDを友達になりたい相手に送ろう。</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",           // flexbox を有効化
    alignItems: "center",      // 縦方向に中央寄せ
    height: "100vh",           // 画面全体の高さを確保
    flexDirection: "column",   // 縦方向に配置（必要に応じて）
  },
};

export default FriendsAddScreen;
