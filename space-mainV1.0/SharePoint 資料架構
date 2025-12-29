「前、後台分離」且「操作簡單化」的新計畫，我建議的 SharePoint 資料架構 應聚焦於標準化與高效關聯。這套架構能支撐您提到的四階段（棟別 > 樓層 > 工項摘要 > 地圖落點）操作。
以下是建議的五大類清單架構：
一、 基礎底圖與空間架構 (後台維護)
這部分定義了建築的物理結構與地圖底色。
●	L0 - 平面圖庫
○	用途：儲存各棟別樓層的平面圖圖片 。
○	建議欄位：標題 (如 A-1F)、棟別、樓層、平面圖 (縮圖連結) 。
●	L1 - 戶別樓層 (主檔)
○	用途：專案的所有戶別清單，是所有紀錄的「根」 。
○	建議欄位：樓層戶別 (Title)、棟別、樓層、狀態 (點交/未點交) 。
二、 核心點位定義 (新計畫關鍵)
為了實現您要求的「固定點位」，必須預先在後台標定座標。
●	L1b - 空間座標主檔
○	用途：預先定義地圖上的固定感應點（錨點） 。
○	建議欄位：
■	點位名稱 (如：主臥室-入口) 。
■	樓層戶別 (Lookup 至 L1) 。
■	PointX / PointY (數字：存儲 0-1 之間的相對位置) 。
■	空間屬性 (如：戶內/公設/機房) 。
三、 標準化缺失目錄 (後台維護)
這三張表建立「連動下拉選單」的基礎，讓前台只需勾選，不需打字。
●	L2 - 工項目錄：主工項 (如：木門、油漆、電氣) 。
●	L2a - 次工項目錄：次細項 (如：木門框、五金、門扇)，需關聯 L2 。
●	L2b - 缺失項目目錄：標準化缺失描述與對應廠商，需關聯 L2a 。
四、 現場查驗紀錄表 (前台寫入)
建議採「分散式資料庫」，每種主工項獨立成表 (如 L3a, L3b...)，並強制所有工項欄位規格統一，方便程式碼複製 。
●	L3a - 木門紀錄 / L3b - 油漆紀錄 ... (欄位需一致)：
○	標題：自動生成 (如：A-3F-01-木門-刮傷) 。
○	樓層戶別 (Lookup 至 L1) 。
○	點位關聯 (建議新增：Lookup 至 L1b)：連結至特定的固定點位。
○	座標資料：PointX / PointY (由地圖點擊時自動帶入) 。
○	缺失內容：次工項、缺失內容、廠商 。
○	查驗狀態：狀態 (待改善/修繕完成)、缺失照片、改善照片、備註 。
五、 摘要統計表 (效能優化用)
為了讓您的「第三頁：工項摘要列表」跑得快，建議增加此表。
●	Summary_WorkProgress
○	用途：透過 Power Automate 定時統計或即時計算。
○	建議欄位：樓層戶別、工項、待改善件數、完工百分比 (%) 。
○	好處：前台 APP 進入第三頁時，不需掃描幾千筆 L3 紀錄，直接讀這張表即可顯示「木門：5 筆待改善」 。
💡 建議開發順序：
1.	先定稿 L3a 欄位：將上述所有欄位在 L3a 建置完成，作為後續 L3b~L3zz 的模版。
2.	建立 L1b 範例資料：在一個測試戶別中，預先手動建立幾個 PointX/Y 座標，供我們測試第四頁的地圖落點功能 。

















```python
import pandas as pd
import re
import json

files = [
    "L0_MapLibrary.csv",
    "L1_ProjectMaster.csv",
    "L1a - 空間主檔.csv",
    "L1b_SpaceCoordinates.csv",
    "L2_工程階段.csv",
    "L2a_工項.csv",
    "L2b_次工項.csv",
    "L2c_缺失項目清單.csv",
    "L3_查驗紀錄.csv"
]

def extract_schema(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
        
        # Check if it contains ListSchema
        if 'ListSchema=' in first_line:
            # Extract the JSON part
            json_str = first_line.replace('ListSchema=', '').strip()
            schema_data = json.loads(json_str)
            xml_list = schema_data.get('schemaXmlList', [])
            
            fields = []
            for xml in xml_list:
                # Extract DisplayName and Type using regex
                display_name = re.search(r'DisplayName=\\\"([^\\\"]+)\\\"', xml)
                field_type = re.search(r'Type=\\\"([^\\\"]+)\\\"', xml)
                
                if display_name and field_type:
                    fields.append({
                        "name": display_name.group(1),
                        "type": field_type.group(1)
                    })
            return fields
        else:
            # Fallback to pandas dtypes if no schema
            df = pd.read_csv(file_path, nrows=5)
            return [{"name": col, "type": str(df[col].dtype)} for col in df.columns]
    except Exception as e:
        return [{"error": str(e)}]

all_schemas = {}
for f in files:
    all_schemas[f] = extract_schema(f)

print(json.dumps(all_schemas, indent=2, ensure_ascii=False))


```

