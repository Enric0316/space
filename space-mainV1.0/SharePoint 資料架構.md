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










































































00000
ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field DisplayName=\"棟別\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x68df__x5225_\" Title=\"棟別\" Type=\"Text\" ID=\"{1625a646-ee37-4893-a0f0-2f534db46236}\" StaticName=\"_x68df__x5225_\" />","<Field DisplayName=\"樓層\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x6a13__x5c64_\" Title=\"樓層\" Type=\"Text\" ID=\"{c214d02d-a37e-4f01-8688-8c0a609008d9}\" StaticName=\"_x6a13__x5c64_\" />","<Field DisplayName=\"平面圖\" Format=\"Thumbnail\" IsModern=\"TRUE\" Name=\"_x5e73__x9762__x5716_\" Title=\"平面圖\" Type=\"Thumbnail\" ID=\"{be217fc9-afc1-4ccd-a4ad-04bee0d6a8ec}\" StaticName=\"_x5e73__x9762__x5716_\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"棟別樓層\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"棟別樓層","棟別","樓層","平面圖","階段"
"A-02F","A","02F","Reserved_ImageAttachment_[21]_[_x5e73__x9762__x5716_][32]_[0ee7306f6754445db4e20e6b04169eeb][1]_[7].jpg","內裝工程"
"A-03F","A","03F","Reserved_ImageAttachment_[21]_[_x5e73__x9762__x5716_][32]_[b990a905145d42c7bc5faf0dc1613238][1]_[3].jpg","內裝工程"
"A-04F","A","04F",,"內裝工程"
,"A","05F",,"內裝工程"
,"A","06F",,"內裝工程"
,"A","07F",,"內裝工程"
,"A","08F",,"內裝工程"
,"A","09F",,"內裝工程"
,"A","10F",,"內裝工程"
,"A","11F",,"內裝工程"
,"A","12F",,"內裝工程"
,"A","13F",,"內裝工程"
,"A","14F",,"內裝工程"
,"A","15F",,"內裝工程"
,"A","16F",,"內裝工程"
,"A","17F",,"內裝工程"
,"A","18F",,"內裝工程"
,"A","19F",,"內裝工程"
,"A","20F",,"內裝工程"
,"A","21F",,"內裝工程"
,"A","22F",,"內裝工程"
,"A","23F",,"內裝工程"














L1


ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field DisplayName=\"棟別\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x68df__x5225_\" Title=\"棟別\" Type=\"Text\" ID=\"{18736b53-f770-44dd-bc14-eed34a9f465c}\" StaticName=\"_x68df__x5225_\" />","<Field DisplayName=\"樓層\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x6a13__x5c64_\" Title=\"樓層\" Type=\"Text\" ID=\"{6333eb6e-ff44-4eb7-8a2d-082150133749}\" StaticName=\"_x6a13__x5c64_\" />","<Field DisplayName=\"空間名稱\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x7a7a__x9593__x540d__x7a31_\" Title=\"空間名稱\" Type=\"Text\" ID=\"{377d2cbf-3b8e-4b81-aade-dda7a3dce3af}\" StaticName=\"_x7a7a__x9593__x540d__x7a31_\" />","<Field DisplayName=\"戶別\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x6236__x5225_\" Title=\"戶別\" Type=\"Text\" ID=\"{80b13105-30f9-43de-a3df-8c44fc0c3616}\" StaticName=\"_x6236__x5225_\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"樓層戶別\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"樓層戶別","戶別","棟別","樓層","空間名稱"
"02F-A01","A01","A","02F",
"02F-A02","A02","A","02F",
"02F-A03","A03","A","02F",
"02F-A05","A05","A","02F",
"02F-A06","A06","A","02F",
"02F-A07","A07","A","02F",
"02F-A08","A08","A","02F",
"02F-A09","A09","A","02F",
"03F-A01","A01","A","03F",
"03F-A02","A02","A","03F",
"03F-A03","A03","A","03F",
"03F-A05","A05","A","03F",
"03F-A06","A06","A","03F",
"03F-A07","A07","A","03F",
"03F-A08","A08","A","03F",
"03F-A09","A09","A","03F",
"04F-A01","A01","A","04F",
"04F-A02","A02","A","04F",
"04F-A03","A03","A","04F",
"04F-A05","A05","A","04F",
"04F-A06","A06","A","04F",
"04F-A07","A07","A","04F",
"04F-A08","A08","A","04F",
"04F-A09","A09","A","04F",
"05F-A01","A01","A","05F",
"05F-A02","A02","A","05F",
"05F-A03","A03","A","05F",
"05F-A05","A05","A","05F",
"05F-A06","A06","A","05F",
"05F-A07","A07","A","05F",
"05F-A08","A08","A","05F",
"05F-A09","A09","A","05F",
"06F-A01","A01","A","06F",
"06F-A02","A02","A","06F",
"06F-A03","A03","A","06F",
"06F-A05","A05","A","06F",
"06F-A06","A06","A","06F",
"06F-A07","A07","A","06F",
"06F-A08","A08","A","06F",
"06F-A09","A09","A","06F",
"07F-A01","A01","A","07F",
"07F-A02","A02","A","07F",
"07F-A03","A03","A","07F",
"07F-A05","A05","A","07F",
"07F-A06","A06","A","07F",
"07F-A07","A07","A","07F",
"07F-A08","A08","A","07F",
"07F-A09","A09","A","07F",
"08F-A01","A01","A","08F",
"08F-A02","A02","A","08F",
"08F-A03","A03","A","08F",
"08F-A05","A05","A","08F",
"08F-A06","A06","A","08F",
"08F-A07","A07","A","08F",
"08F-A08","A08","A","08F",
"08F-A09","A09","A","08F",
"09F-A01","A01","A","09F",
"09F-A02","A02","A","09F",
"09F-A03","A03","A","09F",
"09F-A05","A05","A","09F",
"09F-A06","A06","A","09F",
"09F-A07","A07","A","09F",
"09F-A08","A08","A","09F",
"09F-A09","A09","A","09F",
"10F-A01","A01","A","10F",
"10F-A02","A02","A","10F",
"10F-A03","A03","A","10F",
"10F-A05","A05","A","10F",
"10F-A06","A06","A","10F",
"10F-A07","A07","A","10F",
"10F-A08","A08","A","10F",
"10F-A09","A09","A","10F",
"11F-A01","A01","A","11F",
"11F-A02","A02","A","11F",
"11F-A03","A03","A","11F",
"11F-A05","A05","A","11F",
"11F-A06","A06","A","11F",
"11F-A07","A07","A","11F",
"11F-A08","A08","A","11F",
"11F-A09","A09","A","11F",
"12F-A01","A01","A","12F",
"12F-A02","A02","A","12F",
"12F-A03","A03","A","12F",
"12F-A05","A05","A","12F",
"12F-A06","A06","A","12F",
"12F-A07","A07","A","12F",
"12F-A08","A08","A","12F",
"12F-A09","A09","A","12F",
"13F-A01","A01","A","13F",
"13F-A02","A02","A","13F",
"13F-A03","A03","A","13F",
"13F-A05","A05","A","13F",
"13F-A06","A06","A","13F",
"13F-A07","A07","A","13F",
"13F-A08","A08","A","13F",
"13F-A09","A09","A","13F",
"14F-A01","A01","A","14F",
"14F-A02","A02","A","14F",
"14F-A03","A03","A","14F",
"14F-A05","A05","A","14F",
"14F-A06","A06","A","14F",
"14F-A07","A07","A","14F",
"14F-A08","A08","A","14F",
"14F-A09","A09","A","14F",
"15F-A01","A01","A","15F",
"15F-A02","A02","A","15F",
"15F-A03","A03","A","15F",
"15F-A06","A06","A","15F",
"15F-A07","A07","A","15F",
"15F-A08","A08","A","15F",
"15F-A09","A09","A","15F",
"16F-A01","A01","A","16F",
"16F-A02","A02","A","16F",
"16F-A03","A03","A","16F",
"16F-A06","A06","A","16F",
"16F-A07","A07","A","16F",
"16F-A08","A08","A","16F",
"16F-A09","A09","A","16F",
"17F-A01","A01","A","17F",
"17F-A02","A02","A","17F",
"17F-A03","A03","A","17F",
"17F-A06","A06","A","17F",
"17F-A07","A07","A","17F",
"17F-A08","A08","A","17F",
"17F-A09","A09","A","17F",
"18F-A01","A01","A","18F",
"18F-A02","A02","A","18F",
"18F-A03","A03","A","18F",
"18F-A06","A06","A","18F",
"18F-A07","A07","A","18F",
"18F-A08","A08","A","18F",
"18F-A09","A09","A","18F",
"19F-A01","A01","A","19F",
"19F-A02","A02","A","19F",
"19F-A03","A03","A","19F",
"19F-A05","A05","A","19F",
"19F-A06","A06","A","19F",
"19F-A07","A07","A","19F",
"19F-A08","A08","A","19F",
"19F-A09","A09","A","19F",
"20F-A01","A01","A","20F",
"20F-A02","A02","A","20F",
"20F-A03","A03","A","20F",
"20F-A05","A05","A","20F",
"20F-A06","A06","A","20F",
"20F-A07","A07","A","20F",
"20F-A08","A08","A","20F",
"20F-A09","A09","A","20F",
"21F-A01","A01","A","21F",
"21F-A02","A02","A","21F",
"21F-A03","A03","A","21F",
"21F-A05","A05","A","21F",
"21F-A06","A06","A","21F",
"21F-A07","A07","A","21F",
"21F-A08","A08","A","21F",
"21F-A09","A09","A","21F",
"22F-A01","A01","A","22F",
"22F-A02","A02","A","22F",
"22F-A03","A03","A","22F",
"22F-A05","A05","A","22F",
"22F-A06","A06","A","22F",
"22F-A07","A07","A","22F",
"22F-A08","A08","A","22F",
"22F-A09","A09","A","22F",
"23F-A01","A01","A","23F",
"23F-A02","A02","A","23F",
"23F-A03","A03","A","23F",
"23F-A05","A05","A","23F",
"23F-A06","A06","A","23F",
"23F-A07","A07","A","23F",
"23F-A08","A08","A","23F",
"23F-A09","A09","A","23F",
















