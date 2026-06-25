<script setup lang="ts">
import PageLayout from '@/components/common/PageLayout.vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    backTo?: string
    backLabel?: string
    narrow?: boolean
  }>(),
  { backTo: '/doji-pattern/system', backLabel: '返回十字星系统' },
)
</script>

<template>
  <PageLayout
    :title="title"
    :subtitle="subtitle"
    :back-to="backTo"
    :back-label="backLabel"
    :narrow="narrow"
  >
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <slot />
  </PageLayout>
</template>
