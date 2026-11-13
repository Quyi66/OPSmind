import { computed, shallowRef } from 'vue'
import { t } from './index'

const LOCAL_MESSAGE = Symbol('local-message')
export function message(key, params = {}) {
  return { [LOCAL_MESSAGE]: true, key, params }
}

// Preserve keys in long-lived feedback, while leaving backend text completely untouched.
/** @param {string | null | ReturnType<typeof message>} [initial] */
export function messageRef(initial = '') {
  const source = shallowRef(initial)
  return computed({
    get: () =>
      source.value?.[LOCAL_MESSAGE]
        ? t(
            source.value.key,
            typeof source.value.params === 'function' ? source.value.params() : source.value.params
          )
        : /** @type {string | null} */ (source.value),
    set: value => {
      source.value = value
    }
  })
}
