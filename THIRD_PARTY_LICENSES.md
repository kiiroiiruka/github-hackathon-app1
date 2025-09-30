# サードパーティライセンス・素材使用一覧

本プロジェクトで使用されているツール、ライブラリ、素材、APIについて記載します。

## フロントエンドライブラリ・フレームワーク

### React
- **使用場所**: プロジェクト全体のUIフレームワーク
- **URL**: https://react.dev/
- **ライセンス**: MIT License
- **規約**: https://github.com/facebook/react/blob/main/LICENSE
- **OKと思った理由**: 
```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### React Router DOM
- **使用場所**: ページルーティング管理
- **URL**: https://reactrouter.com/
- **ライセンス**: MIT License
- **規約**: https://github.com/remix-run/react-router/blob/main/LICENSE.md
- **OKと思った理由**: MIT Licenseで商用利用可能

### Vite
- **使用場所**: ビルドツール・開発サーバー
- **URL**: https://vitejs.dev/
- **ライセンス**: MIT License
- **規約**: https://github.com/vitejs/vite/blob/main/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### Tailwind CSS
- **使用場所**: CSSフレームワーク（スタイリング）
- **URL**: https://tailwindcss.com/
- **ライセンス**: MIT License
- **規約**: https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

## 状態管理・ユーティリティ

### Jotai
- **使用場所**: アプリケーション状態管理
- **URL**: https://jotai.org/
- **ライセンス**: MIT License
- **規約**: https://github.com/pmndrs/jotai/blob/main/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### clsx
- **使用場所**: CSSクラス名の条件付き結合
- **URL**: https://github.com/lukeed/clsx
- **ライセンス**: MIT License
- **規約**: https://github.com/lukeed/clsx/blob/master/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### PropTypes
- **使用場所**: Reactコンポーネントの型チェック
- **URL**: https://github.com/facebook/prop-types
- **ライセンス**: MIT License
- **規約**: https://github.com/facebook/prop-types/blob/main/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

## 地図・ルーティングライブラリ

### Leaflet
- **使用場所**: 地図表示機能
- **URL**: https://leafletjs.com/
- **ライセンス**: BSD 2-Clause License
- **規約**: https://github.com/Leaflet/Leaflet/blob/master/LICENSE
- **OKと思った理由**: 
```
BSD 2-Clause License

Copyright (c) 2010-2024, Vladimir Agafonkin
Copyright (c) 2010-2011, CloudMade
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
```

### React Leaflet
- **使用場所**: LeafletとReactの統合
- **URL**: https://react-leaflet.js.org/
- **ライセンス**: BSD 2-Clause License
- **規約**: https://github.com/PaulLeCam/react-leaflet/blob/master/LICENSE
- **OKと思った理由**: BSD 2-Clause Licenseで商用利用可能

### Leaflet Color Markers (pointhi)
- **使用場所**: 地図マーカーアイコン（`frontend/src/pages/CarNavigation.jsx`, `CarNavigationAdvanced.jsx`）
- **URL**: https://github.com/pointhi/leaflet-color-markers
- **ライセンス**: MIT License
- **規約**: https://github.com/pointhi/leaflet-color-markers/blob/master/LICENSE
- **OKと思った理由**: 
```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```
- **使用アイコン**: 緑、赤、青、オレンジ、紫のマーカーアイコン

### Leaflet Default Markers
- **使用場所**: 地図マーカーアイコン（`frontend/src/pages/dashboard/navi/RouteScreen.jsx`, `TryPage.jsx`）
- **URL**: https://unpkg.com/leaflet@1.9.4/dist/images/
- **ライセンス**: BSD 2-Clause License (Leafletの一部)
- **規約**: https://github.com/Leaflet/Leaflet/blob/master/LICENSE
- **OKと思った理由**: Leafletプロジェクトの一部としてBSD 2-Clause Licenseで商用利用可能
- **使用アイコン**: デフォルトマーカーアイコン（通常、2x解像度）

### Leaflet Routing Machine
- **使用場所**: ルーティング機能
- **URL**: https://github.com/perliedman/leaflet-routing-machine
- **ライセンス**: ISC License
- **規約**: https://github.com/perliedman/leaflet-routing-machine/blob/master/LICENSE
- **OKと思った理由**: 
```
ISC License

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.
```


## 外部API

### OSRM (Open Source Routing Machine)
- **使用場所**: ルート計算API（`frontend/src/firebase/map.js`）
- **URL**: https://project-osrm.org/
- **エンドポイント**: `https://router.project-osrm.org/route/v1/`
- **ライセンス**: BSD 2-Clause License
- **規約**: https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE
- **OKと思った理由**: 
```
BSD 2-Clause License

Copyright (c) 2014-2024 Project-OSRM
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
```

