# 攝影教學技巧指南

一個多分頁的攝影教學網站：一個「攝影基礎」分頁教曝光、構圖思維、攝影眼這些不分機型的共通原理，
其餘分頁是各台相機的完整操作指南（目前有 RICOH GR IV、DJI Osmo Pocket 4 Pro，之後還會加）。
純靜態網站，無任何建置步驟、無框架、無相依套件——新增一個分頁就是開一個資料夾。

---

## 一、部署到 GitHub Pages

### 步驟

1. 在 GitHub 建一個新的 repository，設為 **Public**。
2. 把**這個資料夾裡的所有檔案與子資料夾**（含 `content/`、`tabs.json`）上傳到 repo 根目錄。
   - 網頁介面：`Add file` → `Upload files` → 把檔案全選拖進去 → `Commit changes`
   - 或用指令：
     ```bash
     git init
     git add .
     git commit -m "攝影教學技巧指南"
     git branch -M main
     git remote add origin https://github.com/<你的帳號>/<repo>.git
     git push -u origin main
     ```
3. 進 repo 的 `Settings` → 左側 `Pages`。
4. **Source** 選 `Deploy from a branch`，**Branch** 選 `main` + `/ (root)`，按 `Save`。
5. 等 1～3 分鐘，網址會出現在同一頁。

### 注意事項

- **所有路徑都是相對路徑**，放在根網域或子目錄都能正常運作，不需要改任何設定。
- `.nojekyll` 這個空檔案**不要刪**。它會讓 GitHub Pages 跳過 Jekyll 處理。
- Service Worker 需要 HTTPS 才能運作。GitHub Pages 預設就是 HTTPS，沒問題。
- 本機測試**一定要**用 HTTP server，不能直接雙擊開檔案（`file://`）——因為章節內容是用 `fetch()` 抓進來組頁的，瀏覽器的同源政策不允許 `file://` 底下的 `fetch`：
  ```bash
  python3 -m http.server 8000
  # 然後開 http://localhost:8000
  ```

---

## 二、架構:殼層 + 一章一檔 + 分頁清單

這是這個網站最重要的設計決定，值得整節說明。

### 為什麼不是一個大 HTML 檔

最早這個網站是單一 `index.html`，31 章的內容全部寫在同一個檔案裡。這在只有一台裝置時沒問題，
但一旦要同時維護多台裝置的完整指南，「一包大 HTML」會有兩個致命缺點：

1. 檔案永遠只會變大，多人協作或用工具改內容時衝突風險高。
2. 每次在中間插入一章，後面所有章節的編號都要手動位移一次——過去這個網站真的因此出過好幾次
   「純文字提到的章節編號沒跟著更新」的錯（見下面〈六、歷史紀錄〉），這是結構性問題，不是
   細心一點就能避免的。

現在的架構把這兩個問題都設計掉了。

### 檔案結構

```
index.html          ← 殼層:側邊欄、搜尋、日夜模式、PWA 註冊,不含任何一章的實際內容
tabs.json           ← 分頁清單(有哪些分頁、各自的資料夾在哪)
manifest.webmanifest
sw.js
caption.html        ← EXIF 貼文產生器(GR IV 專用小工具)

content/
  fund/                          ← 「攝影基礎」分頁
    manifest.json                ← 這個分頁的品牌文字、章節檔名順序
    chapters/
      00-intro.html
      01-exposure-triangle.html
      ...
  griv/                          ← 「GR IV」分頁
    manifest.json
    chapters/
      00-start.html
      01-body-map.html
      ...
  pocket4pro/                    ← 「Pocket 4 Pro」分頁
    manifest.json
    chapters/
      00-overview.html
      01-roadmap.html
```

### `tabs.json` 長什麼樣子

```json
[
  { "id": "fund",       "label": "攝影基礎",     "dir": "./content/fund" },
  { "id": "griv",       "label": "GR IV",         "dir": "./content/griv" },
  { "id": "pocket4pro", "label": "Pocket 4 Pro",  "dir": "./content/pocket4pro" }
]
```

