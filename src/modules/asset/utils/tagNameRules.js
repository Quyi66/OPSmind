export const TAG_NAME_FORMAT_MESSAGE = '标签名称只能包含中英文、数字、下划线和空格'

// 只允许普通空格；末尾断言也排除换行符，避免 $ 接受末尾换行。
const TAG_NAME_PATTERN = /^[A-Za-z0-9_\u4e00-\u9fff ]+(?![\s\S])/

export function createTagNameRules() {
  return [
    {
      required: true,
      whitespace: true,
      message: '请输入标签名称',
      trigger: ['blur', 'change']
    },
    {
      pattern: TAG_NAME_PATTERN,
      message: TAG_NAME_FORMAT_MESSAGE,
      trigger: ['blur', 'change']
    }
  ]
}
