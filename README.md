<div align="center">
  <img width="1200" height="475" alt="Japanese SRS Learning System" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  # Japanese SRS Learning System
  **專業級日語間隔複習解決方案**
</div>

---

## 專案簡介 (Introduction)
Japanese SRS Learning System 是一款整合現代 Web 技術與認知心理學理論的日語學習工具。本專案核心基於 **間隔複習算法 (Spaced Repetition System)**，結合 **Google Gemini 1.5 系列大語言模型**，旨在為進階日語學習者提供一個高效、可自定義且具備深度文法解析能力的複習環境。

---

## 核心技術特色 (Technical Features)

### 1. 智慧文法與語境解析 (AI Analysis)
透過整合 Google Gemini API，本系統可對卡片內容進行即時語義分析，提供包含詞性說明、文法結構及情境例句在內的深層解析，協助學習者理解語言的細微差異。

### 2. 優化之視覺呈現 (Visual Optimization)
*   **多層級顯示架構**：針對日語特點，前端界面支援「漢字+標註」的雙層顯示模式，提升閱讀流暢度。
*   **深色擬態介面**：採用低疲勞感的深海藍調與玻璃擬態 (Glassmorphism) 設計，適合長時間的高強度學習。

### 3. 多樣化數據接入 (Data Integration)
*   **結構化數據轉換**：系統具備強大的 CSV 與 XLSX 解析能力，支援多欄位自定義映射。
*   **預載教材庫**：內建標準教材（如《大家的日本語》）數據接口，支援快速部署練習。

---

## 技術棧 (Technology Stack)

*   **開發框架**：React 19, TypeScript
*   **構建工具**：Vite 6
*   **樣式處理**：Tailwind CSS v4
*   **數據處理**：SheetJS (XLSX)
*   **人工智慧**：Google Gemini AI API (@google/genai)
*   **音訊技術**：瀏覽器原生 Web Speech API

---

## 數據結構規範 (Data Schema)

為了確保數據能正確解析，匯入檔案建議遵循以下 Schema 結構：

| 欄位索引 | 功能描述 | 資料類型 | 備註 |
| :--- | :--- | :--- | :--- |
| 0 | **項目類別** | String | 用於單元或教材分類 |
| 1 | **正面主文字** | String | 卡片核心內容 (如: 漢字) |
| 2 | **正面副文字** | String | 輔助標註 (如: 讀音、假名) |
| 3+ | **背面詳細內容** | Array | 定義、意義、例句等 |

---

## 系統快捷鍵說明 (Keyboard Shortcuts)

本系統針對生產力進行深度優化，支援全鍵盤操作以維持學習心流：

| 按鍵 | 功能說明 |
| :--- | :--- |
| **Space** | 翻轉卡片 / 切換正反面 |
| **Enter** | 觸發語音朗讀 |
| **1 ~ 4** | SRS 記憶分級回饋 (Again, Hard, Good, Easy) |
| **Left / Right** | 循序瀏覽上一張或下一張卡片 |
| **A** | 召喚 AI 老師進行深度解析 |

---

## 部署與開發 (Development & Deployment)

1.  **安裝依賴**
    ```bash
    npm install
    ```
2.  **環境配置**
    於項目根目錄建立 `.env` 文件：
    `VITE_GEMINI_API_KEY=your_api_key_here`
3.  **執行開發環境**
    ```bash
    npm run dev
    ```

---

*Copyright © 2026. Designed for efficient language acquisition.*