### 每個分頁自己的 `manifest.json` 長什麼樣子

```json
{
  "brand": "RICOH GR IV",
  "h1": "新手完全指南",
  "subtitleHTML": "每一項設定都對照官方繁體中文<br>操作說明書,標明出處頁碼",
  "titleSuffix": "RICOH GR IV 新手完全指南",
  "tool": { "label": "⎘ EXIF 貼文產生器", "tag": "工具", "href": "./caption.html" },
  "files": ["00-start.html", "01-body-map.html", "..."]
}
```

`files` 陣列的**順序就是章節順序**——這是全書唯一決定章節先後的地方。沒有 `tool` 的分頁把這個
欄位設成 `null`（側邊欄就不會顯示工具連結）。

### 每一章的檔案長什麼樣子

跟以前完全一樣的 `<section>` 格式，只是不再需要 `data-ch="N"` 屬性（章節順序改由 manifest 的
`files` 陣列位置決定，不再靠這個屬性）：

```html
<section data-t="章節標題" data-g="所屬分組">
<div class="osd"><span class="hot">…</span><span class="no"></span></div>
<div class="wrap">
<h2 class="ch">章節標題</h2>
…
</div></section>
```

### 章節之間怎麼互相連結

一律用**檔名**當識別碼,不是數字順序:

```html
<!-- 一般內文連到同一個分頁裡的另一章 -->
<a href="#griv:16-customize.html">客製化章節</a>

<!-- 互動診斷章節裡「跳到某一章」的按鈕 -->
<button class="go" data-dx-ch="23-recipes.html">出片配方</button>
```

網址 hash 的格式是 `#分頁id:章節檔名`（例如 `#griv:18-portrait.html`）。這樣設計之後，**在任何
位置插入新章節,都不會弄壞任何一個現有連結**——因為連結指向的是檔名，檔名不會因為前面多了一章
而改變。這是這次重構要解決的核心問題。

（唯一還是會過期的是**純文字寫「見第 N 章」但沒有做成連結**的地方——因為章節在側邊欄跟 OSD
顯示的編號,仍然是 manifest 陣列裡的即時位置,插入新章節還是會讓後面章節顯示的數字往後移一格。
這只是顯示數字跟文案用詞的問題，不會再讓任何連結失效，跟以前「連結本身壞掉」是完全不同等級
的問題。)

### 新增一個章節,要做什麼

1. 在對應分頁的 `content/<分頁>/chapters/` 底下新增一個 `.html` 檔（檔名自訂，不需要接續數字）。
2. 在該分頁的 `manifest.json` 的 `files` 陣列裡，把新檔名加到你想要的順序位置。
3. 完成。不用改 `index.html`，不用手動改任何章節編號，`sw.js` 也不用動（同源請求會自動被離線
   快取，見下一節）。

### 新增一個裝置(分頁),要做什麼

1. 在 `content/` 底下開一個新資料夾,例如 `content/xyz/`。
2. 放一個 `manifest.json`（照上面格式）跟 `chapters/` 資料夾。
3. 在 `tabs.json` 加一行 `{ "id": "xyz", "label": "…", "dir": "./content/xyz" }`。
4. 完成。`index.html` 這支殼層完全不用碰。

### 殼層做的事

`index.html` 剩下的內容只有:側邊欄 DOM、搜尋 modal、日夜切換按鈕、PWA 註冊,以及一支 JS 引擎:

- 讀 `tabs.json`,畫出分頁切換按鈕
- 切換分頁時 `fetch` 該分頁的 `manifest.json`,再平行 `fetch` 每一章的 HTML,注入 `#main`
- 用注入後的實際 DOM 重建側邊欄清單、OSD 編號、上一章/下一章導覽
- 用注入後的實際 DOM 重建搜尋索引(搜尋只在**目前這個分頁**裡搜,這是刻意的——切到 GR IV 分頁
  時,你不會想搜到攝影基礎分頁裡的內容)
