import { watch } from 'vue'
import { currentLocale } from './index'

// Call alongside validate-on-rule-change=false: preserve drafts and untouched fields.
export function useLocalizedValidation(...formRefs) {
  watch(
    currentLocale,
    () => {
      for (const formRef of formRefs) {
        const form = formRef.value
        const invalid = form?.fields
          ?.filter(field => field.validateState === 'error')
          .map(field => field.prop)
        if (invalid?.length) void form.validateField(invalid).catch(() => {})
      }
    },
    { flush: 'post' }
  )
}
