<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-5xl mx-auto">
      <header class="mb-6 p-4 bg-white rounded-lg shadow flex justify-between items-center">
        <h1 class="text-2xl font-bold text-blue-600">GitHub图床管理工具</h1>
        <span class="px-2 py-1 bg-green-100 text-green-600 rounded text-sm">已连接到GitHub</span>
      </header>
      <ImageUploader />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageUploader from './components/ImageUploader.vue';
</script>

<style>
:root {
  --primary-color: #409EFF;
  --background-color: #f5f7fa;
}

body {
  margin: 0;
  background-color: var(--background-color);
}

.app-container {
  width: 100%;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

h1 {
  margin: 0;
  color: var(--primary-color);
  font-size: 24px;
}
</style>
