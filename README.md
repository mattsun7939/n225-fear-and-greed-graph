# n225-fear-and-greed-graph

日経平均 (Nikkei 225) の「恐怖と強欲指数 (Fear & Greed Index)」の履歴データを可視化する Next.js ダッシュボードアプリケーションです。

## 特徴

- **リアルタイムデータ統合**: Google Drive 上に毎日保存されるセンチメントデータログ (`data_YYYYMMDD.json`) から自動的に時系列データを読み込み、チャートを構築します。
- **インサイト可視化**:
  - 現在のインデックス値とセンチメント判定 (Extreme Fear, Fear, Neutral, Greed, Extreme Greed) を表すサークルゲージ。
  - `recharts` による美麗なグラデーションエリアチャート。
  - 期間フィルタリング (1ヶ月、3ヶ月、全期間)。
- **インジケーター比較**: 各算出要素 (Market Momentum, Stock Price Strength, Breadth, Junk Bond Demand, Volatility, Safe Haven Demand) を選択してグラフ上に同時にプロット可能。
- **ヒストリカル統計**: 選択期間中の平均値、最高値、最安値、および各センチメントゾーンの滞在日数分布を出力。

## セットアップ & 実行方法

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. 開発用サーバーの起動:
   ```bash
   npm run dev
   ```

3. ブラウザでアクセス:
   [http://localhost:3000](http://localhost:3000)

## データ構成

本プロジェクトは以下のディレクトリからデータを読み込みます (優先度順):
1. Google Drive マウントフォルダ: `/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/`
2. ローカルフォールバック (同階層 `fear_and_greed_index_for_jp` 内のログフォルダ): `../fear_and_greed_index_for_jp/public/log`
