import { computed, watch } from 'vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import en from 'element-plus/dist/locale/en.mjs'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { currentLocale } from './index'
import { DATE_LOCALES } from './locales'

const locales = { 'zh-CN': zhCn, 'en-US': en }
export const elementLocale = computed(() => locales[currentLocale.value])
watch(currentLocale, locale => dayjs.locale(DATE_LOCALES[locale]), { immediate: true })