L1a


ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field CustomFormatter=\"{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;flex-wrap&quot;:&quot;wrap&quot;,&quot;display&quot;:&quot;flex&quot;},&quot;children&quot;:[{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;box-sizing&quot;:&quot;border-box&quot;,&quot;padding&quot;:&quot;4px 8px 5px 8px&quot;,&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;display&quot;:&quot;flex&quot;,&quot;border-radius&quot;:&quot;16px&quot;,&quot;height&quot;:&quot;24px&quot;,&quot;align-items&quot;:&quot;center&quot;,&quot;white-space&quot;:&quot;nowrap&quot;,&quot;margin&quot;:&quot;4px 4px 4px 4px&quot;},&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;室內&quot;]},&quot;sp-css-backgroundColor-BgCornflowerBlue sp-field-fontSizeSmall sp-css-color-CornflowerBlueFont sp-css-color-CornflowerBlueFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;公設&quot;]},&quot;sp-css-backgroundColor-BgMintGreen sp-field-fontSizeSmall sp-css-color-MintGreenFont sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;機房&quot;]},&quot;sp-css-backgroundColor-BgGold sp-field-fontSizeSmall sp-css-color-GoldFont sp-css-color-GoldFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;&quot;]},&quot;&quot;,&quot;sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary&quot;]}]}]}]}},&quot;children&quot;:[{&quot;elmType&quot;:&quot;span&quot;,&quot;style&quot;:{&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;padding&quot;:&quot;0 3px&quot;},&quot;txtContent&quot;:&quot;@currentField&quot;,&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;室內&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-CornflowerBlueFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;公設&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;機房&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-GoldFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;&quot;]},&quot;&quot;,&quot;&quot;]}]}]}]}}}]}],&quot;templateId&quot;:&quot;BgColorChoicePill&quot;}\" DisplayName=\"空間分類\" FillInChoice=\"FALSE\" Format=\"Dropdown\" IsModern=\"TRUE\" Name=\"_x7a7a__x9593__x5206__x985e_\" Title=\"空間分類\" Type=\"Choice\" ID=\"{fc1212a8-91ba-43f4-9fd7-7848714b9f8f}\" StaticName=\"_x7a7a__x9593__x5206__x985e_\"><CHOICES><CHOICE>室內</CHOICE><CHOICE>公設</CHOICE><CHOICE>機房</CHOICE></CHOICES></Field>","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"空間名稱\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"空間名稱","空間分類"
"客餐廳","室內"
"主臥室","室內"
"臥室1","室內"
"臥室2","室內"
"廚房","室內"
"主浴","室內"
"浴室","室內"
"陽台","室內"
"後陽台","室內"
"露臺","室內"












