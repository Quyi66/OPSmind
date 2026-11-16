import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {computed,defineComponent,h,inject,provide} from 'vue'
import {flushPromises,shallowMount} from '@vue/test-utils'
import {setLocale} from '@/core/i18n'
import Sql from '@/modules/settings/views/SscSqlImportPage.vue'
import Scheduler from '@/modules/settings/views/SscTaskSchedulerPage.vue'
import {getSqlImportStatusLabel} from '@/modules/yum-repo/utils'

const api=vi.hoisted(()=>({getSqlImportResult:vi.fn(),runSqlServerFile:vi.fn(),get:vi.fn(),info:vi.fn(),error:vi.fn(),allowed:true}))
vi.mock('@/modules/yum-repo/api',()=>({yumRepoApi:api}))
vi.mock('@/core/api',()=>({apiService:{get:api.get}}))
vi.mock('@/core/auth',()=>({authService:{hasPermission:()=>api.allowed}}))
vi.mock('element-plus',()=>({ElMessage:{info:api.info,error:api.error}}))
const Slot={template:'<div><slot /></div>'}
const Table=defineComponent({props:{data:{type:Array,default:()=>[]}},setup(props){provide('rows',computed(()=>props.data))},template:'<div><slot /></div>'})
const Column=defineComponent({props:['prop','label'],setup(props,{slots}){const rows=inject('rows');return()=>rows.value.map(row=>h('div',{'data-column':props.label},slots.default?.({row})||String(row[props.prop]??'')))}})
const wrappers=[]
const result=(status='RUNNING')=>({jobId:'raw-job',status,fileName:'目录/原始.sql',currentEntry:'原始条目',totalStatements:1000,failedStatements:25,elapsedMs:0,dryRun:true,continueOnError:false,message:'后端任务消息 {raw}',entries:[],errors:Array.from({length:25},(_,index)=>({entry:`原始条目-${index}`,sql:`SELECT '中文原值 {raw}-${index}'`,error:`后端错误-${index}`}))})
async function open(component=Sql){
 const wrapper=shallowMount(component,{global:{stubs:{
  ...Object.fromEntries(['el-form','el-form-item','el-button','el-checkbox','el-descriptions','el-descriptions-item','el-tag'].map(name=>[name,Slot])),
  'el-table':Table,'el-table-column':Column,'el-input':true,'el-pagination':true,'el-icon':true,
  'el-alert':{props:['title'],template:'<aside>{{title}}<slot /></aside>'},
  'el-empty':{props:['description'],template:'<p>{{description}}</p>'},I18nT:false,'i18n-t':false
 },directives:{loading(){}}}})
 wrappers.push(wrapper)
 await flushPromises()
 return{wrapper,vm:wrapper.vm.$.setupState}
}
beforeEach(async()=>{
 vi.resetAllMocks()
 api.allowed=true
 api.getSqlImportResult.mockResolvedValue({data:result()})
 api.runSqlServerFile.mockResolvedValue({data:result('SUCCESS')})
 api.get.mockResolvedValue({data:Array.from({length:55},(_,index)=>({id:`raw-task-${index}`,description:'后端任务备注',cronExpression:'0 0 * * * ?',jobType:'后端任务类型',status:'ENABLED',createdBy:'原始创建者'}))})
 await setLocale('zh-CN',{persist:false})
})
afterEach(async()=>{
 wrappers.splice(0).forEach(wrapper=>wrapper.unmount())
 vi.useRealTimers()
 await setLocale('zh-CN',{persist:false})
})