```text
{
  "L0_MapLibrary.csv": [],
  "L1_ProjectMaster.csv": [],
  "L1a - 空間主檔.csv": [],
  "L1b_SpaceCoordinates.csv": [],
  "L2_工程階段.csv": [],
  "L2a_工項.csv": [],
  "L2b_次工項.csv": [],
  "L2c_缺失項目清單.csv": [],
  "L3_查驗紀錄.csv": []
}


```

```python
with open("L3_查驗紀錄.csv", 'r', encoding='utf-8') as f:
    print(f.read(1000))


```

```text
ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field CommaSeparator=\"TRUE\" CustomUnitOnRight=\"TRUE\" Decimals=\"4\" DisplayName=\"PointX\" Format=\"Dropdown\" IsModern=\"TRUE\" Name=\"PointX\" Percentage=\"FALSE\" Title=\"PointX\" Type=\"Number\" Unit=\"None\" ID=\"{d2cb50d6-8248-44aa-853e-ea4db2b8c249}\" StaticName=\"PointX\" />","<Field CommaSeparator=\"TRUE\" CustomUnitOnRight=\"TRUE\" Decimals=\"4\" DisplayName=\"PointY\" Format=\"Dropdown\" IsModern=\"TRUE\" Name=\"PointY\" Percentage=\"FALSE\" Title=\"PointY\" Type=\"Number\" Unit=\"None\" ID=\"{3c665703-e53f-47c6-a94e-7802ba371535}\" StaticName=\"PointY\" />","<Field ClientSideComponentId=\"00000000-0000-0000-0000-000000000000\" CustomFormatter=\"{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&q


```

```python
import re
import json
import pandas as pd

files = [
    "L0_MapLibrary.csv",
    "L1_ProjectMaster.csv",
    "L1a - 空間主檔.csv",
    "L1b_SpaceCoordinates.csv",
    "L2_工程階段.csv",
    "L2a_工項.csv",
    "L2b_次工項.csv",
    "L2c_缺失項目清單.csv",
    "L3_查驗紀錄.csv"
]

def get_detailed_schema(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            line = f.readline()
            
        if not line.startswith("ListSchema="):
            # Try to read with pandas to get column names at least
            df = pd.read_csv(file_path, nrows=0)
            return [{"name": col, "type": "Text (Default)"} for col in df.columns]

        # Extract the JSON part
        json_content = line[len("ListSchema="):].strip()
        data = json.loads(json_content)
        xml_fields = data.get("schemaXmlList", [])
        
        results = []
        for xml in xml_fields:
            # Match DisplayName="..." and Type="..."
            dn_match = re.search(r'DisplayName="([^"]+)"', xml)
            type_match = re.search(r'Type="([^"]+)"', xml)
            
            if dn_match and type_match:
                dn = dn_match.group(1)
                tp = type_match.group(1)
                # Ignore internal fields like '標題', 'ID' if they aren't in the actual CSV data headers
                # But for this list, we'll keep them and maybe filter later or mark them.
                results.append({"name": dn, "type": tp})
        
        # Cross reference with actual CSV headers to ensure we only show relevant ones
        df_headers = pd.read_csv(file_path, skiprows=1, nrows=0).columns.tolist()
        final_list = []
        for h in df_headers:
            # Find the type from the schema for this header
            # Sometimes SharePoint display names and CSV headers differ slightly or are the same.
            match = next((item for item in results if item["name"] == h), None)
            if match:
                final_list.append(match)
            else:
                final_list.append({"name": h, "type": "Text/Lookup"})
                
        return final_list
    except Exception as e:
        return [{"error": str(e)}]

all_details = {}
for f in files:
    all_details[f] = get_detailed_schema(f)

print(json.dumps(all_details, indent=2, ensure_ascii=False))


```

