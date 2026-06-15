import * as XLSX from 'xlsx'

export const URGENCY_RULE_TEMPLATE_FILENAME = '漏洞威胁等级规则导入模板.xlsx'
export const URGENCY_RULE_TEMPLATE_HEADERS = ['所处环境', '利用程度', '风险等级', '紧急程度']

const TEMPLATE_INSTRUCTIONS = [
  ['字段', '合法取值'],
  ['所处环境', '互联网 / 外联网 / 内网环境、孤岛环境'],
  ['利用程度', '可利用 / 可检测 / 尚不可利用'],
  ['风险等级', '特高危 / 高危 / 中危 / 低危'],
  ['紧急程度', '特急 / 紧急 / 普通 / 一般'],
  [],
  ['注意事项', '导入会全量覆盖当前租户的旧规则；请勿修改“规则”工作表的列名。']
]

export function downloadUrgencyRuleTemplate() {
  const workbook = XLSX.utils.book_new()
  const ruleSheet = XLSX.utils.aoa_to_sheet([URGENCY_RULE_TEMPLATE_HEADERS])
  const instructionSheet = XLSX.utils.aoa_to_sheet(TEMPLATE_INSTRUCTIONS)

  ruleSheet['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
  instructionSheet['!cols'] = [{ wch: 16 }, { wch: 64 }]

  XLSX.utils.book_append_sheet(workbook, ruleSheet, '规则')
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '填写说明')
  XLSX.writeFile(workbook, URGENCY_RULE_TEMPLATE_FILENAME)
}
