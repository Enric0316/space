這份辦公室後台點位設定 APP (Office Admin App) 的架構，將專注於大螢幕操作的精確度與批次作業效率。為了確保點位在不同裝置間「永不位移」，我們將採用 「相對比例座標」 邏輯 111。
以下是建議的後台 APP 架構與技術規格：
一、 畫面導航架構 (UI Structure)
1. Screen_Admin_Nav (後台導航頁)
●	功能：選擇要維護的工程範圍。
●	控制項：
○	棟別/樓層下拉選單：讀取 L1 - 戶別樓層。
○	圖面狀態顯示：顯示該樓層目前已設定的點位總數 2。
●	動作：選定後 Maps 至設定頁。
2. Screen_Admin_Editor (點位編輯大頁面)
●	配置：平板/電腦版橫式佈局 (16:9)。
●	左側 (地圖區)：佔據畫面 70% 寬度，顯示大型平面圖與網格感應層 3。
●	右側 (屬性區)：佔據畫面 30% 寬度，顯示選中點位的詳細資料卡與儲存按鈕 4。
________________________________________
二、 核心技術：網格感應器 (Grid Sensor) 規格 5
為了在大螢幕上精確捕捉位置，我們將採用 40x40 巢狀網格 方案：
1.	網格結構： 6
○	外層圖庫 (gal_Grid_Rows)：垂直圖庫，筆數設定為 40。
○	內層圖庫 (gal_Grid_Cols)：水平圖庫，筆數設定為 40。
○	感應元件：每個格子內放置一個 透明按鈕 (btn_Sensor) 7。
2.	座標換算公式 (關鍵點)： 8
○	當管理者點擊格子時，系統計算該格在 40x40 網格中的相對位置。
○	X 座標計算：(Mod(此格編號 - 1, 40) + 0.5) / 40 9。
○	Y 座標計算：(RoundDown((此格編號 - 1) / 40) + 0.5) / 40 10。
○	結果：產出 $0.0 \sim 1.0$ 之間的小數（例如：0.55），並存入 L1b 的 PointX 與 PointY 11。
________________________________________
三、 為什麼點位「不會跑掉」？ (技術合規性) 121212
關於您的擔心，這套架構透過以下機制確保點位的一致性：
●	比例鎖定：我們不儲存螢幕上的「像素位置」（Pixels），而是儲存「圖片寬/高的百分比」 13。
●	容器連動：在前台與後台 APP 中，地圖容器的高度都會根據圖片原始比例自動縮放 14：
○	Height = Width * (Image.OriginalHeight / Image.OriginalWidth) 15。
●	還原邏輯：無論頁面大小，點位的顯示位置永遠是 PointX * 當前地圖寬度 16。這保證了在 27 吋螢幕設定的點，在 6 吋手機上看也會在同一個位置 17。
________________________________________
四、 後台專屬：批次作業功能
既然在辦公室操作，建議加入以下「懶人功能」以節省時間：
1.	點位鏡像/複製 (Clone Logic)： 18
○	提供一個按鈕「複製此樓層點位至...」。
○	管理者可勾選其他格局相同的戶別，系統自動將 L1b 的點位資料大量派發過去。
2.	空間名稱快速標籤 (Quick Label)：
○	預設常用標籤（如：玄關、客廳、主臥 A 牆） 19。
○	點擊地圖後，點選標籤即可快速完成命名，不需手動打字。












1141224 架構更新
這份完整架構文件是根據您提供的《M365 品管系統標準規格書》、《SharePoint 資料架構》與《Power Apps 架構》文件彙整而成。此文件將作為系統開發的「施工藍圖」，包含詳細的資料庫欄位設計與 APP 畫面邏輯。
________________________________________
M365 品管系統 (GEMS) - Power Apps 完整系統架構與欄位規格書
本系統採用 「中樞與分支 (Hub-and-Spoke)」 架構：
1.	資料中樞 (SharePoint Hub)：標準化清單結構。
2.	後台 APP (Office Admin)：負責地圖與點位座標設定 (L1b)。
3.	前台 APP (Field Inspection)：負責現場查驗與驗收 (L3)。
________________________________________
第一部分：SharePoint 資料架構 (Data Center)
所有清單 (Lists) 需建立於指定的 SharePoint 網站中。以下為欄位詳細規格：
1. 基礎空間資料 (Foundation)
清單名稱	用途	欄位名稱 (內部名稱)	類型	備註/關聯
L0 - 平面圖庫	儲存底圖	標題 (Title)	單行文字	例：A-1F
		棟別 (Building)	選擇/文字	
		樓層 (Floor)	選擇/文字	
		平面圖 (MapImage)	圖片/超連結	1
L1 - 戶別樓層	專案根目錄	樓層戶別 (Title)	單行文字	例：A-3F-01 (作為唯一 Key)
		棟別 (Building)	單行文字	2
		樓層 (Floor)	單行文字	
		狀態 (Status)	選擇	點交/未點交
L1b - 空間座標主檔	固定點位定義	點位名稱 (Title)	單行文字	例：客廳-主牆 3
		樓層戶別 (UnitRef)	查閱 (Lookup)	關聯至 L1 4
		PointX	數字	0.0 ~ 1.0 (相對比例) 5
		PointY	數字	0.0 ~ 1.0 (相對比例)
		空間屬性 (SpaceType)	選擇	戶內/公設/機房 6
