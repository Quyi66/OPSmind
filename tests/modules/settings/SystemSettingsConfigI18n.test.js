import {createRequire} from 'node:module'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {flushPromises,shallowMount} from '@vue/test-utils'
import {setLocale} from '@/core/i18n'
import Params from '@/modules/settings/views/SscParamPage.vue'
import Email from '@/modules/settings/views/SscEmailPage.vue'
import Engine from '@/modules/settings/views/SscEnginePage.vue'

const api=vi.hoisted(()=>Object.fromEntries(['getSysParams','getAppParams','createSysParam','updateSysParam','deleteSysParam','createAppParam','updateAppParam','deleteAppParam','get','post','getParamByDomainAndName','getParamsByDomain','queryProjectBaseDir','queryProjects','queryOrganizations','queryCredentials','queryInstanceGroups','queryExecutionEnvironments','updateParam','batchUpdateParams','confirm','success','error','warning'].map(name=>[name,vi.fn()])))
vi.mock('@/modules/settings/api/params',()=>api)
vi.mock('@/modules/settings/api/engine',()=>api)
vi.mock('@/core/api',()=>({apiService:api}))
vi.mock('element-plus',()=>({ElMessage:{success:api.success,error:api.error,warning:api.warning},ElMessageBox:{confirm:api.confirm}}))
const{ElForm,ElFormItem}=createRequire(import.meta.url)('element-plus/lib/components/form/index.js')
const Slot={template:'<div><slot /><slot name="footer" /></div>'}
const wrappers=[]
const parameter={id:'raw-param',domain:'原始域',name:'原始参数',value:'原始值 {raw}',description:'后端说明',isEncrypt:1,view:1}
const mail=()=>({username:'fixture@example.invalid',password:'fixture-secret',host:'smtp.example.invalid',port:'465',from:'fixture@example.invalid',debug_on_off:'no',ssl_on_off:'yes',recipient_type:'to'})
const ansible=()=>[{id:'fork-toggle',domain:'jao',name:'is_fork',value:'true'},{id:'fork-count',domain:'jao',name:'forks',value:'256'},{id:'git-toggle',domain:'jao',name:'sync_script_git',value:'false'}]
const aap=()=>[
 {id:'raw-address',domain:'ata',name:'tower_host',value:'https://aap.example.invalid'},
 {id:'raw-clear',domain:'ata',name:'tower_clear',value:'false'},
 {id:'raw-login',domain:'ata',name:'tower_login_config',value:JSON.stringify({web_login_name:'原始账户',web_login_pwd:'fixture-secret',cluster_servers:[{host:'original-host',port:'22',username:'original-user',password:'fixture-host-secret'}]})},
 {id:'raw-config',domain:'ata',name:'tower_config',value:JSON.stringify({git_project_id:0,organization_id:0,template_credentials_id:[0],template_become:false})}
]
async function open(component,realForms=false){
 const wrapper=shallowMount(component,{global:{stubs:{
  ...Object.fromEntries(['el-dialog','el-tabs','el-tab-pane','el-button','el-card','el-row','el-col','el-divider','el-radio-group','el-radio-button','el-descriptions','el-descriptions-item','el-table'].map(name=>[name,Slot])),
  'el-form':realForms?ElForm:{...Slot,methods:{validate:async()=>true,clearValidate(){}}},'el-form-item':realForms?ElFormItem:Slot,
  'el-input':true,'el-input-number':true,'el-switch':true,'el-select':true,'el-option':true,'el-icon':true,'el-table-column':true,'el-pagination':true,
  'el-alert':{props:['title'],template:'<div>{{title}}<slot /></div>'}
 },directives:{loading(){}}}})
 wrappers.push(wrapper)
 await flushPromises()
 return{wrapper,vm:wrapper.vm.$.setupState}
}
beforeEach(async()=>{
 vi.resetAllMocks()
 api.getSysParams.mockResolvedValue({data:Array.from({length:35},(_,index)=>({...parameter,id:`raw-param-${index}`}))})
 api.getAppParams.mockResolvedValue({data:[{id:'raw-app-param',tenantId:'raw-tenant',name:'原始应用参数',value:'原始应用值',description:'应用说明'}]})
 api.updateSysParam.mockResolvedValue()
 api.get.mockResolvedValue({data:mail()})
 api.post.mockResolvedValue({code:'200'})
 api.confirm.mockResolvedValue()
 api.getParamByDomainAndName.mockResolvedValue({id:'engine-selector',domain:'jao',name:'script_engine',value:'ansible'})
 api.getParamsByDomain.mockImplementation(async domain=>domain==='ata'?aap():ansible())
 api.queryProjectBaseDir.mockResolvedValue({project_base_dir:'后端目录'})
 for(const name of ['queryProjects','queryOrganizations','queryCredentials','queryInstanceGroups','queryExecutionEnvironments'])api[name].mockResolvedValue({results:[{id:0,name:'后端选项',scm_type:'git'}]})
 api.batchUpdateParams.mockResolvedValue()
 await setLocale('zh-CN',{persist:false})
})
afterEach(async()=>{
 wrappers.splice(0).forEach(wrapper=>wrapper.unmount())
 await setLocale('zh-CN',{persist:false})
})

