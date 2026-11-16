import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Page from '@/modules/inspection/views/StructuralDiagramPage.vue'

const api=vi.hoisted(()=>Object.fromEntries([
  'getJob','getStructuralDiagram','getStructuralDiagramPrimaryInfo','getStructuralDiagramHostItemInfo','getStructuralKpi',
  'getStructuralKpiHostAll','getStructuralKpiHostOk','getStructuralKpiHostFailed','getStructuralKpiHostCheck','getStructuralKpiItemAll',
  'getCheckItemByStatus','getCheckItemInfo'
].map(name=>[name,vi.fn()])))
const chart=vi.hoisted(()=>Object.fromEntries(['init','setOption','clear','resize','dispose','on','off','getDataURL','dispatchAction'].map(name=>[name,vi.fn()])))
const navigation=vi.hoisted(()=>({ push:vi.fn(), route:{path:'/cac/structural-diagram/report-a',params:{jobId:'report-a'},query:{templateId:'原始模板ID',keyword:'原始搜索',page:'3',size:'20',sortProp:'endedAt',sortOrder:'ascending'}} }))
const feedback=vi.hoisted(()=>({success:vi.fn(),error:vi.fn()}))
vi.mock('@/modules/inspection/api',()=>({jobApi:api,dtsApi:api}))
vi.mock('@/core/auth',()=>({authService:{getAuthHeaders:()=>({'X-Original-Auth':'original'})}}))
vi.mock('vue-router',()=>({useRoute:()=>navigation.route,useRouter:()=>({push:navigation.push})}))
vi.mock('element-plus',()=>({ElMessage:feedback}))
vi.mock('echarts',()=>({init:chart.init}))
const Slot={template:'<div><slot /><slot name="footer" /></div>'}
let wrapper
const state=()=>wrapper.vm.$.setupState
const diagram=()=>[{type:'root',name:'后端根业务',count:2,children:[{type:'sub',name:'支付业务',count:1,children:[{type:'item',name:'订单系统',count:1,value:'支付业务::订单系统'}]}]}]
const primary=(count=1)=>({data:{primaryData:Array.from({length:count},()=>({name:'订单系统',contItem:count,contHost:count})),itemTotal:count,hostTotal:count}})
const secondary=(count=1)=>({data:{itemLists:Array.from({length:count},()=>({item:'中文检查项',host:'中文主机',count:1})),hostLists:Array.from({length:count},()=>({host:'中文主机',item:'中文检查项',count:1}))}})
async function open(){
  wrapper=shallowMount(Page,{props:{jobId:'report-a'},global:{stubs:{
    'el-dialog':{props:['modelValue','title'],template:'<section v-if="modelValue"><h3>{{title}}</h3><slot /></section>'},
    ...Object.fromEntries(['el-breadcrumb','el-breadcrumb-item','el-button','el-form','el-form-item','el-tabs','el-tab-pane','el-tag'].map(name=>[name,Slot])),
    'el-table':true,'el-table-column':true,'el-input':true,'el-icon':true,
    'el-alert':{props:['title'],template:'<div>{{title}}<slot /></div>'},I18nT:false,'i18n-t':false
  },directives:{loading(){}}}})
  await flushPromises()
  return state()
}
beforeEach(async()=>{
  vi.resetAllMocks()
  Object.values(api).forEach(mock=>mock.mockResolvedValue({data:{records:[]}}))
  chart.init.mockReturnValue(chart)
  chart.getDataURL.mockReturnValue('data:image/png;base64,original')
  api.getJob.mockResolvedValue({data:{templateName:'后端中文报告'}})
  api.getStructuralDiagram.mockResolvedValue({data:diagram()})
  api.getStructuralKpi.mockResolvedValue({data:{records:[{name:'hostAll',value:1},{name:'FAILED',value:1},{name:'itemAll',value:1}]}})
  api.getStructuralDiagramPrimaryInfo.mockResolvedValue(primary())
  api.getStructuralDiagramHostItemInfo.mockResolvedValue(secondary())
  api.getCheckItemByStatus.mockResolvedValue({data:{records:[{id:'raw-item',name:'中文检查项',host_key:'中文主机',status:'FAILED'}]}})
  api.getCheckItemInfo.mockResolvedValue({data:{records:[{id:'raw-item',name:'中文检查项',status:'后端未知状态',output:'后端输出 {raw}\n{{raw}}'}]}})
  await setLocale('zh-CN',{persist:false})
})
afterEach(async()=>{
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await setLocale('zh-CN',{persist:false})
})

