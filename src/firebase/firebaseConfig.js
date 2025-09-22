import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyAeAU8XmgdiBK-J6zDTIBYlOFSBSLAvSZQ",
	authDomain: "github-hackathon-app1.firebaseapp.com",
	projectId: "github-hackathon-app1",
	storageBucket: "github-hackathon-app1.firebasestorage.app",
	messagingSenderId: "385402311621",
	appId: "1:385402311621:web:44a0828f4b4619d11071ac",
	measurementId: "G-QN6SJ1D6T7",
};
const app = initializeApp(firebaseConfig);
//ログイン機能実装の為のオブジェクトを取得
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
//データベース機能実装の為のオブジェクトを取得
const db = getFirestore(app);

export { auth, db, provider };
