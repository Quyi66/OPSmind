# 漏洞紧急程度看板 · 前端对接说明（R2 Iter-2.5）

本次后端改动只有两处：

1. **新增** `GET /api/vap/v2/urgency/page` —— 大卡下钻分页接口。
2. **现有** `PUT /api/vap/v2/urgency/rule/{id}` —— 行为没变，但前端编辑表单要按下面的字段权限矩阵展示。

其他接口（`/statistics` / `/recompute` / `/lookup` / `/lookup/export` / `/rule`）一律未变。

---

## 1. 规则编辑表单 · 字段权限矩阵

| 列 | 是否允许编辑 | 控件 | 备注 |
|---|---|---|---|
| 资产网络区域 `location` | ❌ | 只读 Tag（置灰） | 唯一键 1/3 |
| CVE 利用程度 `exploit` | ❌ | 只读 Tag（置灰） | 唯一键 2/3，由 CVSS Vector 自动推导 |
| CVE 风险等级 `riskLevel` | ❌ | 只读 Tag（置灰） | 唯一键 3/3，由 CVSS 区间自动判定 |
| 漏洞紧急程度 `urgency` | ✅ | 下拉 | 4 档：`特急` / `紧急` / `普通` / `一般` |
| 启用状态 `enabled` | ✅ | 开关 | `1` / `0` |

- 不要提供"新增"按钮（36 个组合后端已全部种好）。
- 不要提供"硬删除"按钮（用 `enabled=0` 软停用）。
- 后端 PUT 实际只读 `urgency` 和 `enabled` 两个字段，传别的会被忽略。

---

## 2. 新增接口：大卡下钻

```
GET /api/vap/v2/urgency/page?urgency=特急&page=1&size=20
```

| 参数 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `urgency` | ✓ | — | `特急` / `紧急` / `普通` / `一般` |
| `page`    |   | 1   | 从 1 起，<1 自动归 1 |
| `size`    |   | 20  | 上限 200，超过自动截断 |

返回：

```json
{
  "urgency": "特急",
  "page": 1,
  "size": 20,
  "total": 211,
  "rows": [
    {
      "cveId": "CVE-2026-1234",
      "hostId": "host-uuid-xxx",
      "hostKey": "10.0.1.5",
      "osDistro": "kylin",
      "osVersion": "V10SP3",
      "osArch": "x86_64",
      "location": "互联网",
      "riskLevel": "特高危",
      "urgency": "特急",
      "cvss": 9.8,
      "patchId": "KYSA-2026-0123",
      "patchStatus": "no_repair",
      "affectedPkgs": "openssl-1.1.1-9.el8;openssl-libs-1.1.1-9.el8",
      "scanDate": "2026-05-26 05:45:59"
    }
  ]
}
```

字段说明：

- `location` 取自资产标签；未打 LOCATION 标签的主机为 `null`。
- `riskLevel` 由 CVSS 实时推导（不存库）：`特高危` / `高危` / `中危` / `低危`。
- `patchStatus` 是英文枚举原值，前端按下面映射成中文：
  - `no_repair` 未修复 / `is_repair` 已修复 / `is_repair_artificial` 人工已修复
  - `repairing` 修复中 / `repair_faild` 修复失败
  - `rolling_back` 回滚中 / `rolling_back_success` 回滚成功 / `rolling_back_faild` 回滚失败

---

## 3. 前端交互建议

- 主页 4 个大卡（`特急 / 紧急 / 普通 / 一般`）做成可点击，跳列表页带 `urgency` 参数。
- 列表页表头建议：CVE 编号 / 主机 IP / 操作系统 / 所处区域 / 风险等级 / 紧急程度 / 补丁状态 / 扫描时间 / 操作。
- 列表页可在客户端按 `location`、关键词等做二次过滤；如果数据量大，后续可以让后端再加过滤参数（本期不加）。

完。
