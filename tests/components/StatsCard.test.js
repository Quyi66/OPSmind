import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsCard from '@/components/StatsCard.vue'

describe('StatsCard', () => {
  it('renders properly', () => {
    const wrapper = mount(StatsCard, {
      props: {
        title: '测试标题',
        value: '100',
        icon: 'test-icon',
        color: 'primary'
      }
    })

    expect(wrapper.text()).toContain('测试标题')
    expect(wrapper.text()).toContain('100')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(StatsCard, {
      props: {
        title: '测试标题',
        value: '100',
        icon: 'test-icon',
        color: 'primary'
      }
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })

  it('applies correct color class', () => {
    const wrapper = mount(StatsCard, {
      props: {
        title: '测试标题',
        value: '100',
        icon: 'test-icon',
        color: 'success'
      }
    })

    expect(wrapper.classes()).toContain('stats-card--success')
  })
})
