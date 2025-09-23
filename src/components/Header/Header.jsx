import React from "react";
import { useNavigate } from "react-router-dom";

function HeaderComponent({ title, onBack }) {
  const navigate = useNavigate();

  // 戻るボタンを押したときの処理
  const handleBack = () => {
    if (onBack) {
      // 親から渡された関数があればそれを優先
      onBack();
    } else {
      // 渡されなければデフォルトの戻る処理
      navigate(-1);
    }
  };

  return (
    <header style={styles.header}>
      <button type="button" onClick={handleBack} style={styles.button}>
        ← 戻る
      </button>
      <h1 style={styles.title}>{title}</h1>
    </header>
  );
}

// 簡単なスタイル
const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px",
    background: "#f0f0f0",
  },
  button: {
    marginRight: "10px",
    padding: "5px 10px",
    cursor: "pointer",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    marginRight: "20px",
  },
};

export default HeaderComponent;
