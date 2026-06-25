<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    backTo?: string
    backLabel?: string
    narrow?: boolean
  }>(),
  { backLabel: '返回' },
)
</script>

<template>
  <div class="page-layout page-container" :class="{ 'page-layout--narrow': narrow }">
    <header class="page-layout__header">
      <div class="page-layout__heading">
        <router-link v-if="backTo" :to="backTo" class="page-layout__back">
          ← {{ backLabel }}
        </router-link>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-layout__actions">
        <slot name="actions" />
      </div>
      <div v-if="$slots.extra" class="page-layout__extra">
        <slot name="extra" />
      </div>
    </header>
    <div class="page-layout__body">
      <slot />
    </div>
  </div>
</template>