- 監聽 `hashchange`:如果 hash 裡的分頁 id 跟目前不同就整個換頁,相同就只是換章節

---

## 三、離線支援(PWA)

**每個分頁、每一章都是離線可讀的。** 第一次連網開啟後,Service Worker 會快取殼層本身
（`index.html`、`caption.html`、`manifest.webmanifest`、圖示檔），之後每瀏覽過一個分頁或章節,
它的 `manifest.json` 跟對應的 HTML 片段也會被快取——這是靠 `sw.js` 既有的「同源靜態檔:快取
優先」規則自動達成的,**不需要**在 `sw.js` 裡手動列出每一章的檔名(那樣反而會製造出另一個「新增
章節要記得同步改某個清單」的陷阱,刻意避免)。

代價是:一個分頁/章節要先被瀏覽過一次才會離線可用——跟這個網站一直以來字型、圖示離線快取的
行為一致。

### 內容更新後的處理

改完任何 `.html` 檔案之後,**一定要把 `sw.js` 裡的 `VERSION` 加一**:

```js
const VERSION = 'gr4-v7';   // 改成 'gr4-v8'
```

不改的話,使用者的瀏覽器會一直拿舊的快取版本。改了之後,使用者下次開啟會看到「有新版本」的
提示,按「重新載入」即可。

---

## 四、全域快速搜尋

### 怎麼開啟

| 方式 | 位置 |
|---|---|
| 側邊欄的「⌕ 搜尋這個分頁」按鈕 | 桌機 |
| 頂端列的 ⌕ 圖示 | 手機 |
| `⌘K` / `Ctrl+K` | 鍵盤 |
| `/` | 鍵盤 |

`↑` `↓` 選擇、`Enter` 開啟、`Esc` 關閉。點進去之後,命中的字會在內文中以綠色高亮標出並自動
捲到該處。**搜尋範圍是目前這個分頁**,切換分頁後索引會重建。

### 搜尋的三層設計

中文沒有空白可以斷詞,所以這裡沒有用一般的分詞搜尋,而是**子字串比對加上加權評分**。索引在每次
切換分頁時從當下注入的 DOM 即時重建,改內容後搜尋會自動同步。

**L1 — 字面比對**,依命中位置給不同權重(章節標題 10、h3/h4 5、選單路徑 4、表格 2、內文 1)。

**L2 — 同義詞與口語別名**(`SYN` 表,權重 0.65)。**L3 — 症狀直達**(`SYMPTOM` 規則,直接把對應
章節推到第一位並標上徽章)。這兩張表都在 `index.html` 的 `<script>` 區塊裡,目前以 GR IV 用語
為主——放在全域(不分分頁)是刻意的,反正只有命中同一分頁裡的章節時才會生效,不會造成任何錯誤
結果,只是還沒有針對其他分頁客製化。之後想讓某個分頁有專屬的同義詞表,可以把 `SYN`/`SYMPTOM`
改成依 `activeTab.id` 分開的物件。

```js
var SYN = {
  '你的口語說法': ['真正使用的詞1', '真正使用的詞2'],
};
var SYMPTOM = [
  { q:['症狀關鍵字1','症狀關鍵字2'], to:['章節標題片段'], why:'徽章文字' },
];
```

`to` 是用**章節標題的片段**去比對,不是編號或檔名——所以增刪章節不會壞掉。

---

## 五、互動診斷章節(GR IV 分頁)

GR IV 分頁最後一章「互動診斷:現在該調什麼」是全書唯一的互動章節,分兩個模組:症狀診斷器(兩層
決策樹,最多點兩下就到答案)跟濾鏡風格選擇器(從「想要什麼感覺」反查 14 種影像控制)。

**這一章不產生任何新的事實主張**,只把已標註出處的其他章節內容重新組織成互動流程。

