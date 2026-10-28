import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { ElMessage } from 'element-plus'
import { getAutomationToolTitle } from '@/modules/automation/utils/resourcePresentation'

function normalizeHostSelection(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeHostItem(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return []
    }

    try {
      const parsedValue = JSON.parse(trimmedValue)
      return normalizeHostSelection(parsedValue)
    } catch {
      return trimmedValue
        .split(',')
        .map(item => normalizeHostItem(item.trim()))
        .filter(Boolean)
    }
  }

  return value ? [normalizeHostItem(value)].filter(Boolean) : []
}

function normalizeHostItem(item) {
  if (!item) {
    return null
  }

  if (typeof item === 'string') {
    return {
      key: item,
      value: item
    }
  }

  if (typeof item !== 'object') {
    const normalizedValue = String(item)
    return {
      key: normalizedValue,
      value: normalizedValue
    }
  }

  return {
    ...item,
    key: item.key || item.id || item.host_key || item.value || '',
    value:
      item.value ||
      item.name ||
      item.hostname ||
      item.ip ||
      item.host_key ||
      item.key ||
      item.id ||
      '',
    assetType: item.assetType || item.ciType || item.asset_type || ''
  }
}

function normalizeParamDefaultValue(param, value) {
  if (param?.type === 'host') {
    return normalizeHostSelection(value)
  }
  return value ?? ''
}

function normalizeCronJobType(jobType) {
  return jobType === 'cac' ? 'audit' : jobType
}

function isAuditJobType(jobType) {
  return normalizeCronJobType(jobType) === 'audit'
}

/**
 * CRON 任务表单管理
 * 处理表单数据、作业列表加载、表单提交等功能
 */
