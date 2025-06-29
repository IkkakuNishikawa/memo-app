# Memo App

Electronベースのクロスプラットフォームメモアプリケーションです。オプション/Altキーの2回押しでグローバルに起動し、音声入力とAI連携機能を備えています。

## 機能

- **グローバルホットキー**: Option（Mac）またはAlt（Windows/Linux）キーを2回押してアプリを起動
- **音声入力**: Web Speech APIを使用した音声からテキストへの変換
- **AI連携**: Claude/GPT APIを使用したメモの処理（要約、翻訳、整理など）
- **自動保存**: メモ内容のローカル保存
- **クロスプラットフォーム**: macOS、Windows、Linux対応

## インストール

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd memo-app
```

2. 依存関係をインストール:
```bash
npm install
```

3. アプリケーションを起動:
```bash
npm start
```

## AI APIの設定

環境変数でAPIキーを設定してください:

```bash
# Claude API（推奨）
export CLAUDE_API_KEY="your-claude-api-key"

# または OpenAI API
export OPENAI_API_KEY="your-openai-api-key"
```

APIキーが設定されていない場合は、モックAI機能が動作します。

## 使用方法

1. Option/Altキーを2回押してアプリを起動
2. テキストエリアにメモを入力
3. 音声入力ボタンで音声からテキスト入力
4. AI指示欄に処理内容を入力（例：「要約して」「翻訳して」「箇条書きにして」）
5. 処理ボタンでAI処理を実行
6. ウィンドウをクリック外に移すと自動的に隠れます

## 開発

開発モードで起動:
```bash
npm run dev
```

ビルド:
```bash
npm run build
```

## 対応プラットフォーム

- macOS 10.13+
- Windows 10+  
- Linux（Ubuntu 18.04+）

## ライセンス

MIT License