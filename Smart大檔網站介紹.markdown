# Smart大檔網站介紹

## 概述
**Smart大檔** 是一個基於雲端的文件共享和資源探索平台，旨在促進社區協作。用戶可以註冊、登錄、上傳文件、分享帶有詳細元數據的帖子，並探索他人創建的內容。該平台注重易用性、響應式設計和安全認證，適合個人和社區用於高效共享和發現資源。

- **目的**：為用戶提供一個安全、友好的環境，用於上傳、管理和探索文件及帖子。
- **目標受眾**：內容創作者、教育工作者、學生以及需要簡單文件共享解決方案的社區。
- **訪問方式**：本地部署後可通過 `http://localhost:3000` 訪問。

## 主要功能
Smart大檔提供了一系列強大的功能，提升用戶體驗和實用性：

1. **用戶認證**：
   - 使用用戶名和密碼進行安全的註冊和登錄。
   - 通過SQLite和本地存儲的令牌進行會話管理。
   - 支持登出功能，並清理會話。

2. **文件和帖子管理**：
   - 上傳包含元數據（名稱、類型、功能、特點、類別、標籤、影響）的帖子。
   - 支持可選的上傳圖片和文件（存儲在 `Uploads` 目錄中）。
   - 以列表或網格模式查看帖子，支持搜索和排序（A-Z、Z-A）。
   - 下載與帖子關聯的文件。

3. **用戶資料管理**：
   - 查看帳戶詳情（用戶名、電子郵件、頭像）。
   - 更新個人資料，包括電子郵件、密碼和頭像。

4. **響應式設計**：
   - 使用Ionic框架打造移動優先的用戶界面，適配多種設備。
   - 網格視圖針對小屏幕（例如390x844）進行優化，使用CSS Grid。
   - 通過側邊欄菜單實現跨頁面一致的用戶界面。

5. **常見問題與支持**：
   - 專用FAQ頁面解答常見問題（例如如何上傳、更改密碼）。
   - 通過側邊欄菜單輕鬆導航至所有功能。

## 技術棧
Smart大檔採用現代網頁技術，構建可擴展且易於維護的架構：

### 前端
- **Ionic框架**：提供移動優先的UI，包含預建組件（例如卡片、模態框、菜單）。
- **HTML/CSS/JavaScript**：網頁結構、樣式和交互的核心技術。
- **CSS Grid**：用於帖子頁面的響應式網格視圖。
- **CDN依賴**：通過jsDelivr託管Ionic及相關庫，確保快速加載。

### 後端
- **Express.js**：Node.js框架，用於處理HTTP請求和路由。
- **TypeScript**：為服務器端代碼添加類型安全，提升可維護性。
- **Multer**：處理文件上傳（圖片和其他文件）的中間件。
- **SQLite3**：輕量級數據庫，用於存儲用戶、會話、帖子和點贊數據。
- **CORS**：啟用跨域請求以支持API訪問。

### 數據庫
- **SQLite3**：基於文件的數據庫，簡單且便攜。
- **模式**：在 `erd.txt` 中定義，可使用 `erd.surge.sh` 可視化。
- **依賴**：`better-sqlite3`、`knex` 和 `auto-migrate` 用於數據庫管理。

### 開發工具
- **npm**：用於安裝依賴的包管理器。
- **ts-node**：直接運行TypeScript代碼，便於開發。
- **Knex**：數據庫遷移的查詢構建器。
- **auto-migrate**：根據 `erd.txt` 自動更新數據庫模式。

## 系統架構
### 數據庫模式
數據庫模式在 `erd.txt` 中定義，包含以下表：

- **user（用戶）**：
  - `id` (主鍵), `username`, `password`, `avatar` (可空), `email` (可空)。
  - 存儲用戶帳戶信息。

- **session（會話）**：
  - `id` (主鍵), `token`, `user_id` (外鍵指向 `user.id`)。
  - 管理用戶認證的活躍會話。

- **post（帖子）**：
  - `id` (主鍵), `user_id` (外鍵指向 `user.id`), `name`, `type`, `function`, `features`, `category`, `tags`, `image` (可空), `file` (可空), `file_name` (可空), `file_type` (可空), `impact` (可空)。
  - 存儲帖子詳情及關聯文件。

- **like（點贊）**：
  - `id` (主鍵), `user_id` (外鍵指向 `user.id`), `post_id` (外鍵指向 `post.id`)。
  - 記錄用戶對帖子的點贊（前端尚未完全實現）。

**關係**：
- 一對多：`user` 對 `session` (`user.id` → `session.user_id`)。
- 一對多：`user` 對 `post` (`user.id` → `post.user_id`)。
- 多對多：`user` 和 `post` 通過 `like` 關聯 (`user.id`, `post.id`)。

**可視化**：
- 使用 `erd.surge.sh` 或 `quick-erd.surge.sh` 從 `erd.txt` 可視化模式。

