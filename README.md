<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🇯🇵 學習閃卡複習 Pro (Japanese Flashcards Pro)

這是一個專為日文學習者打造的高級數位閃卡應用程式。結合了 **深色質感 UI**、**間隔複習 (SRS)** 與 **快速開始數據庫**，讓你專注於效率與記憶。

> [!IMPORTANT]
> **2026 最新更新**：支援雙層正面排版（漢字+讀音）與首頁快速開始按鈕。

## ✨ 核心特色

- 🚀 **快速開始 (Quick Start)**：首頁內建「大家的日本語」與「基礎常用短句」數據庫，一鍵開練。
- 📥 **自動分類導入**：支援 `.csv` 與 `.xlsx` 格式，自動依據第一欄內容進行課程分組。
- 👁️ **雙層視覺設計**：卡片正面支援「主文字」與「副標題」雙層顯示，完美呈現漢字與平假名。
- 🧠 **間隔複習 (SRS)**：內建 Anki 風格的記憶分級（Again, Hard, Good, Easy），智慧追蹤學習進度。
- 🔊 **Web Speech TTS**：整合語音朗讀，點擊或按鍵即可聆聽純正日文發音。
- 🧙‍♂️ **Gemini AI 助手**：一鍵召喚 AI 老師進行詳細的文法解析與例句補充。
- 💾 **本地持久化**：進度自動儲存於瀏覽器，隨時中斷，隨時繼續。

## 🛠️ 技術棧

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (v4) + Glassmorphism Design
- **Icons**: Lucide React
- **Data**: SheetJS (xlsx)
- **AI Integration**: Google Gemini API (@google/genai)

## ⚙️ 快速開始

### 前置作業
- 安裝 [Node.js](https://nodejs.org/)
- 獲取 [Gemini API Key](https://aistudio.google.com/app/apikey)

### 安裝步驟

1. **安裝套件**
   ```bash
   npm install
   ```

2. **設定環境變數**
   建立 `.env` 檔案並填入：
   ```env
   VITE_GEMINI_API_KEY=你的_GEMINI_API_KEY
   ```

3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
   預設透過 `http://localhost:5173` 或自定義端口訪問。

## 📖 檔案匯入指南 (CSV/Excel)

為了達到最佳顯示效果，請確保您的檔案符合以下欄位結構：

| 欄位 | 內容說明 | 備註 |
| :--- | :--- | :--- |
| **第 1 欄** | **類別/課程** | 用於首頁課程篩選 (例如: Lesson 1) |
| **第 2 欄** | **卡片正面 (主)** | 顯示在上方的大字 (例如: 漢字) |
| **第 3 欄** | **卡片正面 (副)** | 顯示在下方的小字 (例如: 讀音/平假名) |
| **第 4 欄+** | **卡片背面** | 定義、含義、例句等詳細資訊 |

## ⌨️ 鍵盤快捷鍵

| 按鍵 | 功能 |
| :--- | :--- |
| `Space` | **翻轉卡片** (正面 / 背面) |
| `Enter` | **朗讀語音** |
| `1` | **Again**: 忘記了，立刻重新複習 |
| `2` | **Hard**: 很吃力，增加出現頻率 |
| `3` | **Good**: 掌握良好，移至隊列後方 |
| `4` | **Easy**: 太簡單，標記學會並暫時移除 |
| `←` / `→` | 瀏覽上一張 / 下一張 |

---

> [!TIP]
> 點擊卡片右上角的 **AI 解析** 按鈕（或使用快捷鍵 `A`），AI 就會針對目前的內容提供深入的日語學習建議。