export function useCronJobForm(props, emit) {
  const formRef = ref(null)
  const submitting = ref(false)
  const initializing = ref(false)
  const initializationError = ref('')
  let initializationId = 0
  const jobList = ref([])
  const multipleJobIds = ref([])
  const isMultipleJobType = ref(false)
  const jobParams = ref([])

  const formData = ref({
    jobDesc: '',
    scheduleConf: '',
    triggerStatus: '1',
    jobId: '',
    jobParam: {},
    jobType: '',
    appCode: '', // Hidden compatibility field: keep defaults and edit round trips unchanged.
    logOutput: '1',
    isEncrypt: '1'
  })

  const validateJobSelection = (_, __, callback) => {
    const hasJobId = isMultipleJobType.value
      ? multipleJobIds.value.length > 0
      : !!formData.value.jobId

    if (hasJobId) {
      callback()
      return
    }

    callback(new Error('请选择执行运维工具'))
  }

  const formRules = {
    jobDesc: [{ required: true, message: '请输入任务描述', trigger: 'blur' }],
    logOutput: [{ required: true, message: '请选择是否输出日志', trigger: 'change' }],
    isEncrypt: [{ required: true, message: '请选择是否参数加密', trigger: 'change' }],
    scheduleConf: [{ required: true, message: '请输入Cron表达式', trigger: 'blur' }],
    jobType: [{ required: true, message: '请选择运维工具类型', trigger: 'change' }],
    jobId: [{ validator: validateJobSelection, trigger: 'change' }]
  }

  /**
   * 表单验证状态
   */
  const isFormValid = computed(() => {
    const hasJobId = isMultipleJobType.value
      ? multipleJobIds.value.length > 0
      : !!formData.value.jobId

    return (
      formData.value.jobDesc &&
      formData.value.logOutput &&
      formData.value.isEncrypt &&
      formData.value.scheduleConf &&
      formData.value.jobType &&
      hasJobId
    )
  })

  /**
   * 重置表单
   */
  function resetForm() {
    formData.value = {
      jobDesc: '',
      scheduleConf: '',
      triggerStatus: '1',
      jobId: '',
      jobParam: {},
      jobType: '',
      appCode: '',
      logOutput: '1',
      isEncrypt: '1'
    }
    multipleJobIds.value = []
    jobList.value = []
    jobParams.value = []
    isMultipleJobType.value = false
  }

  /**
   * 加载编辑数据
   */
  async function loadEditData(id) {
    try {
      const response = await jaoApi.fetchCronJobById(id)
      const cronJob = response.data || response
      const normalizedJobType = normalizeCronJobType(cronJob.jobType)

      // 保存 jobId，因为 handleJobTypeChange 会清空它
      const savedJobId = cronJob.jobId

      formData.value = {
        jobDesc: cronJob.jobDesc,
        scheduleConf: cronJob.scheduleConf,
        triggerStatus: cronJob.triggerStatus,
        jobId: '',
        jobParam: cronJob.jobParam || {},
        jobType: normalizedJobType,
        appCode: cronJob.appCode || '',
        logOutput: cronJob.logOutput === true ? '0' : '1',
        isEncrypt: cronJob.isEncrypt === true ? '0' : '1'
      }

      // 加载运维工具列表
      await handleJobTypeChange(normalizedJobType)

      // 处理多选类型和单选类型的 jobId 回显
      const multipleTypes = ['audit', 'cmd', 'flows']
      if (multipleTypes.includes(normalizedJobType)) {
        multipleJobIds.value = savedJobId ? savedJobId.split(',') : []
        formData.value.jobId = savedJobId || ''
      } else {
        formData.value.jobId = savedJobId
      }

      // 加载参数
      if (cronJob.jobParam) {
        const params = []
        for (const [key, value] of Object.entries(cronJob.jobParam)) {
          const existingParam = jobParams.value.find(p => p.name === key)
          if (existingParam) {
            existingParam.defaultValue = normalizeParamDefaultValue(existingParam, value)
          } else {
            params.push({
              name: key,
              label: key,
              description: key,
              type: key === 'hosts' ? 'host' : 'string',
              defaultValue: key === 'hosts' ? normalizeHostSelection(value) : value,
              secret: false
            })
          }
        }
        if (params.length > 0) {
          jobParams.value = [...jobParams.value, ...params]
        }
      }

      // 如果是script/rest类型,加载运维工具参数定义
      if (!multipleTypes.includes(normalizedJobType) && cronJob.jobId) {
        try {
          const jobResponse = await jaoApi.fetchJobById(cronJob.jobId)
          const job = jobResponse.data || jobResponse
          if (job && job.params) {
            jobParams.value = job.params.map(param => ({
              ...param,
              defaultValue: normalizeParamDefaultValue(
                param,
                cronJob.jobParam[param.name] ?? param.defaultValue
              )
            }))
          }
        } catch (error) {
          console.warn('获取运维工具参数失败:', error)
        }
      }
    } catch (error) {
      ElMessage.error('获取任务详情失败')
      throw error
    }
  }

  /**
   * 处理运维工具类型变更
   */
  async function handleJobTypeChange(jobType, isCurrent = () => true) {
    const normalizedJobType = normalizeCronJobType(jobType)

    formData.value.jobType = normalizedJobType
    formData.value.jobId = ''
    multipleJobIds.value = []
    jobList.value = []

    const multipleTypes = ['audit', 'cmd', 'flows']
    isMultipleJobType.value = multipleTypes.includes(normalizedJobType)

    // 根据运维工具类型预设参数
    if (isAuditJobType(normalizedJobType)) {
      jobParams.value = [
        {
          name: 'annex_name',
          label: '自定义附件名称',
          description: '自定义附件名称',
          type: null,
          defaultValue: '',
          secret: false
        }
      ]
    } else if (normalizedJobType === 'cmd') {
      jobParams.value = [
        {
          name: 'hosts',
          label: '主机',
          description: '主机',
          type: 'host',
          defaultValue: [],
          secret: false
        }
      ]
    } else {
      jobParams.value = []
    }

    if (!normalizedJobType) return

    let loaded = true
    try {
      let response
      switch (normalizedJobType) {
        case 'script':
        case 'rest':
          response = await jaoApi.fetchJobsByType(normalizedJobType)
          if (!isCurrent()) return false
          jobList.value = response.data || response || []
          break
        case 'audit':
          response = await jaoApi.fetchCacJobs()
          if (!isCurrent()) return false
          jobList.value = response.data || response || []
          break
        case 'cmd':
          response = await jaoApi.fetchCmdJobs()
          if (!isCurrent()) return false
          jobList.value = response.data || response || []
          break
        case 'flows':
          response = await jaoApi.fetchFlowJobs()
          if (!isCurrent()) return false
          jobList.value = response.data || response || []
          break
      }
    } catch {
      if (isCurrent()) ElMessage.error('获取运维工具列表失败')
      loaded = false
    }

    await nextTick()
    if (!isCurrent()) return false
    formRef.value?.clearValidate?.('jobId')
    return loaded
  }

  /**
   * 处理运维工具变更
   */
  async function handleJobChange(jobId, isCurrent = () => true) {
    if (!jobId) return

    const multipleTypes = ['audit', 'cmd', 'flows']
    if (multipleTypes.includes(formData.value.jobType)) {
      return
    }

    try {
      const response = await jaoApi.fetchJobById(jobId)
      if (!isCurrent()) return null
      const job = response.data || response

      if (job && job.params) {
        jobParams.value = job.params.map(param => ({
          ...param,
          defaultValue: normalizeParamDefaultValue(param, param.defaultValue)
        }))
      }
      return job
    } catch (error) {
      if (isCurrent()) console.warn('获取运维工具参数失败:', error)
      return null
    }
  }

  async function initializeFromJob() {
    const source = props.initialJob && { id: props.initialJob.id, type: props.initialJob.type }
    if (!props.modelValue || props.editingId || !source) return
    const requestId = ++initializationId
    const isCurrent = () =>
      requestId === initializationId &&
      props.modelValue &&
      !props.editingId &&
      props.initialJob?.id === source.id &&
      props.initialJob?.type === source.type
    initializing.value = true
    initializationError.value = ''
    try {
      if (!source.id || !['script', 'rest'].includes(source.type)) {
        throw new Error('当前工具不支持快捷创建定时任务')
      }
      const loaded = await handleJobTypeChange(source.type, isCurrent)
      if (!isCurrent()) return
      if (!loaded || !Array.isArray(jobList.value)) {
        throw new Error('读取可选工具失败，请重新加载')
      }
      const selected = jobList.value.find(job => job.id === source.id)
      if (!selected || (selected.type && selected.type !== source.type)) {
        throw new Error('当前工具不在可选列表中，请取消后重新选择工具')
      }
      if (selected.needApprove || selected.isApproving) {
        throw new Error('当前工具需要审批，请取消后按原审批流程处理')
      }
      const detail = await handleJobChange(selected.id, isCurrent)
      if (!isCurrent()) return
      if (
        !detail ||
        typeof detail !== 'object' ||
        Array.isArray(detail) ||
        (!detail.id && !detail.type && !Array.isArray(detail.params))
      ) {
        throw new Error('读取工具参数失败，请重新加载')
      }
      if (
        (detail.id && detail.id !== selected.id) ||
        (detail.type && detail.type !== source.type)
      ) {
        throw new Error('工具信息已变化，请取消后重新选择工具')
      }
      if (detail.needApprove || detail.isApproving) {
        throw new Error('当前工具需要审批，请取消后按原审批流程处理')
      }
      formData.value.jobId = selected.id
    } catch (error) {
      if (isCurrent()) {
        formData.value.jobId = ''
        jobParams.value = []
        initializationError.value = error.message || '读取工具失败，请重新加载'
      }
    } finally {
      if (isCurrent()) initializing.value = false
    }
  }

  /**
   * 获取运维工具标签
   */
  function getJobLabel(job) {
    if (!job) return ''

    if (isAuditJobType(formData.value.jobType)) {
      return getAutomationToolTitle({ title: job.templateName }, '未命名巡检任务')
    }
    if (formData.value.jobType === 'cmd') {
      return getAutomationToolTitle({ name: job.name }, '未命名命令任务')
    }
    if (formData.value.jobType === 'flows') {
      return getAutomationToolTitle({ name: job.name }, '未命名流程任务')
    }
    return getAutomationToolTitle(job)
  }

  /**
   * 提交表单
   */
  async function handleSubmit() {
    if (initializing.value || initializationError.value) return
    if (!formRef.value) return

    // 验证运维工具选择
    if (!isMultipleJobType.value && !formData.value.jobId) {
      ElMessage.warning('请选择执行运维工具')
      return
    }
    if (isMultipleJobType.value && multipleJobIds.value.length === 0) {
      ElMessage.warning('请选择执行运维工具')
      return
    }

    try {
      await formRef.value.validate((valid, fields) => {
        if (fields && fields.jobId) {
          delete fields.jobId
        }
      })
    } catch (error) {
      if (error.jobId && Object.keys(error).length === 1) {
        // 只有 jobId 验证失败，已经在上面手动检查过了
      } else {
        return
      }
    }

    // cmd类型必须填写运行参数
    if (formData.value.jobType === 'cmd') {
      const hostsParam = jobParams.value.find(p => p.name === 'hosts')
      if (!hostsParam || !hostsParam.defaultValue || hostsParam.defaultValue.length === 0) {
        ElMessage.warning('运行参数为空,请输入运行参数!')
        return
      }
    }

    submitting.value = true
    try {
      // 处理多选作业ID
      let finalJobId = formData.value.jobId
      if (isMultipleJobType.value && multipleJobIds.value.length > 0) {
        finalJobId = multipleJobIds.value.join(',')
      }

      // 构建jobParam
      const jobParam = {}
      const multipleTypes = ['audit', 'cmd', 'flows']
      const needParams =
        multipleTypes.includes(formData.value.jobType) ||
        formData.value.jobType === 'script' ||
        formData.value.jobType === 'rest'

      if (
        needParams &&
        (multipleTypes.indexOf(formData.value.jobType) <= -1 ||
          formData.value.jobType === 'cmd' ||
          isAuditJobType(formData.value.jobType))
      ) {
        jobParams.value.forEach(param => {
          jobParam[param.name] =
            param.type === 'host' ? normalizeHostSelection(param.defaultValue) : param.defaultValue
        })
      }

      const payload = {
        ...formData.value,
        jobId: finalJobId,
        logOutput: formData.value.logOutput === '0',
        isEncrypt: formData.value.isEncrypt === '0',
        jobParam
      }

      if (props.editingId) {
        payload.id = props.editingId
        await jaoApi.updateCronJob(payload)
        ElMessage.success('更新成功')
      } else {
        await jaoApi.createCronJob(payload)
        ElMessage.success('创建成功')
      }

      emit('success')
      emit('update:modelValue', false)
    } catch (error) {
      ElMessage.error(error?.message || '操作失败')
    } finally {
      submitting.value = false
    }
  }

  // 监听编辑ID变化，加载编辑数据
  watch(
    multipleJobIds,
    async newValue => {
      if (!isMultipleJobType.value) {
        return
      }

      formData.value.jobId = newValue.join(',')
      await nextTick()
      formRef.value?.clearValidate?.('jobId')
    },
    { deep: true }
  )

  watch(
    () => props.editingId,
    async newId => {
      if (newId && props.modelValue) {
        await loadEditData(newId)
      }
    },
    { immediate: true }
  )

  // 新建可选地带入当前工具；普通新建和编辑仍沿用原默认值与读取流程。
  watch(
    () => [props.modelValue, props.editingId, props.initialJob?.id, props.initialJob?.type],
    ([visible]) => {
      initializationId++
      initializing.value = false
      initializationError.value = ''
      if (visible && !props.editingId) {
        resetForm()
        if (props.initialJob) void initializeFromJob()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    initializationId++
  })

  return {
    formRef,
    formData,
    formRules,
    submitting,
    initializing,
    initializationError,
    initializeFromJob,
    jobList,
    multipleJobIds,
    isMultipleJobType,
    jobParams,
    isFormValid,
    resetForm,
    loadEditData,
    handleJobTypeChange,
    handleJobChange,
    getJobLabel,
    handleSubmit
  }
}