### Nominatim (OpenStreetMap)
- **使用場所**: 住所検索・ジオコーディングAPI（`frontend/src/firebase/map.js`）
- **URL**: https://nominatim.org/
- **エンドポイント**: `https://nominatim.openstreetmap.org/`
- **ライセンス**: ODbL (Open Database License)
- **規約**: https://opendatacommons.org/licenses/odbl/
- **OKと思った理由**: 
```
Open Database License (ODbL) v1.0

You are free to:
- Share: copy, distribute and use the database
- Create: produce works from the database
- Adapt: modify, transform and build upon the database

As long as you:
- Attribute: You must attribute any public use of the database, or works
  produced from the database, in the manner specified in the ODbL.
- Share-Alike: If you publicly use any adapted version of this database, or
  works produced from an adapted database, you must also offer that adapted
  database under the ODbL.
- Keep open: If you redistribute the database, or an adapted version of it,
  then you may use technological measures that restrict the work (such as
  DRM) as long as you also redistribute a version without such measures.
```

## Firebase関連

### Firebase SDK
- **使用場所**: 認証・データベース・ストレージ機能
- **URL**: https://firebase.google.com/
- **ライセンス**: Apache License 2.0
- **規約**: https://github.com/firebase/firebase-js-sdk/blob/master/LICENSE
- **OKと思った理由**: 
```
Apache License 2.0

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

### Firebase Realtime Database
- **使用場所**: リアルタイムデータ同期（ルーム情報、参加者情報）
- **使用ファイル**: `frontend/src/pages/CarNavigation.jsx`, `CarNavigationAdvanced.jsx`, `hooks/useDailyConnection.js`
- **URL**: https://firebase.google.com/products/realtime-database
- **ライセンス**: Apache License 2.0 (Firebase SDKの一部)
- **規約**: https://github.com/firebase/firebase-js-sdk/blob/master/LICENSE
- **OKと思った理由**: Firebase SDKの一部としてApache License 2.0で商用利用可能
- **使用例**: 
  - ルーム参加者のリアルタイム同期
  - 位置情報のリアルタイム更新
  - 通話状態の共有

### Firebase Firestore
- **使用場所**: 構造化データの保存・取得（ユーザー情報、友達リスト、駐車情報、メモ）
- **使用ファイル**: `frontend/src/firebase/users.js`, `friendRequests.js`, `parkinginfo.js`, `memos.js`, `hooks/useFriends.js`
- **URL**: https://firebase.google.com/products/firestore
- **ライセンス**: Apache License 2.0 (Firebase SDKの一部)
- **規約**: https://github.com/firebase/firebase-js-sdk/blob/master/LICENSE
- **OKと思った理由**: Firebase SDKの一部としてApache License 2.0で商用利用可能
- **使用例**:
  - ユーザープロフィール情報の保存
  - 友達リクエストの管理
  - 駐車場情報の記録
  - メモ・ノートの保存
  - 開発用データの管理

## 通話・ビデオ機能

### Daily.co SDK
- **使用場所**: ビデオ通話機能（`frontend/src/hooks/useDailyConnection.js`）
- **URL**: https://www.daily.co/
- **ライセンス**: 商用ライセンス
- **規約**: https://www.daily.co/terms
- **OKと思った理由**: 商用利用可能なプラットフォームとして提供

## 開発ツール

### Biome
- **使用場所**: リント・フォーマット
- **URL**: https://biomejs.dev/
- **ライセンス**: MIT License
- **規約**: https://github.com/biomejs/biome/blob/main/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### Vite PWA Plugin
- **使用場所**: PWA機能の実装
- **URL**: https://vite-pwa-org.netlify.app/
- **ライセンス**: MIT License
- **規約**: https://github.com/vite-pwa/vite-plugin-pwa/blob/main/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### Concurrently
- **使用場所**: 複数コマンドの並行実行
- **URL**: https://github.com/open-cli-tools/concurrently
- **ライセンス**: MIT License
- **規約**: https://github.com/open-cli-tools/concurrently/blob/master/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

## 画像・アイコン素材

### Vite Logo (vite.svg)
- **使用場所**: デフォルトアイコン（`frontend/public/vite.svg`）
- **URL**: https://vitejs.dev/guide/assets.html
- **ライセンス**: MIT License (Viteプロジェクトの一部)
- **規約**: https://github.com/vitejs/vite/blob/main/LICENSE
- **OKと思った理由**: Viteプロジェクトの一部としてMIT License

### Car Icon (carIcon.png)
- **使用場所**: アプリケーションアイコン（PWA manifest、ヘッダーアイコンなど）
- **制作ツール**: Blender
- **URL**: https://www.blender.org/
- **ライセンス**: GNU General Public License v3.0
- **規約**: https://www.blender.org/about/license/
- **OKと思った理由**: 
```
GNU General Public License v3.0