2. 標準化工程目錄 (Catalog)
此目錄支援下拉選單連動，避免手動輸入錯誤。
| 清單名稱 | 用途 | 欄位名稱 | 類型 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| L2 - 工項目錄 | 主階段分類 | 主工項 (Title) | 單行文字 | 例：07 門窗工程 7 |
| L2a - 次工項目錄 | 細項分類 | 次工項 (Title) | 單行文字 | 例：木門框 8 |
| | | 主工項關聯 (MainCat) | 查閱 (Lookup) | 關聯至 L2 |
| L2b - 缺失項目目錄 | 標準缺失庫 | 缺失內容 (Title) | 單行文字 | 例：表面刮傷 9 |
| | | 次工項關聯 (SubCat) | 查閱 (Lookup) | 關聯至 L2a |
| | | 責任廠商 (Vendor) | 單行文字 | |
3. 查驗紀錄資料庫 (Transaction)
建議採「分散式資料庫」，依主工項分表 (L3a, L3b, L3c...)，但欄位結構必須完全一致 10。
L3a - 木門檢查紀錄 (範本)
| 欄位名稱 (中文) | 欄位名稱 (英文建議) | 類型 | 邏輯/來源 |
| :--- | :--- | :--- | :--- |
| 標題 | Title | 單行文字 | 自動生成 (如：A-3F-01-木門-001) 11 |
| 樓層戶別 | UnitRef | 查閱 (Lookup) | 關聯至 L1 (用於篩選樓層) 12 |
| 點位關聯 | PinRef | 查閱 (Lookup) | 關聯至 L1b (連結固定點位) 13 |
| X 座標 | PointX | 數字 | 繼承自 L1b 或點擊位置 14 |
| Y 座標 | PointY | 數字 | 繼承自 L1b 或點擊位置 |
| 次工項 | SubCategory | 單行文字 | 下拉選單 (源自 L2a) 15 |
| 缺失內容 | DefectDesc | 單行文字 | 下拉選單 (源自 L2b) |
| 責任廠商 | Vendor | 單行文字 | 自動帶入 (源自 L2b) |
| 狀態 | Status | 選擇 | 待改善 / 修繕完成 (預設：待改善) 16 |
| 缺失照片 | Photo_Defect | 圖片 | 必填 |
| 改善照片 | Photo_Fixed | 圖片 | 上傳後觸發「修繕完成」狀態 |
| 備註 | Memo | 多行文字 | |
4. 效能優化表 (Performance)
清單名稱	用途	欄位名稱	備註
Summary_WorkProgress	快速讀取進度	樓層戶別、工項、待改善件數、完工百分比	透過 Power Automate 定時更新，加速 APP 第三頁讀取 17
________________________________________
第二部分：前台 APP 架構 (Field Inspection App)
目標：手機版操作，四階段線性導覽。
1. 全域變數 (Global Variables)
變數名稱	用途	設定時機
gvarSelectedBuild	鎖定棟別	Screen_Building_Select 18
gvarSelectedFloor	鎖定樓層	Screen_Floor_Select 19
gvarTargetList	動態指定存檔清單 (如 "L3a")	Screen_WorkItem_Summary 202020
gvarWorkItemName	紀錄工項名稱 (如 "木門")	Screen_WorkItem_Summary
gvarSelectedPin	鎖定地圖上被點擊的 L1b 紀錄	Screen_Map_View 21
2. 畫面流程 (Screen Flow)
●	Screen_Building_Select (棟別)：Gallery 顯示 L1 不重複棟別。
●	Screen_Floor_Select (樓層)：Gallery 顯示 Filter(L1, 棟別 = gvarSelectedBuild) 22。
●	Screen_WorkItem_Summary (工項)：
○	Gallery 顯示 L2 工項目錄。
○	關鍵邏輯：點擊「木門」 -> Set(gvarTargetList, "L3a"); Set(gvarWorkItemName, "木門"); Navigate(Screen_Map_View) 23。
●	Screen_Map_View (地圖)：
○	img_Map_Base：顯示 L0 平面圖。
○	gal_Fixed_Pins (圖庫)：
■	Items: Filter(L1b, 樓層戶別.Value = gvarSelectedFloor)
■	X: ThisItem.PointX * Parent.Width 24
■	Y: ThisItem.PointY * Parent.Height
■	燈號邏輯：使用 Lookup(gvarTargetList...) 判斷顏色 (紅=有缺失, 綠=完工, 灰=無紀錄) 25。
○	彈跳視窗 (Popup Forms)：
■	Form_Add (新增)：點擊灰燈觸發。
■	Form_Audit (驗收)：點擊紅燈觸發，上傳改善照片後 Auto-Submit 26。
________________________________________
第三部分：後台 APP 架構 (Office Admin App)
目標：平板/電腦版 (16:9)，精確標定 L1b 座標。
1. 核心技術：網格感應器 (Grid Sensor)
●	規格：40x40 巢狀網格 (Nested Gallery) 27。
●	組件：
○	gal_Grid_Rows (外層)：40 列。
○	gal_Grid_Cols (內層)：40 行。
○	btn_Sensor (透明按鈕)：位於內層格子中。
●	座標換算公式 28：
○	PointX = (Mod(此格編號 - 1, 40) + 0.5) / 40
○	PointY = (RoundDown((此格編號 - 1) / 40) + 0.5) / 40
○	目的：產生 0.0 ~ 1.0 的浮點數，確保地圖縮放時點位不跑掉 29。
2. 畫面功能
●	Screen_Admin_Nav：選擇棟別與樓層。
●	Screen_Admin_Editor：
○	左側 70%：大地圖 + 網格層。
○	右側 30%：屬性編輯卡 (設定 L1b 的點位名稱、空間屬性)。
○	批次功能：複製樓層點位 (Clone)、快速標籤命名 (Quick Label) 30303030。
________________________________________
這份架構確保了從「資料庫欄位」到「前台操作」的一致性。




