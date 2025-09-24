import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, rtdb } from "@/firebase";

const CarNavigation = () => {
	const { roomId } = useParams();
	const [members, setMembers] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!roomId) {
			setLoading(false);
			return;
		}

		// 画面入室時に自分の参加状態を true にする（作成者/参加者どちらも）
		const currentUser = auth.currentUser;
		if (currentUser) {
			void update(ref(rtdb, `rooms/${roomId}/members/${currentUser.uid}`), {
				accepted: true,
			});
		}

		const roomRef = ref(rtdb, `rooms/${roomId}/members`);
		const unsubscribe = onValue(
			roomRef,
			(snapshot) => {
				const value = snapshot.val() || {};
				const list = Object.values(value).filter((m) => m?.accepted);
				setMembers(list);
				setLoading(false);
			},
			() => setLoading(false),
		);

		return () => unsubscribe();
	}, [roomId]);

	// 離脱時に自分の参加状態を false に戻す
	useEffect(() => {
		const currentUser = auth.currentUser;
		if (!roomId || !currentUser) return;

		const setAcceptedFalse = () => {
			try {
				return update(ref(rtdb, `rooms/${roomId}/members/${currentUser.uid}`), {
					accepted: false,
				});
			} catch {
				// no-op
			}
		};

		const handleBeforeUnload = () => {
			void setAcceptedFalse();
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			void setAcceptedFalse();
		};
	}, [roomId]);

	return (
		<div className="p-4 space-y-4">
			<h1 className="text-2xl font-bold">カーナビ</h1>
			<p className="text-gray-600">Room ID: {roomId}</p>
			{loading ? (
				<p className="text-gray-600">読み込み中...</p>
			) : members.length === 0 ? (
				<p className="text-gray-600">参加中のユーザーはいません。</p>
			) : (
				<ul className="space-y-2">
					{members.map((m) => (
						<li key={m.uid} className="flex items-center gap-3">
							<img
								src={m.photoURL || "/vite.svg"}
								alt={m.name || "user"}
								className="w-8 h-8 rounded-full"
							/>
							<span className="font-medium">{m.name || "(名無し)"}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default CarNavigation;
