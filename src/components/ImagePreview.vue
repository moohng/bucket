<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50" @click="close">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div class="relative w-full h-full flex items-center justify-center p-4">
        <img
          :src="url"
          :alt="name"
          class="max-w-full max-h-full object-contain cursor-zoom-out"
          @click.stop
        >
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  url: string
  name: string
}>()

const emit = defineEmits<{
  close: []
}>()

const close = () => emit('close')
</script>