### 怎麼擴充

問題與答案卡**全部是靜態 HTML**,JS 只負責切換 `hidden`。要加一個新分支只要三步:

```html
<!-- 1. 在某一層問題裡加一個選項,data-dx-go 指向新卡片的 id -->
<button class="dxo" type="button" data-dx-go="rMyCase">我的新症狀</button>

<!-- 2. 在同一個 .dx 容器裡加對應的答案卡 -->
<div class="dxr" data-dx-card="rMyCase" tabindex="-1" role="region" hidden>
<h4>標題</h4>
<div class="row"><span class="k">立刻做</span><div class="v">…</div></div>
<!-- 3. 想連回原章節就加這個按鈕,值是目標章節的檔名(不是編號) -->
<div class="row"><span class="k">想懂為什麼</span>
  <div class="v"><button class="go" type="button" data-dx-ch="06-iso.html">ISO 感光度</button></div></div>
</div>
```

不需要改任何 JS。`data-dx-go` 可以指向另一層問題(`data-dx-step`)或一張答案卡(`data-dx-card`)。
`data-dx-ch` 一律填**目標章節的檔名**(見 `content/griv/chapters/`),這是這次重構把它從數字
索引改過來的地方——之前用數字索引時,插入新章節會讓所有 `data-dx-ch` 的數字全部作廢,現在用
檔名就完全不會。

---

## 六、歷史紀錄:重構前的章節位移問題(僅供參考)

在改成「殼層 + 一章一檔」架構之前,這個網站是單一 `index.html`,章節順序靠 `data-ch="N"` 屬性
跟陣列位置決定,插入章節必須手動把後面所有章節重新編號,並逐一核對:

- 側邊欄的 OSD 編號、章節清單(這兩個其實一直是自動算的,不用手改)
- 互動診斷裡的 `data-dx-ch="N"` 跳轉按鈕(數字,不是檔名)
- 一般內文的 `<a href="#cN">` 跨章連結(數字,不是檔名)
- **純文字寫「第 N 章」但沒有做成連結的地方**——這一類最容易漏掉,因為前三種都能用 grep 抓到,
  純文字提及沒有固定格式可抓

這段歷史上發生過兩次插入(「M 模式全攻略」插在客製化章節之後、「人像客製化」又插在 M 模式
之後),每次都造成後面所有章節編號位移一格,也都在事後審查時抓到好幾處被漏掉的純文字章節
提及(例如「見第 14 章」實際上早就該是「見第 16 章」)。

**這次重構(改成檔名識別 + manifest 陣列順序)把前三種問題徹底解決了**——連結永遠指向檔名,
插入章節不會讓任何連結失效。純文字提及仍然可能因為顯示編號改變而過期,但那只是文案用詞問題,
不會讓任何人點到死連結,是完全不同量級的風險。

---

## 七、EXIF 貼文產生器(`caption.html`)

GR IV 分頁專用的獨立小工具頁,從 GR IV 分頁的「選片與整理」章進入。丟一張照片進去,讀出檔案裡
的 EXIF,產生一段可以直接貼到 IG 的文案。

### 隱私

**沒有伺服器,照片不會被上傳。** 讀檔、解析、產文字全部在瀏覽器內完成,關掉網路也能用。

如果照片帶 GPS 座標,工具會跳出警告提醒使用者,而**產生的文案永遠不含座標**。

### EXIF 解析是自己寫的

沒有用 `exifr` 之類的套件,而是在 `caption.html` 裡實作了一個最小的 EXIF 讀取器(約 130 行)。
理由:維持整站「無框架、無相依套件」的原則、CDN 套件會破壞離線能力、只需要十幾個標籤不用殺雞
用牛刀。支援 JPEG(掃描 APP1 區段)、DNG/TIFF(檔頭本身就是 TIFF),大端小端都支援;**不支援
HEIC**(容器格式完全不同,頁面會提示怎麼轉檔)。

