import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import GfsFileSelector from '@/modules/automation/components/job/schedule/components/GfsFileSelector.vue'
import FlowEditor from '@/modules/automation/components/job/schedule/components/FlowEditor.vue'
import * as gfsApi from '@/modules/automation/api/gfs'
import * as jaoApi from '@/modules/automation/api/jao'
import { ElMessage } from 'element-plus'

vi.mock('@/modules/automation/api/gfs', () => ({ listFiles: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => ({
  fetchFlowDetail: vi.fn(),
  saveFlow: vi.fn(),
  createFlowInstance: vi.fn()
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { name: 'AcmDeviceSelector', template: '<div />' }
}))

const slots = { template: '<div><slot /><slot name="label" /><slot name="footer" /></div>' }
const dialog = {
  props: ['modelValue'],
  template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>'
}
const button = defineComponent({
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>'
})
const input = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<div><input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" /><slot name="append" /></div>`
}
const global = {
  stubs: {
    'el-dialog': dialog,
    'el-drawer': dialog,
    'el-button': button,
    'el-input': input,
    'el-input-number': input,
    'el-form': slots,
    'el-form-item': slots,
    'el-row': slots,
    'el-col': slots,
    'el-tooltip': slots,
    'el-select': slots,
    'el-option': true,
    'el-checkbox': slots,
    'el-icon': slots,
    'el-breadcrumb': slots,
    'el-breadcrumb-item': slots,
    'el-alert': { props: ['title'], template: '<aside>{{ title }}<slot /></aside>' },
    'el-empty': { props: ['description'], template: '<p>{{ description }}</p>' }
  },
  directives: { loading: () => {} }
}
const wrappers = []
const original = Object.freeze({
  path: 'stored/a.yml',
  config: '--raw #{scope}',
  tag: 'original-tag'
})
const directory = path => ({
  id: `dir-${path}`,
  name: path.split('/').at(-1),
  path,
  directory: true
})
const script = (path, name = path.split('/').at(-1)) => ({
  id: `file-${path}`,
  name,
  path,
  directory: false
})
const listing = path => {
  if (!path) return [directory('one')]
  if (path === 'one') return [directory('one/two')]
  if (path === 'one/two') return [directory('one/two/three')]
  return [script(`${path}/a.yml`), script(`${path}/b.yml`)]
}
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function state(wrapper) {
  return wrapper.vm.$.setupState
}
function track(wrapper) {
  wrappers.push(wrapper)
  return wrapper
}
function selector(props = {}) {
  return track(
    mount(GfsFileSelector, {
      props: { modelValue: [original], multipleSelect: false, rememberDirectory: true, ...props },
      global
    })
  )
}
function findButton(wrapper, text) {
  return wrapper.findAll('button').find(item => item.text() === text)
}
async function open(wrapper) {
  await wrapper
    .find('.single-file-display button, .file-list-header button, button')
    .trigger('click')
  await flushPromises()
}
async function enter(wrapper, name) {
  const row = wrapper
    .findAll('.gfs-file-item')
    .find(item => item.find('.file-name').text() === name)
  await row.trigger('dblclick')
  await flushPromises()
}
async function cancel(wrapper) {
  await findButton(wrapper, '取消').trigger('click')
}
async function browseThreeLevels(wrapper) {
  await open(wrapper)
  await enter(wrapper, 'one')
  await enter(wrapper, 'two')
  await enter(wrapper, 'three')
}
beforeEach(() => {
  vi.resetAllMocks()
  gfsApi.listFiles.mockImplementation((_repo, path) => Promise.resolve(listing(path)))
  jaoApi.saveFlow.mockResolvedValue({ data: { id: 'flow-real-id' } })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => {
    if (wrapper.exists()) wrapper.unmount()
  })
  vi.restoreAllMocks()
})

