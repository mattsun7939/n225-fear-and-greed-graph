# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) への指針を提供します。

## Next.jsのバージョンに関する注意

本プロジェクトの `AGENTS.md` に以下の警告があります: 「これはあなたの知っているNext.jsではない — バージョンが異なり破壊的変更があるため、コードを書く前に `node_modules/next/dist/docs/` のガイドを読み、非推奨通知に注意すること」。フロントエンドのコードを編集する前に必ず確認してください。

## プロジェクト概要

日経平均 (Nikkei 225) の「恐怖と強欲指数 (Fear & Greed Index)」の履歴データを可視化する Next.js ダッシュボードアプリケーションです。同ワークスペースの `fear_and_greed_index_for_jp` が生成する日次ログ（`data_YYYYMMDD.json`）を読み込んで時系列チャート化する**表示専用**アプリで、こちら側にもスコア算出用の履歴補完・再取得スクリプトを別途持っています。

## コマンド

```bash
npm install
npm run dev      # http://localhost:3000（.env.localのPORTで変更可、デフォルト3000）
npm run lint
npm run build
```

`npm run dev` / `npm run start` は直接 `next` を呼ばず、`run-server.js` 経由で起動する。このスクリプトが `.env.local`（無ければ `.env`）内の `PORT=` を正規表現で抽出し `next dev/start -p <PORT>` として渡す。Next.js自身も`.env.local`を自動読み込みするが、それはCLIのポート決定より後に走るため、ポート番号だけはこの薄いラッパー経由にしている（`ch-cast-reviews-analyzer/frontend/run-server.js` と同じパターン）。`next build` はポート待受を行わないため素通しで `next build` を実行する。

データメンテナンス用スクリプト（`scripts/`、`npm run` には登録されておらず `node scripts/xxx.js` で直接実行する）:
```bash
node scripts/update-history-prices.js    # 日経平均の価格履歴をYahoo Financeから再取得してログに反映
node scripts/update-history-jpx.js       # 騰落レシオ・新高値安値をnikkei225jp.comから再取得
node scripts/update-history-margin.js    # 信用評価損益率を再取得
node scripts/update-history-vi.js        # 日経平均VI(ボラティリティ指数)を再取得
node scripts/interpolate-missing-dates.js  # 欠損日のログを前後日から補間生成
```
自動テストは設定されていません。

## CI

`.github/workflows/fossa-analysis.yml` — `main`/`master` への push と pull request をトリガーに FOSSA でライセンス・脆弱性スキャンを実行する（`test: true` のためポリシー違反時はCIを落とすQuality Gate構成）。言語・パッケージマネージャのセットアップステップは未設定のままコメントアウトされている。

## アーキテクチャ

**データソース**: 独自のデータ取得スクリプトは持たず（フェッチ自体は `fear_and_greed_index_for_jp/scripts/fetchData.js` が担当）、`src/app/page.js` の `getFearAndGreedHistory()` が以下の優先順でログディレクトリを探して読み込む:
1. `driveDir`（環境変数 `DRIVE_DIR` で設定。コード側にデフォルト値は持たない）— 設定されておらず、または存在しないパスの場合は2にフォールバック
2. `../fear_and_greed_index_for_jp/public/log`（ローカルフォールバック、同階層に `fear_and_greed_index_for_jp` が無いと機能しない）

`DRIVE_DIR` は `.env.local`（`.env.example` をコピーして作成、git管理対象外）で設定する。Next.js側（`page.js`）は自動読み込みされるため追加設定不要だが、`scripts/*.js` は Next.js CLIを経由しない単発実行のため `scripts/env.js`（共有の軽量`.env.local`ローダー、外部ライブラリ非依存）を介して同じ値を取得する。両者ともコード上に本番パスのデフォルト値は埋め込まれていない（環境依存の値をリポジトリに含めない方針）。

いずれも存在しなければ空配列を返しダッシュボードは空表示になる。`export const dynamic = 'force-dynamic'` によりビルド時ではなくリクエスト時に毎回ファイルシステムを読み直す。

`page.js` は各 `data_*.json` の `indicators` 配列（`{name, score, ...}` の配列）を、`name` をスネークケース化したキー（例: `"Market Momentum"` → `market_momentum`）にフラット化してからチャート用オブジェクトへ整形する。指標名を変更する場合、このキー正規化ロジック（括弧除去→トリム→空白をアンダースコアに→小文字化）と `Dashboard.js` 側の参照キーの両方を揃える必要がある。

**`src/components/Dashboard.js`**（約570行、クライアントコンポーネント）— タイムフレーム切り替え（1M/3M/ALL）、指標の表示/非表示トグル、日経平均株価との重ね描画、ホバー時の詳細表示などを `useState`/`useMemo` で管理する単一の大きめコンポーネント。`sentimentColors` / `indicatorDetails` などの表示用マッピングをここで定義しているため、指標を追加/変更する際は `page.js` のキー正規化ロジックと合わせてここも更新が必要。

**`scripts/*.js`** — いずれも `fear_and_greed_index_for_jp/scripts/fetchData.js` とは独立した、既存ログ（Google Driveディレクトリ内の `data_*.json` 群）を**事後的に上書き・補完**するための単発実行スクリプト群:
- `update-history-prices.js` / `update-history-jpx.js` / `update-history-margin.js` / `update-history-vi.js` は、既存ログファイルの日付範囲を調べてYahoo Financeまたは `nikkei225jp.com`（`fear_and_greed_index_for_jp/scripts/fetchData.js` と同じ `vm.runInContext()` によるスクレイピング手法）から該当期間のデータを再取得し、各ログファイルの対応フィールドを書き換える。指標の計算式を過去に遡って修正・再計算したい場合に使う想定。
- `interpolate-missing-dates.js` は、ログファイルが存在しない日付（休日以外の欠損）を前後の値から補間して新規ログファイルを生成する。
- いずれも `scripts/env.js` 経由で `DRIVE_DIR` を取得する。`DRIVE_DIR`（`.env.local`または環境変数）が未設定の場合、`scripts/env.js` がエラーメッセージを出して `process.exit(1)` する（page.js と異なりローカルフォールバックは持たない）。ローカル開発機で実行する場合は事前に `.env.local` へ `DRIVE_DIR` を設定すること。

## ドキュメント

`AGENTS.md`（`CLAUDE.md` から `@AGENTS.md` として参照されるのではなく、本ファイル冒頭に転記済み）以外に、専用の `docs/` ディレクトリはありません。

- `README.md` — 機能一覧・データフローのmermaid図・セットアップ手順・`scripts/`一覧・ディレクトリ構成を日本語でまとめた利用者向けドキュメント。内容は本ファイルとも矛盾なく、実装が変わったら両方の更新が必要。
- `SECURITY.md` — GitHubテンプレートの雛形のまま（バージョン表・報告手順ともプレースホルダ）で、このプロジェクト固有の内容には未編集。参照する価値はない。