L1b


ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field CommaSeparator=\"TRUE\" CustomUnitOnRight=\"TRUE\" Decimals=\"4\" DisplayName=\"PointX\" Format=\"Dropdown\" IsModern=\"TRUE\" Max=\"1\" Min=\"0\" Name=\"PointX\" Percentage=\"FALSE\" Title=\"PointX\" Type=\"Number\" Unit=\"None\" ID=\"{4d75c71b-f667-4cd3-8d06-0d36b739cd8d}\" StaticName=\"PointX\" />","<Field CommaSeparator=\"TRUE\" CustomUnitOnRight=\"TRUE\" Decimals=\"4\" DisplayName=\"PointY\" Format=\"Dropdown\" IsModern=\"TRUE\" Max=\"1\" Min=\"0\" Name=\"PointY\" Percentage=\"FALSE\" Title=\"PointY\" Type=\"Number\" Unit=\"None\" ID=\"{3ae4c85b-3974-4393-a98c-89eec842b61c}\" StaticName=\"PointY\" />","<Field CustomFormatter=\"{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;flex-wrap&quot;:&quot;wrap&quot;,&quot;display&quot;:&quot;flex&quot;},&quot;children&quot;:[{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;box-sizing&quot;:&quot;border-box&quot;,&quot;padding&quot;:&quot;4px 8px 5px 8px&quot;,&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;display&quot;:&quot;flex&quot;,&quot;border-radius&quot;:&quot;16px&quot;,&quot;height&quot;:&quot;24px&quot;,&quot;align-items&quot;:&quot;center&quot;,&quot;white-space&quot;:&quot;nowrap&quot;,&quot;margin&quot;:&quot;4px 4px 4px 4px&quot;},&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;室內&quot;]},&quot;sp-css-backgroundColor-BgCornflowerBlue sp-field-fontSizeSmall sp-css-color-CornflowerBlueFont sp-css-color-CornflowerBlueFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;公設&quot;]},&quot;sp-css-backgroundColor-BgMintGreen sp-field-fontSizeSmall sp-css-color-MintGreenFont sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;機房&quot;]},&quot;sp-css-backgroundColor-BgGold sp-field-fontSizeSmall sp-css-color-GoldFont sp-css-color-GoldFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;&quot;]},&quot;&quot;,&quot;sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary&quot;]}]}]}]}},&quot;children&quot;:[{&quot;elmType&quot;:&quot;span&quot;,&quot;style&quot;:{&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;padding&quot;:&quot;0 3px&quot;},&quot;txtContent&quot;:&quot;@currentField&quot;,&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;室內&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-CornflowerBlueFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;公設&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;機房&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-GoldFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;&quot;]},&quot;&quot;,&quot;&quot;]}]}]}]}}}]}],&quot;templateId&quot;:&quot;BgColorChoicePill&quot;}\" DisplayName=\"空間分類\" FillInChoice=\"TRUE\" Format=\"Dropdown\" IsModern=\"TRUE\" Name=\"_x7a7a__x9593__x5206__x985e_\" Title=\"空間分類\" Type=\"Choice\" ID=\"{fbf4df8c-e026-4f3a-9b44-903972a6a0e1}\" StaticName=\"_x7a7a__x9593__x5206__x985e_\"><CHOICES><CHOICE>室內</CHOICE><CHOICE>公設</CHOICE><CHOICE>機房</CHOICE></CHOICES></Field>","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"點位名稱\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"點位名稱","樓層戶別","PointX","PointY","空間分類","樓層戶別: 棟別","樓層戶別: 樓層","空間名稱"
"01","02F-A01","0.2300","0.2300","室內","A","02F","主臥室"
"02","02F-A01","0.1900","0.2500","室內","A","02F","主浴"
"03","02F-A01","0.2300","0.3100","室內","A","02F","臥室1"
"04","02F-A01","0.2900","0.2700","室內","A","02F","客餐廳"
"05","02F-A01","0.2300","0.3900","室內","A","02F","後陽台"















L2


ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field ClientSideComponentId=\"00000000-0000-0000-0000-000000000000\" DisplayName=\"階段編號\" Format=\"Dropdown\" MaxLength=\"255\" Name=\"_x968e__x6bb5__x7de8__x865f_\" Title=\"階段編號\" Type=\"Text\" ID=\"{57a0d108-413f-49f5-8aab-a403eb600b8f}\" StaticName=\"_x968e__x6bb5__x7de8__x865f_\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"階段名稱\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"階段名稱","階段編號"
"假設工程","01"
"基礎工程","02"
"結構工程","03"
"鋼構工程","04"
"內裝工程","05"
"外飾工程","06"
"門窗工程","07"
"設備工程","08"
"景觀工程","09"
"公設大廳","10"















