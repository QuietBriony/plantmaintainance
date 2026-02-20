# Garden-QA Engine (Okinawa)

静的ファイルだけで動く、沖縄向けの造園Q&Aサンプルです。

## ファイル構成
- `index.html` : GitHub Pages ルート用のエントリ（`plantmaintainance-index.html`へ自動遷移）
- `plantmaintainance-index.html` : 画面本体
- `plantmaintainance-style.css` : スタイル
- `plantmaintainance-main.js` : 検索ロジック
- `plantmaintainance-db.json` : Q&Aデータ

## ローカル起動
```bash
python -m http.server 8000
```

`http://localhost:8000/` を開くとアプリ画面に遷移します。

## GitHub Pages 公開メモ
- Pages の Source をこのリポジトリ / ブランチ / ルートに設定
- ルート URL (`https://<user>.github.io/<repo>/` または user site の `/`) に `index.html` が必要
- 反映直後はキャッシュで古い 404 が残ることがあるため、再読み込み推奨
