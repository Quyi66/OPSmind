# Windows KB 补丁知识库 — 前端接口文档

> 数据来源：Microsoft Update Catalog（`scripts/get_windows_kb.py` 在有网机器抓取，生成 SQL 离线导入
> `win_kb` / `win_kb_relation`，流程与 `win_cve` CVE 知识库一致，见 `scripts/windows/README.md`）。
> 知识库为全局数据（无租户）；「受影响主机」按当前租户反查扫描表 `vap2_curr_machine_status_win`。
> 网关前缀：经 `oplus-portal` 转发，前端调用路径为 `/oplus-portal/vap/api/...`，下文为转发后真实路径。
> 建表脚本：`docs/sql/20260610_win_kb.sql`。

基址：`/api/vap/v2/win-kb`

## 1. KB 知识库列表（分页、可过滤）

- `GET /api/vap/v2/win-kb/list?page=0&size=20`
- 过滤参数（均可选）：
  - `severity`：严重级别，`Critical|Important|Moderate|Low`（中文「严重/重要/中等/低危」也可）
  - `keyword`：KB 编号 / 标题 / 描述 / 关联 CVE 编号 模糊匹配（对应「输入 CVE / KB 号」搜索框）
  - `startDate` / `endDate`：补丁发布日期范围（`yyyy-MM-dd`）
- 排序：固定按发布日期倒序（最新的补丁在前）。
- 响应：

```json
{
  "content": [
    {
      "kbNumber": "KB5035853",
      "title": "2024-03 Cumulative Update for Windows 11 Version 22H2 (KB5035853)",
      "classification": "Security Updates",
      "msrcSeverity": "Critical",
      "publishDate": "2024-03-12",
      "sizeBytes": 825334169,
      "products": "Windows 11",
      "cveIds": "CVE-2026-20967,CVE-2026-21821",
      "maxCvss3Score": 8.8,
      "cveCount": 2
    }
  ],
  "totalElements": 120, "totalPages": 6, "size": 20, "number": 0, "first": true, "last": false
}
```

- `cveIds` / `maxCvss3Score` / `cveCount`：由 `win_cve_affected` / `win_cve` 按 KB 反查聚合，
  无关联 CVE 时分别为 `null` / `null` / `0`。
- `msrcSeverity`：非安全更新（如 Update Rollups）为 `null`。

## 2. KB 详情（元数据 + 取代关系链 + 关联 CVE）

- `GET /api/vap/v2/win-kb/detail/{kbNumber}`（`kbNumber` 可带或不带 `KB` 前缀）
- 响应：

```json
{
  "kbNumber": "KB5035853",
  "title": "2024-03 Cumulative Update for Windows 11 Version 22H2 (KB5035853)",
  "description": "Install this update to resolve issues in Windows. ...",
  "classification": "Security Updates",
  "msrcSeverity": "Critical",
  "severityLabel": "严重",
  "publishDate": "2024-03-12",
  "sizeBytes": 825334169,
  "products": "Windows 11",
  "supersedence": {
    "supersededBy": [
      { "kbNumber": "KB5036893", "title": "2024-04 Cumulative Update ... (KB5036893)" }
    ],
    "supersedes": [
      { "kbNumber": "KB5034765", "title": "2024-02 Cumulative Update ... (KB5034765)" }
    ],
    "supersedesChain": ["KB5035853", "KB5034765", "KB5033423"]
  },
  "totalCves": 2,
  "cves": [
    {
      "cveId": "CVE-2026-20967",
      "title": "Windows 内核权限提升漏洞",
      "severity": "Critical",
      "severityLabel": "严重",
      "cvss3Score": 8.8,
      "cvss3Vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
      "publicDate": "2026-03-10T08:00:00",
      "webUrl": "https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-20967",
      "products": "Windows 11 Version 22H2 for x64-based Systems"
    }
  ]
}
```

- 取代关系（「补丁依赖与更新链条关系」区域）：
  - `supersededBy`：**取代此补丁**的更新（更新的 KB）；为空数组时前端显示「无（当前为最新补丁分支）」。
  - `supersedes`：**此补丁取代**的历史更新（更老的 KB）。
  - `supersedesChain`：沿「此补丁取代」方向递归拼出的链条，首元素为本 KB，
    如 `KB5035853 → KB5034765 → KB5033423`。累积更新一次取代多个历史 KB 时每跳取最近的上一代
    （KB 编号最大者）；带环路保护，最深 20 跳。
- `cves`：该 KB 修复的 CVE（按严重级别、CVSS 降序），供「MSRC 多维风险矩阵」「CVSS 评分」展示；
  KB 未关联 CVE（非安全更新）时为空数组。
- 404：知识库未收录该 KB 时返回 `{"error": "KB not found: KBxxxx"}`。

## 3. 受影响主机（当前租户）

- `GET /api/vap/v2/win-kb/affected-hosts/{kbNumber}`
- 说明：按 KB 反查当前租户扫描表 `vap2_curr_machine_status_win`，供「全网待修复资产」区域展示。
- 响应：

```json
{
  "kbNumber": "KB5035853",
  "totalHosts": 42,
  "missingHosts": 40,
  "hosts": [
    {
      "hostId": "<host_id>",
      "hostKey": "10.21.4.12",
      "osDistro": "Windows Server 2022 Datacenter",
      "osVersion": "10.0.20348.2461",
      "osArch": "AMD64",
      "patchStatus": "no_repair",
      "patchStatusLabel": "未修复",
      "scanDate": "2026-06-05 12:31:41"
    }
  ]
}
```

- `missingHosts`：`patchStatus=no_repair` 的主机数；其余状态（修复中/待重启等）见
  `windows-patch-frontend-api.md` §6.1 字典，`patchStatusLabel` 已给出中文。

## 4. 统计概览

- `GET /api/vap/v2/win-kb/statistics`
- 响应：

```json
{
  "totalKbs": 1380,
  "bySeverity": { "严重": 14, "重要": 28, "中等": 6, "低危": 1, "未指定": 1331 },
  "repairedKbCount": 1245,
  "missingKbCount": 42
}
```

- `totalKbs` / `bySeverity`：知识库（`win_kb`）全局统计。
- `repairedKbCount` / `missingKbCount`：当前租户扫描表中已修复 / 待修复的 KB 数（去重），
  对应页面顶部「14 严重 28 重要 1245 已修补」类统计。

## 5. 数据维护流程

1. 有网机器：`python get_windows_cve.py 2026 --sql` 产出 CVE 知识库 + `windows_cve_affected.json`；
2. 有网机器：`python get_windows_kb.py --from-cve-json windows_cve_affected.json --sql --resume`
   产出 `windows_kb_import.sql`（断点续抓，重复执行只抓新 KB）；
3. 内网库依次导入 `windows_cve_import.sql`、`windows_kb_import.sql`（均可重复导入，
   KB 侧为 `ON DUPLICATE KEY UPDATE` 增量更新）。