L2a


ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field DisplayName=\"工項編號\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x5de5__x9805__x7de8__x865f_\" Title=\"工項編號\" Type=\"Text\" ID=\"{055c5074-db51-4bd8-a0a4-da5d7e68fa1a}\" StaticName=\"_x5de5__x9805__x7de8__x865f_\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"工項\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"工項","階段名稱","工項編號","階段名稱: 階段編號"
"前置作業","假設工程","01A","01"
"拆除及整地工程","假設工程","01B","01"
"安全圍籬工程","假設工程","01C","01"
"工務所組合屋","假設工程","01D","01"
"工務所水電費","假設工程","01F","01"
"廢棄物工程","假設工程","01H","01"
"施工電梯","假設工程","01K","01"
"塔吊","假設工程","01L","01"
"施工升降平台","假設工程","01M","01"
"臨時點工","假設工程","01P","01"
"鷹架工程","假設工程","01Q","01"
"安全措施","假設工程","01R","01"
"水電外管線","假設工程","01S","01"
"清潔","假設工程","01T","01"
"鑽探工程","基礎工程","02A","02"
"放樣工程","基礎工程","02B","02"
"鋼軌樁工程","基礎工程","02C","02"
"鋼板樁工程","基礎工程","02D","02"
"預壘樁工程","基礎工程","02E","02"
"排樁工程","基礎工程","02F","02"
"地質改良","基礎工程","02G","02"
"基樁","基礎工程","02H","02"
"止水樁","基礎工程","02I","02"
"微型樁","基礎工程","02J","02"
"連續壁","基礎工程","02M","02"
"土方","基礎工程","02O","02"
"安全觀測","基礎工程","02P","02"
"安全支撐","基礎工程","02Q","02"
"連續壁混凝土材料","基礎工程","02X","02"
"放樣工程","結構工程","03A","03"
"模板工程","結構工程","03B","03"
"中空樓板","結構工程","03C","03"
"混凝土","結構工程","03D","03"
"無收縮水泥","結構工程","03E","03"
"鋼筋工程","結構工程","03F","03"
"續接器","結構工程","03G","03"
"預鑄工程","結構工程","03H","03"
"結構工程材料","結構工程","03X","03"
"結構鋼筋材料","結構工程","03Y","03"
"主體鋼構","鋼構工程","04A","04"
"逆打鋼柱","鋼構工程","04B","04"
"鋼構配合工程","鋼構工程","04C","04"
"鋼構材料","鋼構工程","04D","04"
"逆打鋼柱材料","鋼構工程","04E","04"
"續接器","鋼構工程","04F","04"
"鋼構塗裝工程","鋼構工程","04G","04"
"防火披覆","鋼構工程","04H","04"
"鋼構防銹工程","鋼構工程","04I","04"
"廠內檢驗","鋼構工程","04J","04"
"柱梁焊道工地現場檢驗","鋼構工程","04K","04"
"其他部位焊道工地現場檢驗","鋼構工程","04L","04"
"鋼構工程","鋼構工程","04O","04"
"鋼構雜項","鋼構工程","04Y","04"
"隔間工程","內裝工程","05A","05"
"木作天花","內裝工程","05B","05"
"金屬天花","內裝工程","05C","05"
"泥作內牆工程","內裝工程","05D","05"
"公設貼磚工程","內裝工程","05E","05"
"抿石子及梯廳樣品層","內裝工程","05F","05"
"梯廳工程","內裝工程","05G","05"
"公設石材及地壁磚含木作","內裝工程","05H","05"
"金屬工程","內裝工程","05I","05"
"梯腳板","內裝工程","05J","05"
"地下室複壁工程(機坑粉刷)","內裝工程","05K","05"
"地坪泥作打底粉光","內裝工程","05L","05"
"地坪貼磚工程","內裝工程","05M","05"
"地坪石材工程","內裝工程","05N","05"
"門檻工程","內裝工程","05O","05"
"地坪裝修工程","內裝工程","05P","05"
"BF地坪標高器整體粉光EPOXY","內裝工程","05Q","05"
"防水工程","內裝工程","05R","05"
"油漆工程","內裝工程","05S","05"
"廁所導擺(零星點工)","內裝工程","05T","05"
"內裝矽利康工程","內裝工程","05U","05"
"外牆打底工程","外飾工程","06A","06"
"外牆泥作打底貼磚","外飾工程","06B","06"
"外牆貼磚工程","外飾工程","06C","06"
"戶外地坪貼磚工程","外飾工程","06D","06"
"陽台地坪工程","外飾工程","06E","06"
"外牆防水工程","外飾工程","06F","06"
"外牆噴塗工程","外飾工程","06G","06"
"外牆石材工程","外飾工程","06H","06"
"外牆仿石材烤漆鋁板","外飾工程","06I","06"
"外牆不銹鋼工程","外飾工程","06J","06"
"FRP烤漆飾板工程","外飾工程","06K","06"
"鑄鋁造型工程","外飾工程","06L","06"
"外牆金屬飾條工程","外飾工程","06M","06"
"鍛造工程","外飾工程","06N","06"
"GRC工程","外飾工程","06O","06"
"帷幕牆工程","外飾工程","06W","06"
"外飾材料","外飾工程","06X","06"
"玄關門","門窗工程","07A","07"
"木門工程","門窗工程","07B","07"
"防火門工程","門窗工程","07C","07"
"鋁門窗工程","門窗工程","07D","07"
"不鏽鋼窗","門窗工程","07E","07"
"玻璃工程","門窗工程","07F","07"
"水電工程","設備工程","08A","08"
"弱電設備工程","設備工程","08B","08"
"給排水設備工程","設備工程","08C","08"
"雨.污.廢水工程","設備工程","08D","08"
"消防及空調設備工程","設備工程","08E","08"
"通風設備工程","設備工程","08F","08"
"廚具工程","設備工程","08G","08"
"衛浴設備工程(住戶)","設備工程","08H","08"
"明鏡工程","設備工程","08I","08"
"電梯設備","設備工程","08J","08"
"空調設備","設備工程","08K","08"
"監控設備","設備工程","08L","08"
"照明工程","設備工程","08M","08"
"公設設備工程","設備工程","08N","08"
"公設雜項設備工程","設備工程","08O","08"
"洗窗機設備含安裝工程","設備工程","08O1","08"
"防火延燒設備含安裝工程","設備工程","08O2","08"
"機械停車設備","設備工程","08O3","08"
"住戶雜項設備公程","設備工程","08P","08"
"景觀植栽工程","景觀工程","09A","09"
"噴灌工程","景觀工程","09A","09"
"景觀給排水","景觀工程","09B","09"
"擺飾工程","景觀工程","09B","09"
"花架工程","景觀工程","09B","09"
"景觀防水工程","景觀工程","09C","09"
"景觀牆面泥作工程","景觀工程","09D","09"
"GF截水溝石材工程","景觀工程","09G","09"
"FRP工程","景觀工程","09G","09"
"透水混凝土","景觀工程","09G","09"
"景觀石材工程","景觀工程","09G","09"
"圍牆工程","景觀工程","09G","09"
"景觀油漆","景觀工程","09G","09"
"RF景觀工程","景觀工程","09H","09"
"RF假設工程","景觀工程","09H","09"
"RF給排水","景觀工程","09H","09"
"景觀金屬工程","景觀工程","09L","09"
"GRC假山","景觀工程","09M","09"
"景觀工程","景觀工程","09N","09"
"景觀材料","景觀工程","09X","09"
"景觀零星工程","景觀工程","09X","09"
"景觀工程管理費","景觀工程","09X","09"
"一樓大廳裝修工程","公設大廳","10A","10"
"公設大廳石材工程","公設大廳","10B","10"
"公設大廳石材梯腳","公設大廳","10C","10"
"梯廳導盲磚","公設大廳","10D","10"
"大廳人造石工程","公設大廳","10E","10"
"大廳金屬工程","公設大廳","10F","10"
"大廳燈具工程","公設大廳","10G","10"
"大廳燈控工程","公設大廳","10H","10"
"電動金屬門工程","門窗工程","07C-C","07"
"金屬門工程","門窗工程","07C-B","07"
"防火木門工程","門窗工程","07C-A","07"
"防火玻璃門窗","門窗工程","070D-A","07"
"電動不鏽鋼門窗","門窗工程","07C-D","07"
"鋁百葉窗","門窗工程","07D-B","07"
"電動百葉窗","門窗工程","07D-C","07"
"防火百葉窗","門窗工程","07D-D","07"
"電動防火百葉窗","門窗工程","07D-E","07"
"金屬隔柵工程","外飾工程",,"06"
"木地板","內裝工程","05","05"
"檯面","設備工程","08","08"















