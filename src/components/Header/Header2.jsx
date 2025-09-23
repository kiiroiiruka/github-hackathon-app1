import React from "react";

function HeaderComponent2({ title }) {
  return (
    <header style={styles.header}>
      {/* 左側: アプリアイコン */}
      <div style={styles.left}>
        <img
          src="/logo192.png"
          alt="App Logo"
          style={styles.icon}
        />
      </div>

      {/* 中央: タイトル */}
      <div style={styles.center}>
        <h1 style={styles.title}>{title}</h1>
      </div>

      {/* 右側: ユーザーアイコン */}
      <div style={styles.right}>
        <img
          src="/user-icon.png"
          alt="User Icon"
          style={styles.userIcon}
        />
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    background: "#f0f0f0",
  },
  left: {
    flex: 1,
    display: "flex",
    alignItems: "center",
  },
  center: {
    flex: 2,
    textAlign: "center",
  },
  right: {
    flex: 1,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  icon: {
    width: "40px",
    height: "40px",
  },
  userIcon: {
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    cursor: "pointer",
  },
  title: {
    margin: 0,
    fontSize: "20px",
  },
};

export default HeaderComponent2;