**讀不到「影像控制」(濾鏡色調)是正常的** — 那是 Ricoh 寫在自家 MakerNote 專屬欄位裡的資料,
不在標準 EXIF 中。

### 四種文案樣板

樣板都在 `caption.html` 的 `TPL` 物件裡(標準 / 極簡 / 詳細 / 英文),每個是一個
`function(d, o)`。要加一種樣式就在 `TPL` 加一個 key,再到 `.tabs` 加一顆對應 `data-style` 的
按鈕即可。

### 跟指南互相往返

指南側邊欄(GR IV 分頁)的「EXIF 貼文產生器」按鈕會把**目前分頁+章節**帶在網址上
(`caption.html?from=griv:21-file-management.html`),工具頁左上角的「← 回指南」就會回到那一章,
不會跳回開頭。

### 不做自動發文

Instagram 的官方 Graph API 只開放給 Business / Creator 帳號,且需要通過 Meta 的 App Review;
個人帳號沒有合法的自動發文管道。這個工具做到「產生文案 + 一鍵複製」為止。

---

## 八、其他功能

- **日間 / 夜間模式**:側邊欄與頂端列的「顯示」按鈕,循環切換 `自動 → 日間 → 夜間`。
- **RWD**:手機、平板、桌機、橫式直式都做過處理,含 iPhone 瀏海與底部安全區(safe-area)。
- **列印**:直接列印會輸出目前分頁的全部章節,每章分頁,自動隱藏側邊欄、搜尋介面與分頁切換列。
  互動診斷章節的操作介面會自動收起,答案卡全部展開,印出來是一份完整的平鋪對照表。
- **網址分享**:每個分頁的每一章都有自己的 hash(例如 `#griv:22-scenario-lookup.html`),可以
  直接分享到特定分頁的特定章節。

---

## 九、檔案清單

| 檔案/資料夾 | 用途 | 可否刪除 |
|---|---|---|
| `index.html` | 殼層:側邊欄、搜尋、日夜模式、PWA 註冊、多分頁載入引擎 | 否 |
| `tabs.json` | 分頁清單 | 否 |
| `content/<分頁>/manifest.json` | 該分頁的品牌文字與章節檔名順序 | 否(每個分頁各一份) |
| `content/<分頁>/chapters/*.html` | 該分頁實際的章節內容 | 視內容而定 |
| `caption.html` | EXIF 貼文產生器(GR IV 專用工具頁) | 可,但要一併移除 GR IV 分頁裡的連結與 `sw.js` 的相關說明 |
| `manifest.webmanifest` | PWA 設定:名稱、圖示、啟動方式 | 否 |
| `sw.js` | Service Worker:離線快取 | 否 |
| `icon-192.png` / `icon-512.png` | 應用程式圖示 | 否 |
| `icon-maskable-512.png` | Android 自適應圖示 | 否 |
| `apple-touch-icon.png` | iOS 主畫面圖示 | 否 |
| `.nojekyll` | 關閉 GitHub Pages 的 Jekyll 處理 | 否 |
| `README.md` | 這份說明 | 可 |

---

## 授權與聲明

本站為個人學習整理,**非任何廠商的官方文件**,與 RICOH IMAGING COMPANY, LTD.、DJI 均無隸屬
關係。所引用之產品名稱與商標均屬各自公司所有。

GR IV 分頁內容中標示為「說明書 p.XX」者出自 RICOH 官方繁體中文操作說明書;標示為「官方/媒體
規格」者(例如 Pocket 4 Pro 分頁)整理自官方產品頁與媒體評測報導,DJI 未提供逐頁的公開說明書
可供引用;標示為第三方來源者為各作者的公開分享;標示為「本站建議」者是本站自行綜合整理的教法
或建議,不是任何廠商的官方主張。詳細出處請見 GR IV 分頁裡的〈別人怎麼設(附出處)〉章。