L2b


ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"次工項\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"次工項","工項","工項: 工項編號"
"木作天花板","木作天花","05B"
"木作天花板油漆","木作天花","05B"
"木作天花板骨架","木作天花","05B"
"金屬天花板面","金屬天花","05C"
"金屬天花板骨架","金屬天花","05C"
"油漆","油漆工程","05S"
"油漆矽利康","油漆工程","05S"
"玄關門框扇","玄關門","07A"
"玄關門門檻","玄關門","07A"
"玄關門門檻矽利康","玄關門","07A"
"玄關門五金","玄關門","07A"
"玄關門氣密條","玄關門","07A"
"玄關門電子鎖","玄關門","07A"
"金屬門門框","金屬門工程","07C-B"
"門框矽利康","金屬門工程","07C-B"
"金屬門門扇","金屬門工程","07C-B"
"金屬門門檻","金屬門工程","07C-B"
"門檻矽利康","金屬門工程","07C-B"
"金屬門五金","金屬門工程","07C-B"
"金屬門門五金","金屬門工程","07C-B"
"防火金屬門門框","防火門工程","07C"
"門框矽利康","防火門工程","07C"
"防火金屬門門扇","防火門工程","07C"
"防火金屬門門檻","防火門工程","07C"
"門檻矽利康","防火門工程","07C"
"防火金屬門門五金","防火門工程","07C"
"電動金屬門門框","電動金屬門工程","07C-C"
"門框矽利康","電動金屬門工程","07C-C"
"電動金屬門門扇","電動金屬門工程","07C-C"
"電動金屬門門檻","電動金屬門工程","07C-C"
"門檻矽利康","電動金屬門工程","07C-C"
"電動金屬門門五金","電動金屬門工程","07C-C"
"木門門框","木門工程","07B"
"門框矽利康","木門工程","07B"
"木門門扇","木門工程","07B"
"下降壓條","木門工程","07B"
"木門五金","木門工程","07B"
"防火木門框","防火木門工程","07C-A"
"防火木門門框矽利康","防火木門工程","07C-A"
"防火木門扇","防火木門工程","07C-A"
"防火木門五金","防火木門工程","07C-A"
"門窗框","防火玻璃門窗","070D-A"
"門窗玻璃","防火玻璃門窗","070D-A"
"門窗紗窗","防火玻璃門窗","070D-A"
"門窗框五金","防火玻璃門窗","070D-A"
"門窗框矽利康","防火玻璃門窗","070D-A"
"門窗五金配件(含鎖)","防火玻璃門窗","070D-A"
"門窗框","不鏽鋼窗","07E"
"門窗玻璃","不鏽鋼窗","07E"
"門窗紗窗","不鏽鋼窗","07E"
"門窗框五金","不鏽鋼窗","07E"
"門窗框矽利康","不鏽鋼窗","07E"
"門窗五金配件(含鎖)","不鏽鋼窗","07E"
"門窗框","電動不鏽鋼門窗","07C-D"
"門窗玻璃","電動不鏽鋼門窗","07C-D"
"門窗紗窗","電動不鏽鋼門窗","07C-D"
"門窗框五金","電動不鏽鋼門窗","07C-D"
"門窗框矽利康","電動不鏽鋼門窗","07C-D"
"門窗五金配件(含鎖)","電動不鏽鋼門窗","07C-D"
"門窗框","鋁門窗工程","07D"
"玻璃","鋁門窗工程","07D"
"玻璃矽利康","鋁門窗工程","07D"
"紗窗","鋁門窗工程","07D"
"膠條","鋁門窗工程","07D"
"五金配件","鋁門窗工程","07D"
"五金配件(含鎖)","鋁門窗工程","07D"
"矽利康","鋁門窗工程","07D"
"鋁百頁窗","鋁百葉窗","07D-B"
"矽利康","鋁百葉窗","07D-B"
"電動鋁百葉","電動百葉窗","07D-C"
"矽利康","電動百葉窗","07D-C"
"門窗五金配件(含鎖)","電動百葉窗","07D-C"
"防火百葉框扇","防火百葉窗","07D-D"
"矽利康","防火百葉窗","07D-D"
"門窗五金配件(含鎖)","防火百葉窗","07D-D"
"電動防火百葉","電動防火百葉窗","07D-E"
"矽利康","電動防火百葉窗","07D-E"
"門窗五金配件(含鎖)","電動防火百葉窗","07D-E"
"門窗框","金屬隔柵工程",
"門窗玻璃","金屬隔柵工程",
"門窗紗窗","金屬隔柵工程",
"門窗框五金","金屬隔柵工程",
"門窗框矽利康","金屬隔柵工程",
"門窗五金配件(含鎖)","金屬隔柵工程",
"木地板","木地板","05"
"矽利康","木地板","05"
"地磚","地坪貼磚工程","05M"
"地磚填縫","地坪貼磚工程","05M"
"門檻","地坪貼磚工程","05M"
"矽利康","地坪貼磚工程","05M"
"收邊鋁飾條","地坪貼磚工程","05M"
"檯面",,
"檯面矽利康",,
"浴櫃",,
"浴櫃五金",,
"明鏡",,
"鏡櫃門板",,
"鏡櫃五金",,
"淋浴五金",,
"淋浴矽利康",,
"淋浴門檻",,
"淋浴玻璃",,
"淋浴膠條",,
"面盆",,
"面盆龍頭",,
"檯面",,
"浴櫃",,
"馬桶",,
"淋浴龍頭組",,
"淋浴滑桿",,
"暖風機",,
"換氣扇",,
"明鏡",,
"鏡箱",,
"置物架",,
"毛巾架",,
"浴缸",,
"浴缸花灑龍頭",,
"01戶內居室110V與220V插座測試",,
"02戶內居室照明與開關測試",,
"03戶內開關箱回路測試",,
"04開關箱附圖與回路標示、清潔",,
"05戶內各居室電話.電視.網路插座測試",,
"06戶內整合箱的弱電模組(電視、電話、網路)與各出口測試",,
"07中華電信光電轉換器",,
"08電視有線與無線切換器",,
"09主.客浴馬桶給排水廁所測試",,
"10主.客浴臉盆給排水測試",,
"11主.客浴淋浴給排水及地板排水測試",,
"12室外機與室內機冷氣排水口測試",,
"13廚房洗槽給排水與地板排水測試",,
"14工作陽台洗衣機.洗槽給排水與地板排水測試及給水壓力錶說明",,
"15戶內居室與廚房感知器(定溫&偵煙&瓦斯)數量說明測試",,
"16戶內居室灑水頭數量與灑水壓力錶(工作陽台)說明。",,
"1.大門門口機&戶內對機講,對講通話測試",,
"2.戶內對講機&物管櫃檯雙向,對講通話測試",,
"3.瓦斯偵漏&一氧化碳二合一偵測器測試",,
"4.主臥室緊急求救壓扣強壓測試",,
"5.戶內防盜保全設定與防盜警報測試",,
"1.門口機 (內建彩色攝影機)",,
"2.對講機（7吋液晶觸控式）",,
"3.瓦斯偵漏&一氧化碳二合一偵測器",,
"4.緊急求救壓扣",,
"5.門窗隱藏式磁簧",,
"排油煙機",,
"瓦斯爐 或 IH爐",,
"不鏽鋼水槽",,
"廚房水槽龍頭",,
"洗碗機",,
"烘碗機",,
"淨水器 及 出水龍頭",,
"吊櫃 LED燈",,
"廚櫃 門板",,
"廚櫃 抽屜",,
"櫥櫃 踢腳板",,
"廚具檯面",,
"廚具 附品",,
"烤漆玻璃",,
"1不鏽鋼水槽蓄水排水測試，多功能龍頭冷熱出水測試(不含淨水器)。",,
"2水槽下櫃冷水、排水三角凡而開關測試(淨水器說明)",,
"4櫃體、檯面外觀檢視，矽利康收尾等檢查。",,
"5油煙機與烘碗機/洗碗機送電測試(操作詳說明書)。",,
"鋼索及升降配件",,
"曬衣桿",,
"外牆FRP",,
"外牆矽利康 (磁磚)",,
"外牆",,
"金屬欄杆",,
"陽台金屬收邊條",,
"電動金屬捲門",,
"矽利康",,
"門窗五金配件(含鎖)",,
"防火電動捲門",,
"矽利康",,
"門窗五金配件(含鎖)",,
"電動快速捲門",,
"矽利康",,
"門窗五金配件(含鎖)",,
"台電防火門門框",,
"門框矽利康",,
"台電防火門門扇",,
"台電防火門門檻",,
"門檻矽利康",,
"台電防火門門五金",,
"鋁百頁",,
"輕隔間板面",,
"毛胚完成面防水",,
"泥作粉刷",,
"泥作",,
"陽台壁磚",,
"陽台地磚",,
"冷媒管導槽",,
"空調室外機",,
"踢腳板",,
"矽利康",,
"客戶需求或意見",,
"戶內開關箱、智能箱",,
"照明及開關回路",,
"動力、插座  電源",,
"電話、電視、網路",,
"消防探測器",,
"冷氣排水",,
"浴室.廚房排水",,
"陽台排水",,
"陽台龍頭",,
"玄關7吋影像室內對講主機",,
"外玄關對講門口子機",,
"崁入式磁簧開關",,
"緊急押扣",,
"廚房瓦斯+一氧化碳複合式警報器",,
"廚具設備",,
"壁磚",,
"壁磚填縫",,
"矽利康",,
"收邊鋁飾條",,
"油漆平頂",,
"其他金屬欄杆",,
"鏡櫃",,