describe('流程步骤脚本目录上下文', () => {
  it('首次仍读根目录，不从已有脚本路径推断目录，保留原单选预选', async () => {
    const wrapper = selector()
    await open(wrapper)
    expect(gfsApi.listFiles).toHaveBeenCalledExactlyOnceWith(null, '', 'git', {
      includeStage: true
    })
    expect(state(wrapper).selectedFiles).toEqual([original.path])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('同一步骤再次改选直接重读三层目录，原config/tag规则与真实path不变', async () => {
    const wrapper = selector()
    await browseThreeLevels(wrapper)
    await wrapper.findAll('.gfs-file-item')[1].trigger('click')
    await findButton(wrapper, '确定').trigger('click')
    const next = [{ path: 'one/two/three/b.yml', config: original.config, tag: '' }]
    expect(wrapper.emitted('update:modelValue')).toEqual([[next]])
    expect(original.tag).toBe('original-tag')
    await wrapper.setProps({ modelValue: next })
    gfsApi.listFiles.mockClear()
    await open(wrapper)
    expect(gfsApi.listFiles).toHaveBeenCalledExactlyOnceWith(null, 'one/two/three', 'git', {
      includeStage: true
    })
    expect(state(wrapper).selectedFiles).toEqual(['one/two/three/b.yml'])
    expect(wrapper.findAll('.gfs-file-item')).toHaveLength(2)
  })

  it('浏览后取消不写草稿；重开记住成功目录但清空搜索草稿', async () => {
    const wrapper = selector()
    await browseThreeLevels(wrapper)
    await wrapper.find('.gfs-browser-header input').setValue('b.yml')
    await wrapper.find('.gfs-file-item').trigger('click')
    await cancel(wrapper)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await open(wrapper)
    expect(state(wrapper).currentPath).toBe('one/two/three')
    expect(state(wrapper).searchKeyword).toBe('')
    expect(state(wrapper).selectedFiles).toEqual([original.path])
  })

  it('重开重新读取，加载中不能使用旧列表或预选提交', async () => {
    const wrapper = selector()
    await browseThreeLevels(wrapper)
    await cancel(wrapper)
    const pending = deferred()
    gfsApi.listFiles.mockReturnValueOnce(pending.promise)
    await open(wrapper)
    expect(findButton(wrapper, '确定').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.gfs-file-item')).toHaveLength(0)
    state(wrapper).handleConfirmSelect()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    pending.resolve([script('one/two/three/new.yml')])
    await flushPromises()
    expect(wrapper.text()).toContain('new.yml')
    expect(wrapper.text()).not.toContain('b.yml')
  })

  it('记忆目录读取失败可原路径重试，原脚本和参数不变', async () => {
    const wrapper = selector()
    await browseThreeLevels(wrapper)
    await cancel(wrapper)
    gfsApi.listFiles.mockRejectedValueOnce(new Error('permission denied'))
    await open(wrapper)
    expect(wrapper.text()).toContain('permission denied')
    expect(wrapper.text()).not.toContain('暂无文件')
    expect(findButton(wrapper, '确定').attributes('disabled')).toBeDefined()
    state(wrapper).handleConfirmSelect()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await findButton(wrapper, '重试').trigger('click')
    await flushPromises()
    expect(gfsApi.listFiles).toHaveBeenLastCalledWith(null, 'one/two/three', 'git', {
      includeStage: true
    })
    expect(findButton(wrapper, '确定').attributes('disabled')).toBeUndefined()
    expect(wrapper.props('modelValue')).toEqual([original])
  })

  it('失败目录不取代最近成功目录，可用原面包屑手动回根', async () => {
    const wrapper = selector()
    await open(wrapper)
    await enter(wrapper, 'one')
    gfsApi.listFiles.mockRejectedValueOnce(new Error('missing folder'))
    await enter(wrapper, 'two')
    await cancel(wrapper)
    await open(wrapper)
    expect(gfsApi.listFiles).toHaveBeenLastCalledWith(null, 'one', 'git', { includeStage: true })
    await wrapper.find('.breadcrumb-clickable').trigger('click')
    await flushPromises()
    expect(gfsApi.listFiles).toHaveBeenLastCalledWith(null, '', 'git', { includeStage: true })
    await cancel(wrapper)
    await open(wrapper)
    expect(state(wrapper).currentPath).toBe('')
  })

  it('成功空目录仍是已浏览目录，不自动替用户选文件', async () => {
    const wrapper = selector({ modelValue: [] })
    await open(wrapper)
    gfsApi.listFiles.mockResolvedValueOnce([])
    await enter(wrapper, 'one')
    expect(wrapper.text()).toContain('暂无文件')
    await findButton(wrapper, '确定').trigger('click')
    expect(ElMessage.warning).toHaveBeenCalledWith('请至少选择一个文件')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await cancel(wrapper)
    await open(wrapper)
    expect(state(wrapper).currentPath).toBe('one')
  })

  it('异常列表作为失败处理，不记住异常目录', async () => {
    const wrapper = selector()
    await open(wrapper)
    gfsApi.listFiles.mockResolvedValueOnce({ records: [] })
    await enter(wrapper, 'one')
    expect(findButton(wrapper, '重试')).toBeDefined()
    expect(findButton(wrapper, '确定').attributes('disabled')).toBeDefined()
    await cancel(wrapper)
    await open(wrapper)
    expect(state(wrapper).currentPath).toBe('')
  })

  it.each([null, 'denied'])('非Error拒绝值%s也保持读取失败保护', async rejection => {
    const wrapper = selector()
    gfsApi.listFiles.mockRejectedValueOnce(rejection)
    await open(wrapper)
    expect(state(wrapper).loadError).toContain('未知错误')
    expect(findButton(wrapper, '确定').attributes('disabled')).toBeDefined()
    state(wrapper).handleConfirmSelect()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it.each(['resolve', 'reject'])('换目录后的旧请求%s不能结束新加载或写目录', async outcome => {
    const wrapper = selector()
    await open(wrapper)
    const old = deferred(),
      latest = deferred()
    gfsApi.listFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await enter(wrapper, 'one')
    await wrapper.find('.breadcrumb-clickable').trigger('click')
    old[outcome](outcome === 'resolve' ? [script('wrong.yml')] : new Error('old error'))
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(state(wrapper).gfsFiles).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(listing(''))
    await flushPromises()
    await cancel(wrapper)
    await open(wrapper)
    expect(state(wrapper).currentPath).toBe('')
  })

  it.each(['resolve', 'reject'])('关闭重开后的旧请求%s不覆盖新会话列表', async outcome => {
    const wrapper = selector()
    const old = deferred(),
      latest = deferred()
    gfsApi.listFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await open(wrapper)
    await cancel(wrapper)
    await open(wrapper)
    old[outcome](outcome === 'resolve' ? [script('wrong.yml')] : new Error('old error'))
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(listing(''))
    await flushPromises()
    expect(wrapper.findAll('.gfs-file-item')).toHaveLength(1)
    expect(state(wrapper).currentPath).toBe('')
  })

  it.each(['resolve', 'reject'])('卸载后旧请求%s不记目录或报错', async outcome => {
    const wrapper = selector()
    await open(wrapper)
    const old = deferred()
    gfsApi.listFiles.mockReturnValueOnce(old.promise)
    await enter(wrapper, 'one')
    const previousState = state(wrapper)
    wrapper.unmount()
    old[outcome](outcome === 'resolve' ? listing('one') : new Error('old error'))
    await flushPromises()
    expect(previousState.lastSuccessfulPath).toBe('')
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('禁用时关闭选择器并失效在途请求，不读取或确认', async () => {
    const wrapper = selector()
    const pending = deferred()
    gfsApi.listFiles.mockReturnValueOnce(pending.promise)
    await open(wrapper)
    await wrapper.setProps({ disabled: true })
    pending.resolve([script('wrong.yml')])
    await flushPromises()
    state(wrapper).handleOpenSelector()
    state(wrapper).handleConfirmSelect()
    expect(state(wrapper).dialogVisible).toBe(false)
    expect(gfsApi.listFiles).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('双击文件仍按原规则确认真实path，不用同名替换身份', async () => {
    const wrapper = selector()
    gfsApi.listFiles.mockResolvedValueOnce([
      script('raw/a.yml', '同名'),
      script('raw/b.yml', '同名')
    ])
    await open(wrapper)
    await wrapper.findAll('.gfs-file-item')[1].trigger('dblclick')
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [[{ path: 'raw/b.yml', config: original.config, tag: '' }]]
    ])
  })

  it('未启用目录记忆的单选保持每次从根开始', async () => {
    const wrapper = selector({ rememberDirectory: false })
    await browseThreeLevels(wrapper)
    await cancel(wrapper)
    await open(wrapper)
    expect(state(wrapper).currentPath).toBe('')
  })

  it('多选即使带记忆属性仍每次回根，并保持原追加/空值结构', async () => {
    const wrapper = selector({ multipleSelect: true })
    await browseThreeLevels(wrapper)
    await wrapper.findAll('.gfs-file-item')[0].trigger('click')
    await findButton(wrapper, '确定').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [[original, { path: 'one/two/three/a.yml', config: '', tag: '' }]]
    ])
    await open(wrapper)
    expect(state(wrapper).currentPath).toBe('')
    expect(state(wrapper).selectedFiles).toEqual([])
  })
})

function flowDetail(id = 'flow-real-id') {
  return {
    id,
    name: '原流程',
    description: '',
    hiddenValue: null,
    hosts: [{ key: 'original-key', value: 'original-value', assetType: 'linux', extra: '' }],
    globalParamsJson: JSON.stringify([
      { id: 'p-id', name: 'raw', label: '', description: '', defaultValue: '', secret: true }
    ]),
    steps: ['same-step-id', 'other-step-id'].map(stepId => ({
      id: stepId,
      name: stepId,
      type: 'script',
      autoNext: false,
      hiddenStep: '',
      configJson: JSON.stringify({
        tasks: [{ scripts: [{ location: original.path, argline: original.config }] }],
        verbosity: '3',
        taskTimeout: 90
      })
    }))
  }
}
async function editor(props = {}) {
  jaoApi.fetchFlowDetail.mockImplementation(id => Promise.resolve({ data: flowDetail(id) }))
  const wrapper = track(
    mount(FlowEditor, {
      props: { modelValue: false, flowId: 'flow-real-id', ...props },
      global
    })
  )
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}

describe('真实流程父子组件接线与原保存兼容', () => {
  it('每个步骤独立；删除其他步骤不丢本步骤目录，改选后仅手动保存原完整payload', async () => {
    const wrapper = await editor()
    let selectors = wrapper.findAllComponents(GfsFileSelector)
    await browseThreeLevels(selectors[1])
    await cancel(selectors[1])
    await open(selectors[0])
    expect(state(selectors[0]).currentPath).toBe('')
    await cancel(selectors[0])
    state(wrapper).removeStep(0)
    await flushPromises()
    selectors = wrapper.findAllComponents(GfsFileSelector)
    await open(selectors[0])
    expect(state(selectors[0]).currentPath).toBe('one/two/three')
    await selectors[0].findAll('.gfs-file-item')[1].trigger('click')
    await findButton(selectors[0], '确定').trigger('click')
    expect(jaoApi.saveFlow).not.toHaveBeenCalled()
    expect(jaoApi.createFlowInstance).not.toHaveBeenCalled()
    await findButton(wrapper, '保存').trigger('click')
    await flushPromises()
    const detail = flowDetail()
    expect(jaoApi.saveFlow).toHaveBeenCalledExactlyOnceWith({
      ...detail,
      description: null,
      steps: [
        {
          ...detail.steps[1],
          configJson: JSON.stringify({
            tasks: [{ scripts: [{ location: 'one/two/three/b.yml', argline: original.config }] }],
            verbosity: '3',
            taskTimeout: 90
          })
        }
      ]
    })
  })

  it.each(['dialog', 'inline'])(
    '%s编辑结束后重开相同流程、相同步骤ID仍从根开始',
    async renderMode => {
      const wrapper = await editor({ renderMode })
      let child = wrapper.findAllComponents(GfsFileSelector)[0]
      await browseThreeLevels(child)
      await cancel(child)
      await wrapper.setProps({ modelValue: false })
      await wrapper.setProps({ modelValue: true })
      await flushPromises()
      child = wrapper.findAllComponents(GfsFileSelector)[0]
      await open(child)
      expect(state(child).currentPath).toBe('')
      expect(jaoApi.saveFlow).not.toHaveBeenCalled()
    }
  )

  it('切换流程即使步骤ID相同也关闭旧选择器，旧错误不污染新目录', async () => {
    const wrapper = await editor()
    const oldChild = wrapper.findAllComponents(GfsFileSelector)[0]
    await open(oldChild)
    const pending = deferred()
    gfsApi.listFiles.mockReturnValueOnce(pending.promise)
    await enter(oldChild, 'one')
    await wrapper.setProps({ flowId: 'another-real-flow' })
    await flushPromises()
    const nextChild = wrapper.findAllComponents(GfsFileSelector)[0]
    expect(state(nextChild).dialogVisible).toBe(false)
    await open(nextChild)
    pending.reject(new Error('old flow error'))
    await flushPromises()
    expect(state(nextChild).currentPath).toBe('')
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(jaoApi.fetchFlowDetail).toHaveBeenLastCalledWith('another-real-flow')
  })

  it('新增步骤从根开始，运行模式保持禁用脚本选择且不触发执行', async () => {
    const wrapper = await editor()
    const first = wrapper.findAllComponents(GfsFileSelector)[0]
    await browseThreeLevels(first)
    await cancel(first)
    state(wrapper).addStep()
    await flushPromises()
    const added = wrapper.findAllComponents(GfsFileSelector).at(-1)
    await open(added)
    expect(state(added).currentPath).toBe('')
    await wrapper.setProps({ mode: 'run' })
    await flushPromises()
    gfsApi.listFiles.mockClear()
    for (const child of wrapper.findAllComponents(GfsFileSelector)) {
      expect(child.props('disabled')).toBe(true)
      state(child).handleOpenSelector()
    }
    expect(gfsApi.listFiles).not.toHaveBeenCalled()
    expect(jaoApi.createFlowInstance).not.toHaveBeenCalled()
  })
})