The GNU General Public License is a free, copyleft license for software and other kinds of works.

The licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, the GNU General Public License is intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users.
```
- **備考**: Blender自体はGPLライセンスですが、Blenderで作成した3Dモデルやレンダリング画像の商用利用は制限されていません

## プログラミング言語・実行環境

### JavaScript (ECMAScript)
- **使用場所**: フロントエンド開発言語
- **URL**: https://www.ecma-international.org/
- **ライセンス**: 標準仕様（商用利用制限なし）
- **規約**: https://www.ecma-international.org/publications-and-standards/standards/
- **OKと思った理由**: ECMAScript標準は商用利用に制限がなく、JavaScriptエンジンは各ブラウザベンダーが提供

### TypeScript
- **使用場所**: 型定義ファイル（vite-env.d.ts）
- **URL**: https://www.typescriptlang.org/
- **ライセンス**: Apache License 2.0
- **規約**: https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt
- **OKと思った理由**: 
```
Apache License 2.0

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

### HTML5 / CSS3
- **使用場所**: マークアップ・スタイリング
- **URL**: https://www.w3.org/
- **ライセンス**: 標準仕様（商用利用制限なし）
- **規約**: https://www.w3.org/Consortium/Legal/
- **OKと思った理由**: W3C標準仕様は商用利用に制限がありません

## パッケージ管理・ビルドツール

### Node.js / npm
- **使用場所**: パッケージ管理・実行環境
- **URL**: https://nodejs.org/
- **ライセンス**: MIT License
- **規約**: https://github.com/nodejs/node/blob/main/LICENSE
- **OKと思った理由**: 
```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### npm (Node Package Manager)
- **使用場所**: パッケージ管理コマンド（npm install, npm run build等）
- **URL**: https://www.npmjs.com/
- **ライセンス**: Artistic License 2.0
- **規約**: https://github.com/npm/cli/blob/latest/LICENSE
- **OKと思った理由**: 
```
Artistic License 2.0

This license establishes the terms under which a given free software Package may be copied, modified, distributed, and/or redistributed. The intent is that the Copyright Holder maintains some artistic control over the development of that Package, while still keeping the Package available as open source and free software.
```

### SWC (Speedy Web Compiler)
- **使用場所**: Viteプラグインとして高速コンパイル（`@vitejs/plugin-react-swc`）
- **URL**: https://swc.rs/
- **ライセンス**: Apache License 2.0 / MIT License
- **規約**: https://github.com/swc-project/swc/blob/main/LICENSE
- **OKと思った理由**: Apache License 2.0とMIT Licenseの両方で商用利用可能

### Babel (間接的依存関係)
- **使用場所**: 一部の依存関係ライブラリの内部で使用
- **URL**: https://babeljs.io/
- **ライセンス**: MIT License
- **規約**: https://github.com/babel/babel/blob/main/LICENSE
- **OKと思った理由**: 
```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```
- **備考**: 直接的な依存関係ではないが、他のライブラリの内部で使用

### Terser
- **使用場所**: コードの圧縮・最適化（Rollupプラグイン経由）
- **URL**: https://terser.org/
- **ライセンス**: BSD 2-Clause License
- **規約**: https://github.com/terser/terser/blob/master/LICENSE
- **OKと思った理由**: 
```
BSD 2-Clause License