L2c



ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field ClientSideComponentId=\"00000000-0000-0000-0000-000000000000\" DisplayName=\"責任廠商\" Format=\"Dropdown\" MaxLength=\"255\" Name=\"_x4fee__x7e55_\" Title=\"責任廠商\" Type=\"Text\" ID=\"{0850582f-69f5-4a39-85c5-c3a69a5cc585}\" StaticName=\"_x4fee__x7e55_\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"缺失項目\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"缺失項目","次工項","責任廠商"
"不平整","木作天花板",
"溝縫不平整","木作天花板",
"髒污","木作天花板油漆",
"完成面需修補","木作天花板油漆",
"矽利康瑕疵","木作天花板油漆",
"固定五金安裝缺失","木作天花板骨架",
"天花板內清潔","木作天花板骨架",















L3



ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field CommaSeparator=\"TRUE\" CustomUnitOnRight=\"TRUE\" Decimals=\"4\" DisplayName=\"PointX\" Format=\"Dropdown\" IsModern=\"TRUE\" Name=\"PointX\" Percentage=\"FALSE\" Title=\"PointX\" Type=\"Number\" Unit=\"None\" ID=\"{d2cb50d6-8248-44aa-853e-ea4db2b8c249}\" StaticName=\"PointX\" />","<Field CommaSeparator=\"TRUE\" CustomUnitOnRight=\"TRUE\" Decimals=\"4\" DisplayName=\"PointY\" Format=\"Dropdown\" IsModern=\"TRUE\" Name=\"PointY\" Percentage=\"FALSE\" Title=\"PointY\" Type=\"Number\" Unit=\"None\" ID=\"{3c665703-e53f-47c6-a94e-7802ba371535}\" StaticName=\"PointY\" />","<Field ClientSideComponentId=\"00000000-0000-0000-0000-000000000000\" CustomFormatter=\"{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;flex-wrap&quot;:&quot;wrap&quot;,&quot;display&quot;:&quot;flex&quot;},&quot;children&quot;:[{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;box-sizing&quot;:&quot;border-box&quot;,&quot;padding&quot;:&quot;4px 8px 5px 8px&quot;,&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;display&quot;:&quot;flex&quot;,&quot;border-radius&quot;:&quot;16px&quot;,&quot;height&quot;:&quot;24px&quot;,&quot;align-items&quot;:&quot;center&quot;,&quot;white-space&quot;:&quot;nowrap&quot;,&quot;margin&quot;:&quot;4px 4px 4px 4px&quot;},&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;未施工&quot;]},&quot;sp-css-backgroundColor-BgLightGray sp-css-borderColor-LightGrayFont sp-css-color-LightGrayFont sp-css-color-LightGrayFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;待改善&quot;]},&quot;sp-css-backgroundColor-BgCoral sp-css-borderColor-CoralFont sp-css-color-CoralFont sp-css-color-CoralFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;修繕完成&quot;]},&quot;sp-css-backgroundColor-BgCyan sp-css-borderColor-CyanFont sp-css-color-CyanFont sp-css-color-CyanFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;已結案&quot;]},&quot;sp-css-backgroundColor-BgMintGreen sp-css-borderColor-MintGreenFont sp-css-color-MintGreenFont sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;&quot;]},&quot;&quot;,&quot;sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary&quot;]}]}]}]}]}},&quot;children&quot;:[{&quot;elmType&quot;:&quot;span&quot;,&quot;style&quot;:{&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;padding&quot;:&quot;0 3px&quot;},&quot;txtContent&quot;:&quot;[$_x72c0__x614b_]&quot;,&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;未施工&quot;]},&quot;sp-css-color-LightGrayFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;待改善&quot;]},&quot;sp-css-color-CoralFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;修繕完成&quot;]},&quot;sp-css-color-CyanFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;已結案&quot;]},&quot;sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;[$_x72c0__x614b_]&quot;,&quot;&quot;]},&quot;&quot;,&quot;&quot;]}]}]}]}]}}}]}],&quot;rulesOrder&quot;:[4,0,1,2,3,5],&quot;templateId&quot;:&quot;BgColorChoicePill&quot;}\" DisplayName=\"狀態\" FillInChoice=\"FALSE\" Format=\"Dropdown\" Name=\"_x72c0__x614b_\" Title=\"狀態\" Type=\"Choice\" ID=\"{5beb9f9a-74d6-46be-a925-083271411ce7}\" StaticName=\"_x72c0__x614b_\"><CHOICES><CHOICE>未施工</CHOICE><CHOICE>待改善</CHOICE><CHOICE>修繕完成</CHOICE><CHOICE>已結案</CHOICE></CHOICES></Field>","<Field DisplayName=\"缺失照片\" Format=\"Thumbnail\" IsModern=\"TRUE\" Name=\"_x7f3a__x5931__x7167__x7247_\" Title=\"缺失照片\" Type=\"Thumbnail\" ID=\"{9434e939-0d87-4b84-aaf2-7b4683de9e11}\" StaticName=\"_x7f3a__x5931__x7167__x7247_\" />","<Field DisplayName=\"改善照片\" Format=\"Thumbnail\" IsModern=\"TRUE\" Name=\"_x6539__x5584__x7167__x7247_\" Title=\"改善照片\" Type=\"Thumbnail\" ID=\"{7fa2df05-eff7-4824-9291-a57e8e690f81}\" StaticName=\"_x6539__x5584__x7167__x7247_\" />","<Field DisplayName=\"階段名稱\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x968e__x6bb5__x540d__x7a31_\" Title=\"階段名稱\" Type=\"Text\" ID=\"{2f1dd2a9-49f0-476a-a704-b3128c58189e}\" StaticName=\"_x968e__x6bb5__x540d__x7a31_\" />","<Field DisplayName=\"工項\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x5de5__x9805_\" Title=\"工項\" Type=\"Text\" ID=\"{de21a31a-4551-4e2f-a3d3-bc9d07a17ac3}\" StaticName=\"_x5de5__x9805_\" />","<Field DisplayName=\"次工項\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x6b21__x5de5__x9805_\" Title=\"次工項\" Type=\"Text\" ID=\"{f7bf5a84-d306-4c25-9b63-ffdee5c2330e}\" StaticName=\"_x6b21__x5de5__x9805_\" />","<Field AppendOnly=\"FALSE\" DisplayName=\"缺失描述\" Format=\"Dropdown\" IsModern=\"TRUE\" IsolateStyles=\"FALSE\" Name=\"_x7f3a__x5931__x63cf__x8ff0_\" RichText=\"FALSE\" RichTextMode=\"Compatible\" Title=\"缺失描述\" Type=\"Note\" ID=\"{54f4195e-722d-4a7b-8616-20959950f3e8}\" StaticName=\"_x7f3a__x5931__x63cf__x8ff0_\" />","<Field DisplayName=\"負責廠商\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x8ca0__x8cac__x5ee0__x5546_\" Title=\"負責廠商\" Type=\"Text\" ID=\"{b7eb8089-4636-4f9d-91fc-1562024e4769}\" StaticName=\"_x8ca0__x8cac__x5ee0__x5546_\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"自動生成 ID\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"自動生成 ID","樓層戶別","點位關聯","階段名稱","工項","次工項","缺失內容","狀態","缺失照片","改善照片","缺失描述","負責廠商","PointX","PointY","樓層戶別: 棟別","樓層戶別: 樓層"
"02F-A01-2025MM31170756","02F-A01","04","內裝工程","木作天花","木作天花板骨架","溝縫不平整","已完成","Reserved_ImageAttachment_[28]_[_x7f3a__x5931__x7167__x7247_][32]_[ee6941e191654092ab8fc52ff7ce52f2][1]_[1].jpeg","Reserved_ImageAttachment_[28]_[_x6539__x5584__x7167__x7247_][32]_[1be2153607a944e9932b2caf1dbff397][1]_[3].jpeg","001122",,,,"A","02F"
"02F-A01-2025MM31171629","02F-A01","04","內裝工程","木作天花","木作天花板",,"待改善",,,,,,,"A","02F"















