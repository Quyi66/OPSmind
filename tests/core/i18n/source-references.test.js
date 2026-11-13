import { describe, expect, it } from 'vitest'
import { collectI18nReferences } from '../../../scripts/i18n-source-references.mjs'

describe('i18n literal reference checking', () => {
  it('checks only imported app helpers, including aliases and message DTOs', () => {
    const source = `import { t as translate } from '@/core/i18n'
import { message } from '@/core/i18n/feedback'
translate('common.save')
message('asset.loadFailed')
t('not-an-import')
other.translate('not-an-app-helper')
translate(variableKey)
// translate('comment')`
    expect(collectI18nReferences(source, 'example.js')).toEqual([
      { key: 'common.save', line: 3 },
      { key: 'asset.loadFailed', line: 4 }
    ])
  })
  it.each([true, false])(
    'checks nested Vue templates with either script position (%s)',
    scriptFirst => {
      const script = `<script setup lang="ts">import { t } from '@/core/i18n'
const label = t('asset.label')</script>`
      const template = `<template>
<!-- {{ t('ignored.comment') }} -->
<template v-if="visible"><span>{{ t('asset.title') }}</span></template>
<el-input :placeholder="t('asset.placeholder')" />
</template>`
      const source = scriptFirst ? `${script}\n${template}` : `${template}\n${script}`
      expect(
        collectI18nReferences(source, 'Example.vue')
          .map(item => item.key)
          .sort()
      ).toEqual(['asset.label', 'asset.placeholder', 'asset.title'])
    }
  )
  it('leaves legacy helpers, raw backend text and unrelated functions outside this check', () => {
    expect(
      collectI18nReferences(
        `import { translateText } from '@/utils/i18n'
const t = value => value
t('raw backend text')
translateText('legacy.key')`,
        'example.js'
      )
    ).toEqual([])
  })
})
