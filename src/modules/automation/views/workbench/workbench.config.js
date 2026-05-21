export const WORKBENCH_LAUNCHER_DEFS = [
  {
    key: 'restJob',
    label: 'REST 作业',
    description: '直接封装接口调用，适合 API 集成、巡检校验和批量触发。',
    eyebrow: '作业创建',
    tone: 'accent',
    icon: 'fas fa-plug',
    permission: ['jobs'],
    action: 'create-rest-job',
    primaryLabel: '立即新建',
    secondaryLabel: '作业列表',
    secondaryTo: '/jao/jobs'
  },
  {
    key: 'scriptJob',
    label: '脚本作业',
    description: '把脚本库里的执行材料快速编排成可复用作业。',
    eyebrow: '作业创建',
    tone: 'success',
    icon: 'fas fa-file-code',
    permission: ['jobs', 'scripts'],
    action: 'create-script-job',
    primaryLabel: '立即新建',
    secondaryLabel: '脚本库',
    secondaryTo: '/gfs/scriptLibrary'
  },
  {
    key: 'commandJob',
    label: '命令作业',
    description: '将沉淀好的命令组合成标准作业，方便复用和审批。',
    eyebrow: '作业创建',
    tone: 'warning',
    icon: 'fas fa-terminal',
    permission: ['jobs', 'commands'],
    action: 'create-command-job',
    primaryLabel: '立即新建',
    secondaryLabel: '命令中心',
    secondaryTo: '/cmd/list'
  },
  {
    key: 'cronJob',
    label: '定时任务',
    description: '把已有作业纳入例行调度，统一控制启停和执行窗口。',
    eyebrow: '调度编排',
    tone: 'info',
    icon: 'fas fa-clock',
    permission: ['jobs'],
    action: 'create-cron-job',
    primaryLabel: '立即新建',
    secondaryLabel: '任务列表',
    secondaryTo: '/jao/taskScheduler'
  },
  {
    key: 'flow',
    label: '流程编排',
    description: '将多步自动化动作串成流程，统一管理输入、主机和步骤。',
    eyebrow: '高级编排',
    tone: 'default',
    icon: 'fas fa-network-wired',
    permission: ['jobs'],
    action: 'create-flow',
    primaryLabel: '立即新建',
    secondaryLabel: '流程列表',
    secondaryTo: '/jao/schedule'
  },
  {
    key: 'scriptFile',
    label: '脚本文件',
    description: '直接补充新的脚本材料，随后可立即转成脚本作业。',
    eyebrow: '执行材料',
    tone: 'success',
    icon: 'fas fa-scroll',
    permission: ['scripts'],
    action: 'create-script-file',
    primaryLabel: '立即新建',
    secondaryLabel: '脚本库',
    secondaryTo: '/gfs/scriptLibrary'
  },
  {
    key: 'uploadFile',
    label: '执行文件',
    description: '上传压缩包、模板和其它执行材料，供作业和流程直接引用。',
    eyebrow: '执行材料',
    tone: 'default',
    icon: 'fas fa-upload',
    permission: ['scripts'],
    action: 'upload-file',
    primaryLabel: '立即上传',
    secondaryLabel: '文件库',
    secondaryTo: '/gfs/fileLibrary'
  }
]

export const WORKBENCH_FLOW_DEFS = [
  {
    key: 'commandChain',
    title: '命令下发链路',
    description: '从沉淀命令到生成命令作业，再进入执行复盘。',
    tone: 'warning',
    icon: 'fas fa-terminal',
    permission: ['jobs', 'commands'],
    steps: ['沉淀命令', '生成作业', '执行复盘'],
    primaryAction: 'create-command-job',
    primaryLabel: '新建命令作业',
    secondaryTo: '/cmd/list',
    secondaryLabel: '进入命令中心'
  },
  {
    key: 'scriptChain',
    title: '脚本执行链路',
    description: '从脚本材料到脚本作业，再衔接定时任务和运行记录。',
    tone: 'success',
    icon: 'fas fa-file-code',
    permission: ['jobs', 'scripts'],
    steps: ['准备脚本', '生成作业', '纳入调度'],
    primaryAction: 'create-script-job',
    primaryLabel: '新建脚本作业',
    secondaryTo: '/gfs/scriptLibrary',
    secondaryLabel: '进入脚本库'
  },
  {
    key: 'scheduleChain',
    title: '例行调度链路',
    description: '把已有自动化动作统一纳入调度，聚焦启停和例行执行。',
    tone: 'info',
    icon: 'fas fa-clock',
    permission: ['jobs'],
    steps: ['选择作业', '设置 CRON', '跟踪结果'],
    primaryAction: 'create-cron-job',
    primaryLabel: '新增定时任务',
    secondaryTo: '/jao/taskScheduler',
    secondaryLabel: '查看调度列表'
  },
  {
    key: 'flowChain',
    title: '流程编排链路',
    description: '面向多步骤、多材料的复杂动作，把参数、主机和步骤收进一处。',
    tone: 'accent',
    icon: 'fas fa-project-diagram',
    permission: ['jobs'],
    steps: ['准备主机', '设计流程', '执行与复盘'],
    primaryAction: 'create-flow',
    primaryLabel: '新建流程',
    secondaryTo: '/jao/schedule',
    secondaryLabel: '进入流程编排'
  }
]