Copyright (c) 2012-2018 Mihai Bazon <mihai.bazon@gmail.com>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
```

### PostCSS
- **使用場所**: CSS処理（Tailwind CSS経由）
- **URL**: https://postcss.org/
- **ライセンス**: MIT License
- **規約**: https://github.com/postcss/postcss/blob/main/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

## TypeScript型定義ライブラリ

### @types/react
- **使用場所**: ReactのTypeScript型定義
- **URL**: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react
- **ライセンス**: MIT License
- **規約**: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### @types/react-dom
- **使用場所**: React DOMのTypeScript型定義
- **URL**: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom
- **ライセンス**: MIT License
- **規約**: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### csstype
- **使用場所**: CSS型定義（@types/reactの依存関係）
- **URL**: https://github.com/frenic/csstype
- **ライセンス**: MIT License
- **規約**: https://github.com/frenic/csstype/blob/master/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

## ユーティリティライブラリ

### js-tokens
- **使用場所**: JavaScriptトークン解析（Babelの依存関係）
- **URL**: https://github.com/lydell/js-tokens
- **ライセンス**: MIT License
- **規約**: https://github.com/lydell/js-tokens/blob/main/LICENSE
- **OKと思った理由**: MIT Licenseで商用利用可能

### picocolors
- **使用場所**: 軽量な色付きコンソール出力（Babelの依存関係）
- **URL**: https://github.com/alexeyraspopov/picocolors
- **ライセンス**: ISC License
- **規約**: https://github.com/alexeyraspopov/picocolors/blob/main/LICENSE
- **OKと思った理由**: ISC Licenseで商用利用可能

## 外部サービス・CDN

### UI Avatars
- **使用場所**: ユーザーアバター画像の自動生成
- **URL**: https://ui-avatars.com/
- **ライセンス**: 商用利用可能なサービス
- **規約**: https://ui-avatars.com/
- **OKと思った理由**: 商用利用可能なパブリックサービス
- **使用例**: ユーザー名からアバター画像を自動生成

### OpenStreetMap Tile Server
- **使用場所**: 地図タイル画像の配信
- **URL**: https://tile.openstreetmap.org/
- **ライセンス**: Open Data Commons Open Database License (ODbL)
- **規約**: https://www.openstreetmap.org/copyright
- **OKと思った理由**: ODbLは商用利用可能（帰属表示必要）
- **使用例**: 地図タイルの表示

### CDNJS (Cloudflare)
- **使用場所**: Leafletマーカーシャドウ画像の配信
- **URL**: https://cdnjs.cloudflare.com/
- **ライセンス**: 各ライブラリのライセンスに従う
- **規約**: https://cdnjs.com/
- **OKと思った理由**: オープンソースライブラリのCDNサービス
- **使用例**: Leafletのマーカーシャドウ画像

## 開発・制作ツール

### Blender
- **使用場所**: 車アイコンの制作
- **URL**: https://www.blender.org/
- **ライセンス**: GNU General Public License v3.0
- **規約**: https://www.blender.org/about/license/
- **OKと思った理由**: GPLライセンスですが、Blenderで作成したアセット（3Dモデル、レンダリング画像）の商用利用は制限されていません

## その他のツール・サービス

### Cloudflare Workers (Wrangler)
- **使用場所**: サーバーレス関数のデプロイ
- **URL**: https://workers.cloudflare.com/
- **ライセンス**: 商用ライセンス
- **規約**: https://www.cloudflare.com/terms/
- **OKと思った理由**: 商用利用可能なプラットフォーム

### Cloudflare Pages
- **使用場所**: フロントエンドアプリケーションのデプロイ・ホスティング
- **URL**: https://pages.cloudflare.com/
- **ライセンス**: 商用ライセンス
- **規約**: https://www.cloudflare.com/terms/
- **OKと思った理由**: 商用利用可能なプラットフォーム

## ライセンス要約

本プロジェクトで使用されているライセンスの種類：

### オープンソースライセンス
1. **MIT License**: React, Vite, Tailwind CSS, Jotai, clsx, PropTypes, Biome, Vite PWA Plugin, Concurrently, Node.js, Leaflet Color Markers, Babel, PostCSS, @types/react, @types/react-dom, csstype, js-tokens
2. **BSD 2-Clause License**: Leaflet, React Leaflet, OSRM, Terser
3. **ISC License**: Leaflet Routing Machine, picocolors
4. **Apache License 2.0**: Firebase SDK, Firebase Realtime Database, Firebase Firestore, TypeScript, SWC
5. **Artistic License 2.0**: npm
6. **GNU General Public License v3.0**: Blender（ツールのみ、作成物は商用利用可能）

### 標準仕様・商用ライセンス
7. **標準仕様**: JavaScript (ECMAScript), HTML5, CSS3
8. **ODbL**: Nominatim (OpenStreetMap), OpenStreetMap Tile Server
9. **商用ライセンス**: Daily.co, Cloudflare Workers, Cloudflare Pages, UI Avatars, CDNJS

### 商用利用可能性
- **✅ 商用利用可能**: MIT, BSD 2-Clause, ISC, Apache 2.0, Artistic License 2.0, 標準仕様
- **⚠️ 注意が必要**: GPL 3.0（Blenderツール自体、作成物は商用利用可能）
- **✅ 商用利用可能**: 商用ライセンスサービス

## 注意事項

- 本プロジェクトはハッカソン用途で作成されており、商用利用を前提としています
- すべてのサードパーティライブラリは適切なライセンスに従って使用しています
- 外部API（OSRM、Nominatim）は利用規約に従って適切に使用しています
- 画像素材（車アイコン）はBlenderで作成し、商用利用可能です
- プログラミング言語（JavaScript, HTML, CSS）は標準仕様で商用利用制限なし
- パッケージ管理ツール（npm）はArtistic License 2.0で商用利用可能
