<template>
  <div class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'toast-item',
        toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
      ]"
    >
      <span class="text-white">{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const toasts = ref<Toast[]>([]);
let toastId = 0;

const show = (message: string, type: 'success' | 'error' = 'success') => {
  const id = toastId++;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 3000);
};

// 暴露方法给外部使用
defineExpose({
  success: (message: string) => show(message, 'success'),
  error: (message: string) => show(message, 'error')
});
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: fit-content;
  max-width: calc(100vw - 2rem);
  pointer-events: none;
}

.toast-item {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  animation: toast-in 0.3s ease-out;
  width: fit-content;
  margin: 0 auto;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
