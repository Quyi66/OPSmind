import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Users from '@/modules/settings/views/UamUserPage.vue'
import Assignments from '@/modules/settings/views/UamPatchAssignmentPage.vue'
import Teams from '@/modules/settings/views/UamTeamPage.vue'
import UserEdit from '@/modules/settings/components/user/UserEditDialog.vue'
import TeamEdit from '@/modules/settings/components/team/TeamEditDialog.vue'
import Roles from '@/modules/settings/components/user/AllocateRoleDialog.vue'

const api=vi.hoisted(()=>Object.fromEntries(['getUsers','getUserDetail','getRoles','getUserApplets','getUserApiKeys','updateUser','createUser','deleteUser','saveUserApplets','getBasicUsers','getTeamDetail','getTeams','createTeam','updateTeam','deleteTeam','updateUserRoles','toggleUserActivation','get','post','confirm','success','error','warning','info'].map(name=>[name,vi.fn()])))
vi.mock('@/modules/settings/api',()=>api)
vi.mock('@/modules/settings/api/team',()=>api)
vi.mock('@/core/api',()=>({apiService:api}))
vi.mock('@/core/auth',()=>({authService:{getCurrentUser:()=>({tenantId:'raw-tenant',login:'admin'})}}))
vi.mock('element-plus',()=>({ElMessage:{success:api.success,error:api.error,warning:api.warning,info:api.info},ElMessageBox:{confirm:api.confirm}}))
const {ElForm,ElFormItem}=createRequire(import.meta.url)('element-plus/lib/components/form/index.js')
const Slot={template:'<div><slot /><slot name="footer" /></div>'}
const wrappers=[]
const role={id:'raw-role',name:'ROLE_ORIGINAL',description:'后端角色名称'}
const user={id:'raw-user',tenantUserId:'raw-tenant-user',login:'original-login',fullName:'中文用户',activated:true,authMode:'MIX',roles:[role]}
const team={id:'raw-team',name:'中文团队',code:'RAW_CODE',description:'中文描述',tenantName:'原始租户',updatedAt:'2026-01-01'}
const applets=[{id:'raw-applet',title:'#{cac.index.square}',name:'raw-app',_user_applet:false},{id:'custom-applet',title:'后端自定义应用',name:'custom',_user_applet:true}]
async function open(component,props={},realForm=false){
 const wrapper=shallowMount(component,{props:{modelValue:false,...props},global:{stubs:{
  ...Object.fromEntries(['el-dialog','el-tabs','el-tab-pane','el-button','el-tag','el-checkbox-group','el-checkbox','el-radio-group','el-radio','el-collapse','el-collapse-item','el-link','el-form-item','el-form','el-table'].map(name=>[name,Slot])),
  'el-form':realForm?ElForm:{...Slot,methods:{validate:async()=>true}},'el-form-item':realForm?ElFormItem:Slot,
  'el-table-column':true,'el-input':true,'el-select':true,'el-option':true,'el-switch':true,'el-icon':true,'el-pagination':true,
  'el-alert':{props:['title'],template:'<div>{{title}}<slot /></div>'}
 },directives:{loading(){}}}})
 wrappers.push(wrapper)
 if([UserEdit,TeamEdit,Roles].includes(component))await wrapper.setProps({modelValue:true})
 await flushPromises()
 return{wrapper,vm:wrapper.vm.$.setupState}
}
beforeEach(async()=>{
 vi.resetAllMocks()
 api.getUsers.mockResolvedValue({data:Array.from({length:35},(_,i)=>({...user,id:`raw-user-${i}`,tenantUserId:`raw-tenant-user-${i}`}))})
 api.getUserDetail.mockResolvedValue({data:structuredClone(user)})
 api.getRoles.mockResolvedValue({data:[role]})
 api.getUserApplets.mockResolvedValue({data:structuredClone(applets)})
 api.getUserApiKeys.mockResolvedValue({data:[]})
 api.getBasicUsers.mockResolvedValue({data:[user]})
 api.getTeams.mockResolvedValue({data:[team]})
 api.getTeamDetail.mockResolvedValue({data:{...team,users:[user]}})
 api.confirm.mockResolvedValue()
 api.updateUser.mockResolvedValue()
 api.updateTeam.mockResolvedValue()
 api.updateUserRoles.mockResolvedValue()
 api.saveUserApplets.mockResolvedValue()
 api.toggleUserActivation.mockResolvedValue()
 await setLocale('zh-CN',{persist:false})
})
afterEach(async()=>{
 wrappers.splice(0).forEach(wrapper=>wrapper.unmount())
 await setLocale('zh-CN',{persist:false})
})