L3_05



ListSchema={"schemaXmlList":["<Field ID=\"{fa564e0f-0c70-4ab9-b863-0177e6ddd247}\" Type=\"Text\" Name=\"Title\" DisplayName=\"標題\" Required=\"FALSE\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"Title\" FromBaseType=\"TRUE\" MaxLength=\"255\" />","<Field DisplayName=\"工項\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x5de5__x9805_\" Title=\"工項\" Type=\"Text\" ID=\"{df583825-204c-4439-bec1-861990d0ee8b}\" StaticName=\"_x5de5__x9805_\" />","<Field DisplayName=\"次工項\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x6b21__x5de5__x9805_\" Title=\"次工項\" Type=\"Text\" ID=\"{a2cffa89-1bf5-4474-81a4-248747de35f6}\" StaticName=\"_x6b21__x5de5__x9805_\" />","<Field DisplayName=\"缺失內容\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x7f3a__x5931__x5167__x5bb9_\" Title=\"缺失內容\" Type=\"Text\" ID=\"{d761e1b9-34e3-4aa2-adb8-2a0e581ebcae}\" StaticName=\"_x7f3a__x5931__x5167__x5bb9_\" />","<Field DisplayName=\"責任廠商\" Format=\"Dropdown\" IsModern=\"TRUE\" MaxLength=\"255\" Name=\"_x8cac__x4efb__x5ee0__x5546_\" Title=\"責任廠商\" Type=\"Text\" ID=\"{0792434a-7e92-4bc8-8df4-9ef33139bc89}\" StaticName=\"_x8cac__x4efb__x5ee0__x5546_\" Indexed=\"TRUE\" />","<Field CustomFormatter=\"{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;flex-wrap&quot;:&quot;wrap&quot;,&quot;display&quot;:&quot;flex&quot;},&quot;children&quot;:[{&quot;elmType&quot;:&quot;div&quot;,&quot;style&quot;:{&quot;box-sizing&quot;:&quot;border-box&quot;,&quot;padding&quot;:&quot;4px 8px 5px 8px&quot;,&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;display&quot;:&quot;flex&quot;,&quot;border-radius&quot;:&quot;16px&quot;,&quot;height&quot;:&quot;24px&quot;,&quot;align-items&quot;:&quot;center&quot;,&quot;white-space&quot;:&quot;nowrap&quot;,&quot;margin&quot;:&quot;4px 4px 4px 4px&quot;},&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;待改善&quot;]},&quot;sp-css-backgroundColor-BgCoral sp-css-borderColor-CoralFont sp-field-fontSizeSmall sp-css-color-CoralFont sp-css-color-CoralFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;修繕完成&quot;]},&quot;sp-css-backgroundColor-BgCyan sp-css-borderColor-CyanFont sp-field-fontSizeSmall sp-css-color-CyanFont sp-css-color-CyanFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;複驗合格&quot;]},&quot;sp-css-backgroundColor-BgMintGreen sp-css-borderColor-MintGreenFont sp-field-fontSizeSmall sp-css-color-MintGreenFont sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;&quot;]},&quot;&quot;,&quot;sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary&quot;]}]}]}]}},&quot;children&quot;:[{&quot;elmType&quot;:&quot;span&quot;,&quot;style&quot;:{&quot;overflow&quot;:&quot;hidden&quot;,&quot;text-overflow&quot;:&quot;ellipsis&quot;,&quot;padding&quot;:&quot;0 3px&quot;},&quot;txtContent&quot;:&quot;@currentField&quot;,&quot;attributes&quot;:{&quot;class&quot;:{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;待改善&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-CoralFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;修繕完成&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-CyanFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;複驗合格&quot;]},&quot;sp-field-fontSizeSmall sp-css-color-MintGreenFont&quot;,{&quot;operator&quot;:&quot;:&quot;,&quot;operands&quot;:[{&quot;operator&quot;:&quot;==&quot;,&quot;operands&quot;:[&quot;@currentField&quot;,&quot;&quot;]},&quot;&quot;,&quot;&quot;]}]}]}]}}}]}],&quot;templateId&quot;:&quot;BgColorChoicePill&quot;}\" DisplayName=\"狀態\" FillInChoice=\"FALSE\" Format=\"Dropdown\" IsModern=\"TRUE\" Name=\"_x72c0__x614b_\" Title=\"狀態\" Type=\"Choice\" ID=\"{40dc30bf-4d9c-4112-aec9-5bd69c9e0450}\" StaticName=\"_x72c0__x614b_\" Indexed=\"TRUE\"><CHOICES><CHOICE>待改善</CHOICE><CHOICE>修繕完成</CHOICE><CHOICE>複驗合格</CHOICE></CHOICES><Default>待改善</Default></Field>","<Field DisplayName=\"缺失照片\" Format=\"Thumbnail\" IsModern=\"TRUE\" Name=\"_x7f3a__x5931__x7167__x7247_\" Title=\"缺失照片\" Type=\"Thumbnail\" ID=\"{420ae172-3f56-4d0b-9f91-4151b417f772}\" StaticName=\"_x7f3a__x5931__x7167__x7247_\" />","<Field DisplayName=\"改善照片\" Format=\"Thumbnail\" IsModern=\"TRUE\" Name=\"_x6539__x5584__x7167__x7247_\" Title=\"改善照片\" Type=\"Thumbnail\" ID=\"{0d89161b-5a44-479b-a9b4-107c90c1513c}\" StaticName=\"_x6539__x5584__x7167__x7247_\" />","<Field ID=\"{82642ec8-ef9b-478f-acf9-31f7d45fbc31}\" DisplayName=\"標題\" Description=\"\" Name=\"LinkTitle\" SourceID=\"http://schemas.microsoft.com/sharepoint/v3\" StaticName=\"LinkTitle\" Type=\"Computed\" ReadOnly=\"TRUE\" FromBaseType=\"TRUE\" Width=\"150\" DisplayNameSrcField=\"Title\" Sealed=\"FALSE\"><FieldRefs><FieldRef Name=\"Title\" /><FieldRef Name=\"LinkTitleNoMenu\" /><FieldRef Name=\"_EditMenuTableStart2\" /><FieldRef Name=\"_EditMenuTableEnd\" /></FieldRefs><DisplayPattern><FieldSwitch><Expr><GetVar Name=\"FreeForm\" /></Expr><Case Value=\"TRUE\"><Field Name=\"LinkTitleNoMenu\" /></Case><Default><HTML><![CDATA[<div class=\"ms-vb itx\" onmouseover=\"OnItem(this)\" CTXName=\"ctx]]></HTML><Field Name=\"_EditMenuTableStart2\" /><HTML><![CDATA[\">]]></HTML><Field Name=\"LinkTitleNoMenu\" /><HTML><![CDATA[</div>]]></HTML><HTML><![CDATA[<div class=\"s4-ctx\" onmouseover=\"OnChildItem(this.parentNode); return false;\">]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[<a onfocus=\"OnChildItem(this.parentNode.parentNode); return false;\" onclick=\"PopMenuFromChevron(event); return false;\" href=\"javascript:;\" title=\"開啟功能表\"></a>]]></HTML><HTML><![CDATA[<span>&nbsp;</span>]]></HTML><HTML><![CDATA[</div>]]></HTML></Default></FieldSwitch></DisplayPattern></Field>"]}
"標題","樓層戶別","點位座標","工項","次工項","缺失內容","責任廠商","狀態","缺失照片","改善照片"















