### 服務器結構
- **入口點**：`server.ts` 初始化Express、SQLite和Multer。
- **路由**：
  - `/register`：創建新用戶。
  - `/login`：認證並生成會話令牌。
  - `/logout`：刪除會話。
  - `/user`：獲取用戶資料數據。
  - `/update-profile`：更新用戶電子郵件、密碼或頭像。
  - `/posts`：獲取所有帖子及其關聯用戶名。
  - `/upload`：處理帖子創建和文件上傳。
  - `/download/:postId`：提供文件下載。
- **文件存儲**：文件存儲在 `Uploads` 目錄中，並在 `post` 表中引用。

## 文件結構
以下是Smart大檔項目的文件結構樹，展示了關鍵文件和目錄：

```
Web_server/
├── public/                   # 靜態前端文件
│   ├── faq.html              # 常見問題頁面
│   ├── index.html            # 首頁，顯示歡迎信息和最近帖子
│   ├── login.html            # 登錄頁面
│   ├── my-account.html       # 用戶帳戶信息頁面
│   ├── posts.html            # 帖子列表/網格視圖頁面
│   ├── register.html         # 註冊頁面
│   ├── settings.html         # 用戶設置頁面
│   └── upload.html           # 帖子上傳頁面
├── Uploads/                  # 存儲上傳的圖片和文件
├── db.sqlite3                # SQLite數據庫文件
├── erd.txt                   # 數據庫模式定義文件
├── package.json              # 項目依賴和腳本配置
├── server.ts                 # 主服務器文件（Express後端）
└── tsconfig.json             # TypeScript配置文件
```

**關鍵文件說明**：
- **public/**：包含所有前端HTML文件，使用Ionic框架構建，提供響應式用戶界面。
- **Uploads/**：動態創建的目錄，用於存儲用戶上傳的圖片和文件。
- **db.sqlite3**：SQLite數據庫文件，存儲用戶、會話、帖子和點贊數據。
- **erd.txt**：定義數據庫模式，可用於可視化工具生成ER圖。
- **package.json**：定義項目依賴（例如Express、Multer）和腳本（例如數據庫遷移）。
- **server.ts**：後端入口，處理HTTP請求、文件上傳和數據庫操作。
- **tsconfig.json**：配置TypeScript編譯選項，確保代碼類型安全。

## 安裝說明
要在本地設置並運行Smart大檔，請按照以下步驟操作：

1. **克隆倉庫**：
   ```bash
   git clone https://github.com/thisismak/Web_server.git
   cd Web_server
   ```

2. **初始化項目**：
   ```bash
   npm init -y
   ```

3. **安裝依賴**：
   ```bash
   npm install express cors bcrypt multer listening-on
   npm install @types/express @types/cors @types/bcrypt @types/multer
   npm install
   ```

4. **設置數據庫**：
   ```bash
   npx auto-migrate db.sqlite3 < erd.txt
   npm run db:update
   ```

5. **運行服務器**：
   ```bash
   npx ts-node server.ts
   ```

6. **訪問網站**：
   - 在瀏覽器中打開 `http://localhost:3000`。
   - 註冊或登錄以訪問所有功能。

**要求**：
- Node.js（v18或更高版本）
- npm
- SQLite3
- Git（用於克隆倉庫）

## 屏幕截圖
以下是關鍵頁面的占位符。請替換為實際截圖以提升視覺吸引力：

- **首頁 (`index.html`)**：顯示歡迎信息和最近帖子。
  - *[插入首頁帶最近帖子網格的截圖]*
- **帖子頁面 (`posts.html`)**：以列表或網格模式顯示帖子，支持搜索/排序。
  - *[插入移動端網格視圖（390x844）的截圖]*
- **上傳頁面 (`upload.html`)**：創建新帖子的表單，支持文件上傳。
  - *[插入上傳表單的截圖]*
- **登錄頁面 (`login.html`)**：簡單的登錄表單，帶註冊鏈接。
  - *[插入登錄表單的截圖]*

## 未來改進
為提升Smart大檔，可考慮以下改進：
- **點贊功能**：在前端完全實現 `like` 表，允許用戶點贊帖子。
- **高級搜索**：在帖子頁面添加類別、標籤或類型過濾。
- **密碼加密**：使用 `bcrypt` 替換明文密碼，增強安全性。
- **分頁**：為帖子頁面實現分頁，處理大數據集。
- **實時更新**：使用WebSockets實現帖子無刷新實時更新。

## 聯繫與倉庫
- **GitHub倉庫**：[https://github.com/thisismak/Web_server](https://github.com/thisismak/Web_server)
- **問題反饋**：在 [https://github.com/thisismak/Web_server/issues](https://github.com/thisismak/Web_server/issues) 報告錯誤或建議功能。
- **聯繫方式**：通過GitHub聯繫以進行合作或諮詢。

---

**Smart大檔** 是一個功能強大、用戶友好的資源共享與探索平台。立即克隆倉庫並體驗其功能！

© 2025 Web Server。版權所有。