describe('System parameter, mail and engine language changes',()=>{
 it('preserves parameter filters, paging and both drafts while translating dialog titles',async()=>{
  const{vm}=await open(Params,true)
  await vm.loadAppParams()
  vm.sysSearchKeyword='原始'
  vm.handleSysSearch()
  vm.sysCurrentPage=3
  const row=vm.paginatedSysParams[0]
  vm.handleEditSysParam(row)
  vm.sysForm.value='中文参数草稿 {raw}'
  vm.appForm={id:'raw-app-param',tenantId:'raw-tenant',name:'原始应用参数',value:'应用草稿'}
  vm.sysSearchKeyword='未应用搜索草稿'
  await setLocale('en-US',{persist:false})
  expect(vm.getDialogTitle('sys')).toBe('Edit system parameter')
  expect(vm.getDialogTitle('app')).toBe('Edit application parameter')
  expect(vm.sysCurrentPage).toBe(3)
  expect(vm.sysSearchKeyword).toBe('未应用搜索草稿')
  expect(vm.sysAppliedSearchKeyword).toBe('原始')
  expect(vm.paginatedSysParams[0]).toBe(row)
  expect(vm.appForm).toMatchObject({tenantId:'raw-tenant',value:'应用草稿'})
  expect(api.getSysParams).toHaveBeenCalledTimes(1)
  expect(api.getAppParams).toHaveBeenCalledTimes(1)
  await vm.handleSaveSysParam()
  expect(api.updateSysParam.mock.calls[0][0]).toMatchObject({id:row.id,domain:'原始域',name:'原始参数',value:'中文参数草稿 {raw}',isEncrypt:1,view:1})
 })

 it.each([['sys','sysFormRef','name','Enter a parameter name'],['app','appFormRef','name','Enter a parameter name'],['email','formRef','host','Enter a mail server']])('updates only existing %s validation errors without clearing model values',async(type,ref,field,message)=>{
  const{vm}=await open(type==='email'?Email:Params,true)
  if(type==='sys')vm.handleCreateSysParam()
  if(type==='app')vm.handleCreateAppParam()
  const model=type==='email'?vm.form:vm[`${type}Form`]
  model[field]=''
  model.description='保留草稿'
  await flushPromises()
  await vm[ref].validateField(field).catch(()=>{})
  const item=()=>vm[ref].fields.find(item=>item.prop===field)
  expect(item().validateMessage).toContain('请输入')
  await setLocale('en-US',{persist:false})
  await flushPromises()
  expect(item().validateMessage).toBe(message)
  expect(model[field]).toBe('')
  expect(model.description).toBe('保留草稿')
  expect(api.post).not.toHaveBeenCalled()
 })

 it('retains mail drafts and the test recipient and saves original protocol values',async()=>{
  const{vm}=await open(Email,true)
  vm.handleTest()
  vm.testRecipient='中文收件人@example.invalid'
  vm.form.password='draft-secret'
  vm.debugOnOff=true
  vm.form.recipient_type='bcc'
  const draft=vm.form
  await setLocale('en-US',{persist:false})
  expect(vm.form).toBe(draft)
  expect(vm.testDialogVisible).toBe(true)
  expect(vm.testRecipient).toBe('中文收件人@example.invalid')
  expect(vm.hasUnsavedChanges()).toBe(true)
  expect(api.get).toHaveBeenCalledTimes(1)
  await vm.handleSave()
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/email-config',expect.objectContaining({password:'draft-secret',port:'465',recipient_type:'bcc',debug_on_off:'yes',ssl_on_off:'yes'}))
  expect(api.success).toHaveBeenLastCalledWith('Mail settings saved')
 })

 it('translates mail read failures without retrying and preserves backend send errors verbatim',async()=>{
  api.get.mockRejectedValueOnce(new Error('offline'))
  const{vm}=await open(Email)
  await setLocale('en-US',{persist:false})
  expect(vm.loadError).toContain('Failed to load mail settings')
  expect(api.get).toHaveBeenCalledTimes(1)
  await vm.loadConfig()
  vm.testRecipient='fixture@example.invalid'
  api.get.mockResolvedValueOnce({code:'500',msg:'后端发送错误 {raw}'})
  await vm.handleSendTest()
  expect(api.error).toHaveBeenLastCalledWith('后端发送错误 {raw}')
 })

 it('preserves Ansible drafts and original parameter IDs and JSON booleans',async()=>{
  const{vm}=await open(Engine)
  vm.jaoParamMap.forks=512
  vm.jaoParamMap.sync_script_git=true
  await setLocale('en-US',{persist:false})
  expect(vm.usedEngine).toBe('ansible')
  expect(vm.jaoParamMap).toMatchObject({forks:512,sync_script_git:true})
  expect(api.getParamByDomainAndName).toHaveBeenCalledTimes(1)
  expect(api.getParamsByDomain).toHaveBeenCalledExactlyOnceWith('jao')
  await vm.saveAnsibleConfig()
  expect(api.batchUpdateParams.mock.calls[0][0]).toEqual([{id:'fork-toggle',domain:'jao',name:'is_fork',value:'true'},{id:'fork-count',domain:'jao',name:'forks',value:'512'},{id:'git-toggle',domain:'jao',name:'sync_script_git',value:'true'}])
 })

 it('preserves AAP connection and selection drafts and submits original IDs and nested JSON',async()=>{
  api.getParamByDomainAndName.mockResolvedValue({id:'engine-selector',name:'script_engine',value:'aap'})
  const{vm}=await open(Engine)
  const projects=vm.projects
  vm.loginConfig.web_login_pwd='draft-secret'
  vm.loginConfig.cluster_servers[0].username='原始节点账户'
  vm.towerConfig.template_credentials_id=[0]
  vm.towerConfig.encrypt_host_pass=true
  await setLocale('en-US',{persist:false})
  expect(vm.projects).toBe(projects)
  expect(vm.projects[0].name).toBe('后端选项')
  expect(api.queryProjectBaseDir).toHaveBeenCalledTimes(1)
  expect(api.queryProjects).toHaveBeenCalledTimes(1)
  await vm.saveAapConfig()
  const values=Object.fromEntries(api.batchUpdateParams.mock.calls[0][0].map(param=>[param.name,param.value]))
  expect(JSON.parse(values.tower_login_config)).toMatchObject({web_login_pwd:'draft-secret',cluster_servers:[expect.objectContaining({username:'原始节点账户'})]})
  expect(JSON.parse(values.tower_config)).toMatchObject({organization_id:0,git_project_id:0,template_credentials_id:[0],encrypt_host_pass:true})
 })

 it('updates persistent AAP errors while retaining connection configuration without another attempt',async()=>{
  api.getParamByDomainAndName.mockResolvedValue({id:'engine-selector',name:'script_engine',value:'aap'})
  api.queryProjectBaseDir.mockRejectedValueOnce(new Error('offline'))
  const{vm}=await open(Engine)
  vm.loginConfig.web_login_name='账户草稿'
  await setLocale('en-US',{persist:false})
  expect(vm.aapReadError).toContain('Connection settings are retained')
  expect(vm.loginConfig.web_login_name).toBe('账户草稿')
  expect(vm.loginConfig.web_login_pwd).toBe('fixture-secret')
  expect(api.queryProjectBaseDir).toHaveBeenCalledTimes(1)
 })
})