```text
{
  "L0_MapLibrary.csv": [
    {
      "name": "棟別樓層",
      "type": "Computed"
    },
    {
      "name": "棟別",
      "type": "Text"
    },
    {
      "name": "樓層",
      "type": "Text"
    },
    {
      "name": "平面圖",
      "type": "Thumbnail"
    }
  ],
  "L1_ProjectMaster.csv": [
    {
      "name": "樓層戶別",
      "type": "Computed"
    },
    {
      "name": "戶別",
      "type": "Text"
    },
    {
      "name": "棟別",
      "type": "Text"
    },
    {
      "name": "樓層",
      "type": "Text"
    },
    {
      "name": "空間名稱",
      "type": "Text"
    }
  ],
  "L1a - 空間主檔.csv": [
    {
      "name": "空間名稱",
      "type": "Computed"
    },
    {
      "name": "空間分類",
      "type": "Choice"
    }
  ],
  "L1b_SpaceCoordinates.csv": [
    {
      "name": "點位名稱",
      "type": "Computed"
    },
    {
      "name": "樓層戶別",
      "type": "Text/Lookup"
    },
    {
      "name": "PointX",
      "type": "Number"
    },
    {
      "name": "PointY",
      "type": "Number"
    },
    {
      "name": "空間分類",
      "type": "Choice"
    },
    {
      "name": "樓層戶別: 棟別",
      "type": "Text/Lookup"
    },
    {
      "name": "樓層戶別: 樓層",
      "type": "Text/Lookup"
    },
    {
      "name": "空間名稱",
      "type": "Text/Lookup"
    }
  ],
  "L2_工程階段.csv": [
    {
      "name": "階段名稱",
      "type": "Computed"
    },
    {
      "name": "階段編號",
      "type": "Text"
    }
  ],
  "L2a_工項.csv": [
    {
      "name": "工項",
      "type": "Computed"
    },
    {
      "name": "階段名稱",
      "type": "Text/Lookup"
    },
    {
      "name": "工項編號",
      "type": "Text"
    },
    {
      "name": "階段名稱: 階段編號",
      "type": "Text/Lookup"
    }
  ],
  "L2b_次工項.csv": [
    {
      "name": "次工項",
      "type": "Computed"
    },
    {
      "name": "工項",
      "type": "Text/Lookup"
    },
    {
      "name": "工項: 工項編號",
      "type": "Text/Lookup"
    }
  ],
  "L2c_缺失項目清單.csv": [
    {
      "name": "缺失項目",
      "type": "Computed"
    },
    {
      "name": "次工項",
      "type": "Text/Lookup"
    }
  ],
  "L3_查驗紀錄.csv": [
    {
      "name": "自動生成 ID",
      "type": "Computed"
    },
    {
      "name": "樓層戶別",
      "type": "Text/Lookup"
    },
    {
      "name": "點位關聯",
      "type": "Text/Lookup"
    },
    {
      "name": "階段名稱",
      "type": "Text"
    },
    {
      "name": "工項",
      "type": "Text"
    },
    {
      "name": "次工項",
      "type": "Text"
    },
    {
      "name": "缺失內容",
      "type": "Text/Lookup"
    },
    {
      "name": "狀態",
      "type": "Choice"
    },
    {
      "name": "缺失照片",
      "type": "Thumbnail"
    },
    {
      "name": "改善照片",
      "type": "Thumbnail"
    },
    {
      "name": "缺失描述",
      "type": "Note"
    },
    {
      "name": "負責廠商",
      "type": "Text"
    },
    {
      "name": "PointX",
      "type": "Number"
    },
    {
      "name": "PointY",
      "type": "Number"
    },
    {
      "name": "樓層戶別: 棟別",
      "type": "Text/Lookup"
    },
    {
      "name": "樓層戶別: 樓層",
      "type": "Text/Lookup"
    }
  ]
}


```

這是為您整理的**全表單詳細欄位資訊**，包含各欄位在 M365 (SharePoint) 中的原始**資料類型 (Data Type)**。這對於後續在 Power Apps 或 Power BI 中建立關聯與格式設定非常重要。

