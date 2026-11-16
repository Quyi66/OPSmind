import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale, t } from '@/core/i18n'
import Assign from '@/modules/user/components/dialogs/AssignPatchDialog.vue'
import Records from '@/modules/user/components/dialogs/PatchRecordsDialog.vue'

const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),delete:vi.fn(),confirm:vi.fn(),success:vi.fn(),warning:vi.fn(),error:vi.fn()}))
vi.mock('@/core/api',()=>({apiService:api}))
vi.mock('@/core/auth',()=>({authService:{getCurrentUser:()=>({tenantId:'raw-tenant'})}}))
vi.mock('element-plus',()=>({ElMessage:{success:api.success,warning:api.warning,error:api.error},ElMessageBox:{confirm:api.confirm}}))
const Slot={template:'<div><slot /><slot name="footer" /></div>'}
const Table={props:['data'],template:'<div><slot /></div>',methods:{clearSelection(){},toggleRowSelection(){}}}
const wrappers=[]
const patches=()=>[
 {patch_id:'raw-patch-a',patch_name:'后端补丁名称',severity:'Critical',hosts:[{host_id:'raw-host-a',host_key:'中文主机'},{host_id:'raw-host-b',host_key:'raw-host-b'}]},
 {patch_id:'raw-patch-b',patch_name:'原始补丁二',severity:'Important',hosts:[{host_id:'raw-host-a',host_key:'中文主机'}]}
]
const record={id:'raw-assignment',patchId:'raw-patch-a',hostKey:'中文主机',remark:'原始备注'}
async function open(component=Assign){
 const wrapper=shallowMount(component,{props:{visible:true,username:'original-login'},global:{stubs:{
  'el-drawer':Slot,'el-dialog':Slot,'el-table':Table,'el-table-column':true,
  ...Object.fromEntries(['el-form','el-form-item','el-button','el-tag','el-checkbox-group'].map(name=>[name,Slot])),
  'el-input':true,'el-pagination':true,'el-checkbox':true,'el-empty':true,'el-date-picker':true,'el-icon':true,
  'el-alert':{props:['title'],template:'<div>{{title}}</div>'}
 },directives:{loading(){}}}})
 wrappers.push(wrapper)
 await flushPromises()
 return{wrapper,vm:wrapper.vm.$.setupState}
}
beforeEach(async()=>{
 vi.resetAllMocks()
 api.get.mockImplementation(async(url,{params}={})=>{
  if(url.endsWith('/list'))return{data:{content:[],totalElements:0}}
  const rows=patches()
  const content=params?.patchId?rows.filter(patch=>patch.patch_id===params.patchId):rows
  return{data:{content,totalElements:content.length}}
 })
 api.post.mockResolvedValue({data:{count:1}})
 api.delete.mockResolvedValue()
 api.confirm.mockResolvedValue()
 await setLocale('zh-CN',{persist:false})
})
afterEach(async()=>{
 wrappers.splice(0).forEach(wrapper=>wrapper.unmount())
 await setLocale('zh-CN',{persist:false})
})