describe('System SQL import and scheduler language changes',()=>{
 it('retains SQL drafts, result identity, error paging and raw SQL while translating surrounding text',async()=>{
  const{wrapper,vm}=await open()
  vi.useFakeTimers()
  vm.form.serverFile='目录/草稿.sql.gz'
  vm.form.dryRun=true
  vm.form.continueOnError=true
  vm.applyJobResponse(result(),{notify:false})
  vm.errorPagination.page=2
  const job=vm.jobResult,errors=vm.jobResult.errors
  await setLocale('en-US',{persist:false})
  await flushPromises()
  expect(vm.form).toMatchObject({serverFile:'目录/草稿.sql.gz',dryRun:true,continueOnError:true,async:true})
  expect(vm.jobResult).toBe(job)
  expect(vm.jobResult.errors).toBe(errors)
  expect(vm.errorPagination.page).toBe(2)
  expect(wrapper.text()).toContain('Running')
  expect(wrapper.text()).toContain('后端任务消息 {raw}')
  expect(wrapper.text()).toContain("SELECT '中文原值 {raw}-10'")
  expect(wrapper.text()).toContain('后端错误-10')
  expect(wrapper.findAll('code').map(item=>item.text())).toContain('/opt/sjxy/assets/gfs/fs-repos')
  expect(vm.describeOptions(vm.jobResult)).toBe('Parse without executing / Stop on error')
  expect(vm.formatNumber(1000)).toBe('1,000')
  expect(api.getSqlImportResult).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(1)
 })

 it('updates local polling failure messages without resetting or duplicating the scheduled retry',async()=>{
  const{vm}=await open()
  vi.useFakeTimers()
  vm.applyJobResponse(result(),{notify:false})
  api.getSqlImportResult.mockRejectedValueOnce({})
  await vm.refreshJobResult('raw-job',{silent:true})
  expect(vm.readError).toBe('查询 SQL 导入结果失败；将自动重试，也可手动查询')
  await setLocale('en-US',{persist:false})
  expect(vm.readError).toBe('Failed to query SQL import results. Retrying automatically. You can also refresh manually.')
  expect(api.getSqlImportResult).toHaveBeenCalledExactlyOnceWith('raw-job')
  expect(vi.getTimerCount()).toBe(1)
  await vi.advanceTimersByTimeAsync(3000)
  expect(api.getSqlImportResult).toHaveBeenCalledTimes(2)
  expect(vm.currentJobId).toBe('raw-job')
 })

 it('keeps backend read errors and submits the original filename and boolean options',async()=>{
  const{vm}=await open()
  vm.applyJobResponse(result('FAILED'),{notify:false})
  api.getSqlImportResult.mockRejectedValueOnce({response:{status:403,data:{message:'后端权限错误 {raw}'}}})
  await setLocale('en-US',{persist:false})
  await vm.refreshCurrentJob()
  expect(vm.readError).toContain('后端权限错误 {raw}')
  expect(api.error).toHaveBeenLastCalledWith('后端权限错误 {raw}')
  vm.form.serverFile='目录/原始.sql.gz'
  vm.form.async=false
  vm.form.continueOnError=true
  vm.form.dryRun=true
  await vm.handleSubmit()
  expect(api.runSqlServerFile).toHaveBeenCalledExactlyOnceWith({file:'目录/原始.sql.gz',async:false,continueOnError:true,dryRun:true})
 })

 it('translates access-denied text without changing the admin guard',async()=>{
  api.allowed=false
  const{wrapper,vm}=await open()
  await setLocale('en-US',{persist:false})
  await flushPromises()
  expect(wrapper.text()).toContain('SQL import is available to super administrators only')
  vm.form.serverFile='original.sql'
  await vm.handleSubmit()
  expect(api.runSqlServerFile).not.toHaveBeenCalled()
 })

 it.each([['PENDING','Pending'],['RUNNING','Running'],['SUCCESS','Execution succeeded'],['FAILED','Execution failed']])('translates the shared %s SQL status without changing the code',async(status,label)=>{
  const record={status}
  await setLocale('en-US',{persist:false})
  expect(getSqlImportStatusLabel(record)).toBe(label)
  expect(record.status).toBe(status)
  expect(getSqlImportStatusLabel('CUSTOM_RAW_STATUS')).toBe('CUSTOM_RAW_STATUS')
 })

 it('preserves scheduled task paging, keyword draft and backend values without another query',async()=>{
  const{wrapper,vm}=await open(Scheduler)
  vm.taskPage=3
  vm.taskKeyword='未应用任务草稿'
  const row=vm.paginatedTasks[0]
  await setLocale('en-US',{persist:false})
  await flushPromises()
  expect(vm.taskPage).toBe(3)
  expect(vm.taskKeyword).toBe('未应用任务草稿')
  expect(vm.paginatedTasks[0]).toBe(row)
  expect(row).toMatchObject({jobType:'后端任务类型',cronExpression:'0 0 * * * ?',status:'ENABLED'})
  expect(wrapper.findAll('[data-column="Current status"]').map(item=>item.text())).toEqual(Array(10).fill('Enabled'))
  expect(wrapper.text()).toContain('后端任务类型')
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/workflow/api/workflow/cron/app',{params:{appCode:'uim'}})
 })
})