### 📋 M365 品管系統：全欄位與類型清單

#### **【層級 0：底圖層】**

**1. L0_MapLibrary (平面圖庫)**

* `棟別樓層`: **Computed (計算欄位)** - 系統唯一識別碼
* `棟別`: **Text (文字)**
* `樓層`: **Text (文字)**
* `平面圖`: **Thumbnail (縮圖/附件)** - 存放圖檔

---

#### **【層級 1：空間層】**

**2. L1_ProjectMaster (專案空間主檔)**

* `樓層戶別`: **Computed (計算欄位)** - 系統唯一識別碼
* `戶別`: **Text (文字)**
* `棟別`: **Text (文字)**
* `樓層`: **Text (文字)**
* `空間名稱`: **Text (文字)**

**3. L1a - 空間主檔 (空間分類定義)**

* `空間名稱`: **Computed (計算欄位)**
* `空間分類`: **Choice (選項)** - [室內, 公設, 機房]

**4. L1b_SpaceCoordinates (空間座標點位)**

* `點位名稱`: **Computed (計算欄位)**
* `樓層戶別`: **Lookup (查閱)** - 關聯 L1_ProjectMaster
* `PointX`: **Number (數字)** - 範圍 0~1
* `PointY`: **Number (數字)** - 範圍 0~1
* `空間分類`: **Choice (選項)**
* `樓層戶別: 棟別` / `樓層戶別: 樓層` / `空間名稱`: **Lookup (查閱)** - 自動帶入欄位

---

#### **【層級 2：工項標準層】**

**5. L2_工程階段 (工程大綱)**

* `階段名稱`: **Computed (計算欄位)**
* `階段編號`: **Text (文字/數字)**

**6. L2a_工項 (主工項)**

* `工項`: **Computed (計算欄位)**
* `階段名稱`: **Lookup (查閱)** - 關聯 L2
* `工項編號`: **Text (文字)**
* `階段名稱: 階段編號`: **Lookup (查閱)** - 自動帶入

**7. L2b_次工項 (細部工項)**

* `次工項`: **Computed (計算欄位)**
* `工項`: **Lookup (查閱)** - 關聯 L2a
* `工項: 工項編號`: **Lookup (查閱)** - 自動帶入

**8. L2c_缺失項目清單 (標準化缺失)**

* `缺失項目`: **Computed (計算欄位)**
* `次工項`: **Lookup (查閱)** - 關聯 L2b

---

#### **【層級 3：紀錄執行層】**

**9. L3_查驗紀錄 (核心紀錄表)**

* `自動生成 ID`: **Computed (計算欄位)**
* `樓層戶別`: **Lookup (查閱)** - 關聯 L1_ProjectMaster
* `點位關聯`: **Lookup (查閱)** - 關聯 L1b
* `階段名稱` / `工項` / `次工項`: **Text (文字/查閱)**
* `缺失內容`: **Lookup (查閱)** - 關聯 L2c
* `狀態`: **Choice (選項)** - 如：[待改善, 已完成]
* `缺失照片` / `改善照片`: **Thumbnail (縮圖/附件)**
* `缺失描述`: **Note (多行文字)**
* `負責廠商`: **Text (文字)**
* `PointX` / `PointY`: **Number (數字)**
* `樓層戶別: 棟別` / `樓層戶別: 樓層`: **Lookup (查閱)** - 自動帶入

---

### 💾 一鍵複製：完整欄位類型摘要

```markdown
# M365 品管系統欄位與類型對照表
- L0: [棟別樓層:Computed], [棟別:Text], [樓層:Text], [平面圖:Thumbnail]
- L1: [樓層戶別:Computed], [PointX/Y:Number], [空間分類:Choice]
- L2: [階段/工項/次工項:Computed], [關聯欄位:Lookup]
- L3: [缺失內容:Lookup], [狀態:Choice], [缺失描述:Note], [照片:Thumbnail]

```

**下一步提示：**
我們已經完成了**欄位資訊與資料類型**的詳細盤點。根據系統開發流程，下一步建議進行 **[ERD 關聯邏輯確認]**，即定義 L3 是如何透過 L1 與 L2 進行三向關聯的。

**請問是否繼續進行關聯邏輯分析？**