describe('Business topology language changes',()=>{
  it('updates only toolbox captions and keeps graph data, node collapse, KPI identity and handlers',async()=>{
    const vm=await open()
    const initial=chart.setOption.mock.calls.find(([option])=>option.series)[0]
    const nodes=vm.diagramData
    const kpi=vm.kpiList[0]
    nodes[0].children[0].collapsed=true
    const calls=chart.setOption.mock.calls.length
    const clearCalls=chart.clear.mock.calls.length
    expect(initial.toolbox.feature.restore.title).toBe('还原')
    await setLocale('en-US',{persist:false})
    await flushPromises()
    expect(vm.diagramData).toBe(nodes)
    expect(nodes[0].children[0].collapsed).toBe(true)
    expect(vm.kpiList[0]).toBe(kpi)
    expect(kpi).toMatchObject({name:'Total hosts',pageParam:'hostAll',value:1})
    expect(chart.init).toHaveBeenCalledTimes(1)
    expect(chart.clear).toHaveBeenCalledTimes(clearCalls)
    expect(chart.on).toHaveBeenCalledTimes(4)
    expect(chart.off).toHaveBeenCalledTimes(4)
    expect(chart.setOption).toHaveBeenCalledTimes(calls+1)
    const update=chart.setOption.mock.lastCall[0]
    expect(Object.keys(update)).toEqual(['toolbox'])
    expect(update.toolbox.feature).toMatchObject({restore:{title:'Restore'},saveAsImage:{title:'Save as image',lang:['Right-click to save the image']}})
    expect(initial.series[0].label.formatter({data:nodes[0]})).toContain('后端根业务')
    const handlers=Object.fromEntries(chart.on.mock.calls)
    handlers.dblclick({data:nodes[0].children[0]})
    handlers.click({data:nodes[0].children[0].children[0]})
    await flushPromises()
    expect(api.getStructuralDiagramPrimaryInfo).toHaveBeenCalledExactlyOnceWith({jobId:'report-a',primaryService:'支付业务'})
    expect(api.getStructuralDiagramHostItemInfo).toHaveBeenCalledExactlyOnceWith({jobId:'report-a',primaryService:'支付业务',secondaryService:'订单系统'})
    expect(api.getStructuralDiagram).toHaveBeenCalledTimes(1)
    expect(api.getStructuralKpi).toHaveBeenCalledTimes(1)
    expect(api.getJob).toHaveBeenCalledTimes(1)
  })

  it('preserves actual ECharts tree expansion and zoom when applying translated toolbox options',async()=>{
    await open()
    const initial=chart.setOption.mock.calls.find(([option])=>option.series)[0]
    const echarts=await vi.importActual('echarts')
    echarts.setPlatformAPI({measureText:text=>({width:String(text).length*7})})
    const instance=echarts.init(null,null,{renderer:'svg',ssr:true,width:1000,height:700})
    try{
      instance.setOption({...initial,animation:false})
      for(const[event,handler]of chart.on.mock.calls)instance.on(event,handler)
      chart.setOption.mockImplementation(option=>instance.setOption(option))
      chart.dispatchAction.mockImplementation(action=>instance.dispatchAction(action))
      const series=()=>instance.getModel().getSeriesByIndex(0)
      const sub=()=>series().getData().tree.root.children[0].children[0]
      const expanded=sub().isExpand
      instance.dispatchAction({type:'treeExpandAndCollapse',seriesIndex:0,dataIndex:sub().dataIndex})
      expect(sub().isExpand).toBe(!expanded)
      instance.dispatchAction({type:'treeRoam',seriesIndex:0,zoom:1.2,originX:200,originY:200})
      const zoom=series().option.zoom
      expect(zoom).toBe(1.2)
      await setLocale('en-US',{persist:false})
      await flushPromises()
      expect(sub().isExpand).toBe(!expanded)
      expect(series().option.zoom).toBe(zoom)
      expect(instance.getOption().toolbox[0].feature.restore.title).toBe('Restore')
      await setLocale('zh-CN',{persist:false})
      await flushPromises()
      expect(sub().isExpand).toBe(!expanded)
      expect(series().option.zoom).toBe(zoom)
      instance.dispatchAction({type:'restore'})
      const restored=sub().isExpand
      await setLocale('en-US',{persist:false})
      await flushPromises()
      expect(sub().isExpand).toBe(restored)
    }finally{
      chart.setOption.mockImplementation(()=>{})
      chart.dispatchAction.mockImplementation(()=>{})
      instance.dispose()
    }
  })

  it('preserves primary/secondary searches, active tab and raw list names while titles update',async()=>{
    const vm=await open()
    await vm.showPrimaryDialog('支付业务')
    await vm.showSecondaryDialog('支付业务','订单系统')
    vm.primaryFilterText='订单'
    vm.secondaryItemFilterText='中文'
    vm.secondaryHostFilterText='主机'
    vm.secondaryActiveTab='host'
    const items=vm.itemData
    vm.showHostList('中文主机一,中文主机二')
    const list=vm.listData
    await setLocale('en-US',{persist:false})
    await flushPromises()
    expect(vm.primaryDialogTitle).toBe('支付业务 - Secondary services')
    expect(vm.secondaryDialogTitle).toBe('订单系统 - Details')
    expect(vm.listDialogTitle).toBe('Host list')
    expect(vm.listData).toBe(list)
    expect(list).toEqual([{name:'中文主机一'},{name:'中文主机二'}])
    expect(vm.itemData).toBe(items)
    expect([vm.primaryFilterText,vm.secondaryItemFilterText,vm.secondaryHostFilterText,vm.secondaryActiveTab]).toEqual(['订单','中文','主机','host'])
    expect(api.getStructuralDiagramPrimaryInfo).toHaveBeenCalledTimes(1)
    expect(api.getStructuralDiagramHostItemInfo).toHaveBeenCalledTimes(1)
    vm.showItemList('原始检查项一,原始检查项二')
    expect(vm.listDialogTitle).toBe('Check item list')
    expect(vm.listData[0].name).toBe('原始检查项一')
  })

  it.each([
    ['hostAll','getStructuralKpiHostAll','Total hosts'],['hostOkAll','getStructuralKpiHostOk','Hosts passed'],
    ['hostFailedAll','getStructuralKpiHostFailed','Hosts failed'],['hostCheckAll','getStructuralKpiHostCheck','Hosts pending checks'],
    ['itemAll','getStructuralKpiItemAll','Check item'],['OK','getCheckItemByStatus','Check passed'],
    ['FAILED','getCheckItemByStatus','Check failed'],['CHECK','getCheckItemByStatus','Manual check']
  ])('keeps the %s detail request and filter while translating the open title',async(type,method,title)=>{
    api.getStructuralKpi.mockResolvedValue({data:{records:[{name:type,value:1}]}})
    const vm=await open()
    await vm.handleKpiClick(vm.kpiList[0])
    vm.kpiFilterText='中文草稿'
    const data=vm.kpiDialogData
    await setLocale('en-US',{persist:false})
    expect(vm.kpiDialogTitle).toBe(`${title} - Details`)
    expect(vm.kpiDialogType).toBe(type)
    expect(vm.kpiFilterText).toBe('中文草稿')
    expect(vm.kpiDialogData).toBe(data)
    expect(api[method]).toHaveBeenCalledTimes(1)
    expect(api[method].mock.calls[0]).toEqual(method==='getCheckItemByStatus'?['report-a',type]:['report-a'])
  })

  it('translates persistent failures and only retries when explicitly requested',async()=>{
    api.getStructuralKpi.mockRejectedValueOnce(new Error('offline'))
    api.getStructuralDiagram.mockRejectedValueOnce(new Error('offline'))
    api.getStructuralDiagramPrimaryInfo.mockRejectedValueOnce(new Error('offline'))
    api.getStructuralDiagramHostItemInfo.mockRejectedValueOnce(new Error('offline'))
    api.getCheckItemByStatus.mockRejectedValueOnce(new Error('offline'))
    api.getCheckItemInfo.mockRejectedValueOnce(new Error('offline'))
    const vm=await open()
    await vm.showPrimaryDialog('支付业务')
    await vm.showSecondaryDialog('支付业务','订单系统')
    await vm.handleKpiClick({pageParam:'FAILED',name:'原始自定义名称'})
    await vm.showCheckItemDetail({id:'raw-item',name:'中文检查项',output:'已有原始输出'})
    vm.primaryFilterText='保留草稿'
    await setLocale('en-US',{persist:false})
    expect(vm.kpiError).toBe('Failed to load topology metrics. Please retry.')
    expect(vm.diagramError).toBe('Failed to load the topology. Please retry.')
    expect(vm.primaryError).toBe('Failed to load primary service details. Please retry.')
    expect(vm.secondaryError).toBe('Failed to load secondary service details. Please retry.')
    expect(vm.kpiDialogError).toBe('Failed to load metric details. Please retry.')
    expect(vm.checkItemError).toContain('Only previously available information')
    expect(vm.kpiDialogTitle).toBe('原始自定义名称 - Details')
    expect(vm.currentCheckItem.output).toBe('已有原始输出')
    for(const method of ['getStructuralKpi','getStructuralDiagram','getStructuralDiagramPrimaryInfo','getStructuralDiagramHostItemInfo','getCheckItemByStatus','getCheckItemInfo'])expect(api[method]).toHaveBeenCalledTimes(1)
    await vm.showPrimaryDialog('支付业务',true)
    expect(vm.primaryFilterText).toBe('保留草稿')
    expect(vm.primaryError).toBe('')
    expect(api.getStructuralDiagramPrimaryInfo).toHaveBeenCalledTimes(2)
  })

  it('accepts in-flight data in the current language without starting another read',async()=>{
    let finishKpi,finishDiagram
    api.getStructuralKpi.mockReturnValueOnce(new Promise(resolve=>{finishKpi=resolve}))
    api.getStructuralDiagram.mockReturnValueOnce(new Promise(resolve=>{finishDiagram=resolve}))
    const vm=await open()
    await setLocale('en-US',{persist:false})
    finishKpi({data:{records:[{name:'hostAll',value:1}]}})
    finishDiagram({data:diagram()})
    await flushPromises()
    expect(vm.kpiList[0].name).toBe('Total hosts')
    expect(chart.setOption.mock.lastCall[0].toolbox.feature.restore.title).toBe('Restore')
    expect(api.getStructuralKpi).toHaveBeenCalledTimes(1)
    expect(api.getStructuralDiagram).toHaveBeenCalledTimes(1)
  })

  it.each([0,1,2])('uses complete plural messages for %i service, item and host counts',async count=>{
    api.getStructuralDiagramPrimaryInfo.mockResolvedValue(primary(count))
    api.getStructuralDiagramHostItemInfo.mockResolvedValue(secondary(count))
    const vm=await open()
    await vm.showPrimaryDialog('支付业务')
    await vm.showSecondaryDialog('支付业务','订单系统')
    await setLocale('en-US',{persist:false})
    await flushPromises()
    const plural=count===1?'':'s'
    expect(wrapper.text()).toContain(`Secondary service${plural}: ${count}`)
    expect(wrapper.text()).toContain(`Check item${plural}: ${count}`)
    expect(wrapper.text()).toContain(`Host${plural}: ${count}`)
    expect(wrapper.text()).toContain(`${count} check item${plural}`)
    expect(wrapper.text()).toContain(`${count} host${plural}`)
    expect(wrapper.find('.primary-stats strong').text()).toBe(String(count))
  })

  it('keeps raw output, download content, filenames, authentication and return query values',async()=>{
    const vm=await open()
    await vm.showCheckItemDetail({id:'raw-item'})
    await setLocale('en-US',{persist:false})
    await flushPromises()
    expect(wrapper.get('pre').text()).toBe('后端输出 {raw}\n{{raw}}')
    expect(vm.getStatusLabel('后端未知状态')).toBe('后端未知状态')
    const filenames=[]
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){filenames.push(this.download)})
    const blob=new Blob(['后端原始Excel'])
    const fetch=vi.fn().mockResolvedValue({ok:true,blob:async()=>blob})
    vi.stubGlobal('fetch',fetch)
    vi.stubGlobal('URL',class extends URL{static createObjectURL=vi.fn(()=>'blob:original');static revokeObjectURL=vi.fn()})
    vm.downloadImage()
    await vm.exportExcel()
    expect(chart.getDataURL).toHaveBeenCalledExactlyOnceWith({type:'png',pixelRatio:2,backgroundColor:'#fff'})
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/results/export/report-a'),{method:'GET',headers:{'X-Original-Auth':'original','Content-Type':'application/x-www-form-urlencoded'}})
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(filenames[0]).toBe('后端中文报告.png')
    expect(filenames[1]).toMatch(/^后端中文报告.*\.xlsx$/)
    vm.goBack()
    expect(navigation.push).toHaveBeenLastCalledWith({path:'/cac/results',query:navigation.route.query})
  })
})