describe('Platform user, team and role language changes',()=>{
 it.each([Users,Assignments])('preserves applied filters, draft input, paging and original account identity',async component=>{
  const{vm}=await open(component)
  vm.filters.keyword='中文'
  vm.filters.status='activated'
  vm.handleSearch()
  vm.pagination.page=3
  const row=vm.filteredData[0]
  vm.filters.keyword='未应用草稿'
  vm.filters.status='disabled'
  await setLocale('en-US',{persist:false})
  expect(vm.appliedKeyword).toBe('中文')
  expect(vm.appliedStatus).toBe('activated')
  expect(vm.filters).toEqual({keyword:'未应用草稿',status:'disabled'})
  expect(vm.pagination.page).toBe(3)
  expect(vm.filteredData[0]).toBe(row)
  expect(api.getUsers).toHaveBeenCalledExactlyOnceWith('raw-tenant')
  if(component===Assignments){vm.handleAssignPatch(row);expect(vm.currentPatchUserLogin).toBe(user.login)}
  else{vm.handleEdit(row);expect(vm.selectedUser).toBe(row);expect(vm.getAuthModeLabel('MIX')).toBe('Mixed authentication')}
 })

 it('translates a persistent team read failure without another request',async()=>{
  api.getTeams.mockRejectedValueOnce(new Error('offline'))
  const{vm}=await open(Teams)
  vm.filters.keyword='团队草稿'
  await setLocale('en-US',{persist:false})
  expect(vm.loadError).toBe('Failed to load teams. Please retry.')
  expect(vm.filters.keyword).toBe('团队草稿')
  expect(api.getTeams).toHaveBeenCalledTimes(1)
 })

 it('uses the current language after confirmation and submits the original account and boolean status',async()=>{
  const{vm}=await open(Users)
  let confirm
  api.confirm.mockReturnValueOnce(new Promise(resolve=>{confirm=resolve}))
  const row={...user,activated:false}
  const action=vm.handleToggleActivation(row)
  await setLocale('en-US',{persist:false})
  confirm()
  await action
  expect(api.toggleUserActivation).toHaveBeenCalledExactlyOnceWith(row,true)
  expect(api.success).toHaveBeenLastCalledWith('User activated')
 })

 it('keeps user/application drafts and raw aliases while translating known application titles',async()=>{
  const{vm}=await open(UserEdit,{mode:'edit',user},true)
  vm.form.fullName='用户草稿'
  vm.form.department='原始部门'
  vm.activeTab='applets'
  vm.allApplets[0]._user_applet=true
  const apps=vm.allApplets
  await setLocale('en-US',{persist:false})
  expect(vm.form).toMatchObject({fullName:'用户草稿',department:'原始部门',authMode:'MIX',activated:true})
  expect(vm.activeTab).toBe('applets')
  expect(vm.selectedRoleIds).toEqual(['raw-role'])
  expect(vm.allApplets).toBe(apps)
  expect(vm.formatAppletTitle(apps[0])).toBe('System inspection')
  expect(vm.formatAppletTitle(apps[1])).toBe('后端自定义应用')
  expect(apps[0].title).toBe('#{cac.index.square}')
  expect(api.getUserDetail).toHaveBeenCalledTimes(1)
  expect(api.getRoles).toHaveBeenCalledTimes(1)
  expect(api.getUserApplets).toHaveBeenCalledTimes(1)
  await vm.handleSave()
  expect(api.updateUser.mock.calls[0][0]).toMatchObject({tenantUserId:'raw-tenant-user',login:user.login,fullName:'用户草稿',authMode:'MIX',activated:true,roles:[role]})
  expect(api.saveUserApplets.mock.calls[0]).toEqual(['raw-tenant-user',apps])
 })

 it.each([[UserEdit,'login','Enter a login name'],[TeamEdit,'name','Enter a team name']])('updates existing real form validation errors without clearing drafts',async(component,field,message)=>{
  const props=component===UserEdit?{mode:'edit',user}:{mode:'edit',team}
  const{vm}=await open(component,props,true)
  vm.form[field]=''
  await flushPromises()
  await vm.formRef.validateField(field).catch(()=>{})
  const formField=()=>vm.formRef.fields.find(item=>item.prop===field)
  expect(formField().validateMessage).toContain('请输入')
  await setLocale('en-US',{persist:false})
  await flushPromises()
  expect(formField().validateMessage).toBe(message)
  expect(vm.form[field]).toBe('')
  expect(api.updateUser).not.toHaveBeenCalled()
  expect(api.updateTeam).not.toHaveBeenCalled()
 })

 it('translates partial creation feedback and retries applications without creating another account',async()=>{
  api.createUser.mockResolvedValue({data:[{...user,tenantId:'raw-tenant'}]})
  api.saveUserApplets.mockRejectedValueOnce(new Error('offline'))
  const{vm}=await open(UserEdit,{mode:'create'},true)
  Object.assign(vm.form,{login:user.login,fullName:user.fullName,password:'StrongPassword1!',confirmPassword:'StrongPassword1!'})
  vm.allApplets[0]._user_applet=true
  await vm.handleSave()
  expect(vm.createdUser.tenantUserId).toBe(user.tenantUserId)
  await setLocale('en-US',{persist:false})
  expect(vm.saveIssue).toContain('The user was created, but applications could not be saved')
  await vm.handleSave()
  expect(api.createUser).toHaveBeenCalledTimes(1)
  expect(api.saveUserApplets).toHaveBeenCalledTimes(2)
  expect(api.saveUserApplets.mock.calls[1][0]).toBe(user.tenantUserId)
 })

 it('preserves team member selections and sends raw team metadata',async()=>{
  const{vm}=await open(TeamEdit,{mode:'edit',team},true)
  vm.form.description='团队描述草稿'
  vm.activeTab='users'
  const members=vm.allUsers
  await setLocale('en-US',{persist:false})
  expect(vm.allUsers).toBe(members)
  expect(members[0].isChecked).toBe(true)
  expect(vm.activeTab).toBe('users')
  expect(api.getBasicUsers).toHaveBeenCalledTimes(1)
  expect(api.getTeamDetail).toHaveBeenCalledExactlyOnceWith('raw-team')
  await vm.handleSave()
  expect(api.updateTeam.mock.calls[0][0]).toMatchObject({id:'raw-team',name:'中文团队',code:'RAW_CODE',description:'团队描述草稿',tenantName:'原始租户',users:[expect.objectContaining({id:'raw-user',login:user.login,isChecked:true})]})
 })

 it('retains role changes and filters while submitting original role identities',async()=>{
  api.getUsers.mockResolvedValueOnce({data:[{...user,roles:[]}]})
  const{wrapper,vm}=await open(Roles)
  vm.userData[0].roleMap.ROLE_ORIGINAL=true
  vm.onlyChanged=true
  vm.searchKeyword='中文'
  const changed=vm.roleChanges[0].user
  await setLocale('en-US',{persist:false})
  await flushPromises()
  expect(vm.searchKeyword).toBe('中文')
  expect(vm.onlyChanged).toBe(true)
  expect(vm.roleChanges[0].user).toBe(changed)
  expect(wrapper.text()).toContain('1 user changed')
  expect(wrapper.text()).toContain('Added: 后端角色名称')
  expect(api.getUsers).toHaveBeenCalledTimes(1)
  await vm.handleSave()
  expect(api.updateUserRoles).toHaveBeenCalledExactlyOnceWith([{tenantUserId:user.tenantUserId,roles:[role]}])
 })
})
