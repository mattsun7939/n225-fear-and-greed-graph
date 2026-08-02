# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) への指針を提供します。

## Next.jsのバージョンに関する注意

本プロジェクトの `AGENTS.md` に以下の警告があります: 「これはあなたの知っているNext.jsではない — バージョンが異なり破壊的変更があるため、コードを書く前に `node_modules/next/dist/docs/` のガイドを読み、非推奨通知に注意すること」。フロントエンドのコードを編集する前に必ず確認してください。

## プロジェクト概要

日経平均 (Nikkei 225) の「恐怖と強欲指数 (Fear & Greed Index)」の履歴データを可視化する Next.js ダッシュボードアプリケーションです。同ワークスペースの `fear_and_greed_index_for_jp` が生成する日次ログ（`data_YYYYMMDD.json`）を読み込んで時系列チャート化する**表示専用**アプリで、こちら側にもスコア算出用の履歴補完・再取得スクリプトを別途持っています。

## コマンド

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

データメンテナンス用スクリプト（`scripts/`、`npm run` には登録されておらず `node scripts/xxx.js` で直接実行する）:
```bash
node scripts/update-history-prices.js    # 日経平均の価格履歴をYahoo Financeから再取得してログに反映
node scripts/update-history-jpx.js       # 騰落レシオ・新高値安値をnikkei225jp.comから再取得
node scripts/update-history-margin.js    # 信用評価損益率を再取得
node scripts/update-history-vi.js        # 日経平均VI(ボラティリティ指数)を再取得
node scripts/interpolate-missing-dates.js  # 欠損日のログを前後日から補間生成
```
自動テストは設定されていません。

## アーキテクチャ

**データソース**: 独自のデータ取得スクリプトは持たず（フェッチ自体は `fear_and_greed_index_for_jp/scripts/fetchData.js` が担当）、`src/app/page.js` の `getFearAndGreedHistory()` が以下の優先順でログディレクトリを探して読み込む:
1. `/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/`（Chromebook上のGoogle Driveマウント、本番想定）
2. `../fear_and_greed_index_for_jp/public/log`（ローカルフォールバック、同階層に `fear_and_greed_index_for_jp` が無いと機能しない）

いずれも存在しなければ空配列を返しダッシュボードは空表示になる。`export const dynamic = 'force-dynamic'` によりビルド時ではなくリクエスト時に毎回ファイルシステムを読み直す。

`page.js` は各 `data_*.json` の `indicators` 配列（`{name, score, ...}` の配列）を、`name` をスネークケース化したキー（例: `"Market Momentum"` → `market_momentum`）にフラット化してからチャート用オブジェクトへ整形する。指標名を変更する場合、このキー正規化ロジック（括弧除去→トリム→空白をアンダースコアに→小文字化）と `Dashboard.js` 側の参照キーの両方を揃える必要がある。

**`src/components/Dashboard.js`**（約570行、クライアントコンポーネント）— タイムフレーム切り替え（1M/3M/ALL）、指標の表示/非表示トグル、日経平均株価との重ね描画、ホバー時の詳細表示などを `useState`/`useMemo` で管理する単一の大きめコンポーネント。`sentimentColors` / `indicatorDetails` などの表示用マッピングをここで定義しているため、指標を追加/変更する際は `page.js` のキー正規化ロジックと合わせてここも更新が必要。

**`scripts/*.js`** — いずれも `fear_and_greed_index_for_jp/scripts/fetchData.js` とは独立した、既存ログ（Google Driveディレクトリ内の `data_*.json` 群）を**事後的に上書き・補完**するための単発実行スクリプト群:
- `update-history-prices.js` / `update-history-jpx.js` / `update-history-margin.js` / `update-history-vi.js` は、既存ログファイルの日付範囲を調べてYahoo Financeまたは `nikkei225jp.com`（`fear_and_greed_index_for_jp/scripts/fetchData.js` と同じ `vm.runInContext()` によるスクレイピング手法）から該当期間のデータを再取得し、各ログファイルの対応フィールドを書き換える。指標の計算式を過去に遡って修正・再計算したい場合に使う想定。
- `interpolate-missing-dates.js` は、ログファイルが存在しない日付（休日以外の欠損）を前後の値から補間して新規ログファイルを生成する。
- いずれも `DRIVE_DIR`（`/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/`）を直接ハードコードしており、Google Driveマウントが存在しない環境では `process.exit(1)` する。ローカル開発機で実行する場合は事前にマウント状況を確認すること。

## ドキュメント

`AGENTS.md`（`CLAUDE.md` から `@AGENTS.md` として参照されるのではなく、本ファイル冒頭に転記済み）以外に、専用の `docs/` ディレクトリはありません。
