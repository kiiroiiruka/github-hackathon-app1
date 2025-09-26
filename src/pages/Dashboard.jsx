import { useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import FooterTab from "../components/layout/FooterTab";
import { useIsLoggedIn } from "../hooks/useUser";
import { useUserUid } from "../hooks/useUserUid";
import FriendsAddScreen from "./dashboard/friends";
import HomeScreen from "./dashboard/home";
import MemoScreen from "./dashboard/memo";
import NaviCreateScreen from "./dashboard/navi";
import RoomCreat from "./dashboard/navi/RoomCreat";
import TryPage from "./dashboard/navi/TryPage";
import RouteSelect from "./dashboard/navi/RouteSelect";
import PurlieuLocation from "./dashboard/navi/PurlieuLocation";
import InviterPreference from "./dashboard/navi/InviterPreference";
import RouteScreen from "./dashboard/navi/RouteScreen";
import Confirmation from "./dashboard/navi/Confirmation";
import ParkingScreen from "./dashboard/parking";
import ParkingDetail from "./dashboard/parking/Detail";

const TABS = [
    {
        key: "home",
        label: "ホーム",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M12 3.172 3 10v10h6v-6h6v6h6V10z" />
            </svg>
        ),
    },
    {
        key: "navi",
        label: "ナビ作成",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M12 2 4 20l8-4 8 4-8-18z" />
            </svg>
        ),
    },
    {
        key: "friends",
        label: "友達追加",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M15 12a5 5 0 1 0-6 0A8 8 0 0 0 2 20h2a6 6 0 1 1 12 0h2a8 8 0 0 0-6-8z" />
                <path d="M19 8V6h-2V4h2V2h2v2h2v2h-2v2z" />
            </svg>
        ),
    },
    {
        key: "parking",
        label: "駐車場",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M5 10l2-4h10l2 4h1a2 2 0 012 2v5h-2a2 2 0 11-4 0H9a2 2 0 11-4 0H3v-5a2 2 0 012-2h0zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
        ),
    },
    {
        key: "memo",
        label: "メモ",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M6 2h12v20H6zM8 6h8v2H8zm0 4h8v2H8zm0 4h5v2H8z" />
            </svg>
        ),
    },
];

const Dashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // ユーザーUIDを取得（グローバルに利用可能）
    const userUid = useUserUid();
    const isLoggedIn = useIsLoggedIn();

    // デバッグ用：ユーザー情報をコンソールに出力
    useEffect(() => {
        if (userUid) {
            console.log("Current User UID:", userUid);
            console.log("Is Logged In:", isLoggedIn);
        }
    }, [userUid, isLoggedIn]);

    // URLから現在のタブを判定する関数
    const getCurrentTab = useCallback((pathname) => {
        // /dashboard を除去してパスを取得
        const path = pathname.replace("/dashboard", "") || "/";

        // パスを分割して最初の部分を取得
        const segments = path.split("/").filter(Boolean);
        const firstSegment = segments[0];

        // サブページの場合は親タブを返す
        if (firstSegment === "parking") return "parking";
        if (firstSegment === "navi") return "navi";
        if (firstSegment === "friends") return "friends";
        if (firstSegment === "memo") return "memo";

        // デフォルトは home
        return "home";
    }, []);

    const [tab, setTab] = useState(() => getCurrentTab(location.pathname));

    // URLが変わったらタブ状態を更新
    useEffect(() => {
        const currentTab = getCurrentTab(location.pathname);
        setTab(currentTab);
    }, [location.pathname, getCurrentTab]);

    // タブクリック時の処理
    const handleTabChange = (tabKey) => {
        setTab(tabKey);
        const path = tabKey === "home" ? "/dashboard" : `/dashboard/${tabKey}`;
        navigate(path);
    };

    return (
        <div className="min-h-dvh pb-16">
            <main className="p-4">
                <Routes>
                    <Route index element={<HomeScreen />} />
                    <Route path="home" element={<HomeScreen />} />
                    <Route path="navi" element={<NaviCreateScreen />} />
                    <Route path="navi/try" element={<TryPage />} />
                    <Route path="navi/inviter" element={<InviterPreference />} />
                    <Route path="navi/route" element={<RouteSelect />} />
                    <Route path="navi/route-screen" element={<RouteScreen />} />
                    <Route path="navi/purlieu-location" element={<PurlieuLocation />} />
                    <Route path="navi/confirmation" element={<Confirmation />} />
                    <Route path="navi/room" element={<RoomCreat />} />
                    <Route path="friends" element={<FriendsAddScreen />} />
                    <Route path="parking" element={<ParkingScreen />} />
                    <Route path="parking/:id" element={<ParkingDetail />} />
                    <Route path="memo" element={<MemoScreen />} />
                </Routes>
            </main>
            <FooterTab value={tab} onChange={handleTabChange} tabs={TABS} />
        </div>
    );
};

export default Dashboard;