describe('Platform patch assignment language changes',()=>{
 it('keeps selected patches, hosts, form drafts and paging while submitting original IDs',async()=>{
  const{vm}=await open()
  await vm.activatePatch(vm.availablePatches[0])
  await flushPromises()
  vm.onHostSelectionChange([vm.activePatch.availableHosts[0]])
  await flushPromises()
  vm.assignForm.remark='中文备注草稿'
  vm.assignForm.expireTime='2027-01-01 12:00:00'
  vm.patchFilters.keyword='未应用补丁搜索'
  vm.hostFilters.keyword='中文'
  await flushPromises()
  vm.hostPagination.page=2
  const selected=vm.selectedPatches
  const calls=api.get.mock.calls.length
  await setLocale('en-US',{persist:false})
  expect(vm.selectedPatches).toBe(selected)
  expect(vm.activePatchId).toBe('raw-patch-a')
  expect(vm.activePatch.selectedHosts).toMatchObject([{host_id:'raw-host-a',host_key:'中文主机'}])
  expect(vm.assignForm).toMatchObject({remark:'中文备注草稿',expireTime:'2027-01-01 12:00:00'})
  expect(vm.hostPagination.page).toBe(2)
  expect(vm.patchFilters.keyword).toBe('未应用补丁搜索')
  expect(vm.severityLabels.Critical).toBe('Critical')
  expect(api.get).toHaveBeenCalledTimes(calls)
  await vm.submitAssign()
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/secops/api/secops/v2/patch/assignment',{userLogin:'original-login',items:[{patchId:'raw-patch-a',hostIds:['raw-host-a']}],expireTime:'2027-01-01 12:00:00',remark:'中文备注草稿'})
 })

 it('preserves fallback-label search matches across a language change and captures later English queries',async()=>{
  const{vm}=await open()
  await vm.activatePatch(vm.availablePatches[0])
  vm.hostFilters.keyword='未提供'
  await flushPromises()
  const matched=vm.filteredHosts[0]
  expect(matched.host_id).toBe('raw-host-b')
  await setLocale('en-US',{persist:false})
  expect(vm.filteredHosts[0]).toBe(matched)
  expect(vm.hostLabel(matched)).toBe('No host or IP provided')
  vm.hostFilters.keyword='No host'
  expect(vm.filteredHosts[0]).toBe(matched)
 })

 it('keeps backend assignment errors verbatim in English mode',async()=>{
  const{vm}=await open()
  await vm.activatePatch(vm.availablePatches[0])
  vm.onHostSelectionChange([vm.activePatch.availableHosts[0]])
  await flushPromises()
  api.post.mockRejectedValueOnce({response:{data:{error:'后端分配错误 {raw}'}}})
  await setLocale('en-US',{persist:false})
  await vm.submitAssign()
  expect(api.error).toHaveBeenLastCalledWith('后端分配错误 {raw}')
  expect(vm.selectedPatches[0].selectedHosts[0].host_id).toBe('raw-host-a')
 })

 it('updates persistent assignment failures and preview errors without clearing pending reuse',async()=>{
  api.get.mockRejectedValueOnce(new Error('offline'))
  const{vm}=await open()
  await setLocale('en-US',{persist:false})
  expect(vm.assignedError).toContain('Existing assignments could not be fully loaded')
  const calls=api.get.mock.calls.length
  await flushPromises()
  expect(api.get).toHaveBeenCalledTimes(calls)
 })

 it('preserves reuse preview rows and raw target identities while translating local errors',async()=>{
  const{vm}=await open()
  await vm.activatePatch(vm.availablePatches[0])
  vm.onHostSelectionChange([vm.activePatch.availableHosts[0]])
  await flushPromises()
  await vm.activatePatch(vm.availablePatches[1])
  await vm.activatePatch(vm.selectedPatches.find(patch=>patch.patch_id==='raw-patch-a'))
  vm.reuseTargetIds=['raw-patch-b']
  await flushPromises()
  const target=vm.selectedPatches.find(patch=>patch.patch_id==='raw-patch-b')
  target.selectedHosts=[{host_id:'',host_key:'原始机器'}]
  await flushPromises()
  await vm.previewReuse()
  const preview=vm.reusePreview
  expect(preview[0].error).toContain('已有机器信息不完整')
  const calls=api.get.mock.calls.length
  await setLocale('en-US',{persist:false})
  expect(vm.reusePreview).toBe(preview)
  expect(preview[0].error).toBe('Existing machine information is incomplete. Select the machines again first.')
  expect(vm.reuseTargetIds).toEqual(['raw-patch-b'])
  expect(api.get).toHaveBeenCalledTimes(calls)
 })

 it('retains record selections and paging, and revokes the original assignment',async()=>{
  api.get.mockResolvedValue({data:{content:[record],totalElements:25}})
  const{vm}=await open(Records)
  await vm.loadRecords()
  vm.handleRecordSelectionChange([record])
  vm.recordPage=3
  const rows=vm.patchRecords
  await setLocale('en-US',{persist:false})
  expect(vm.recordPage).toBe(3)
  expect(vm.patchRecords).toBe(rows)
  expect(vm.selectedRecords).toEqual([record])
  expect(api.get).toHaveBeenCalledTimes(1)
  await vm.handleRevokeSingle(record)
  expect(api.confirm.mock.calls[0][0]).toBe('Revoke the assignment of patch [raw-patch-a] on host [中文主机]?')
  expect(api.delete).toHaveBeenCalledExactlyOnceWith('/secops/api/secops/v2/patch/assignment/raw-assignment')
 })

 it.each([0,1,2])('uses complete plural quantity messages for %i selected machines',async count=>{
  await setLocale('en-US',{persist:false})
  expect(t('settings.patchAssignment.selectedMachines',{count})).toBe(`${count} machine${count===1?'':'s'} selected`)
  expect(t('settings.patchAssignment.cleaned',{count})).toBe(`Cleaned up ${count} assignment${count===1?'':'s'}`)
 })
})
