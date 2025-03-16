<template>
  <div class="flex flex-col sm:flex-row gap-4 items-center">
    <div class="flex-1 flex gap-2">
      <select v-model="currentFolder" class="flex-1 p-2 rounded border">
        <option value="">默认目录</option>
        <option v-for="folder in folders" :key="folder" :value="folder">
          {{ folder }}
        </option>
      </select>
      <button
        class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        @click="showNewFolder = true"
      >
        新建目录
      </button>
    </div>
  </div>

  <!-- 新建目录弹窗 -->
  <div v-if="showNewFolder" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-4 w-80">
      <h3 class="text-lg font-bold mb-4">新建目录</h3>
      <input
        v-model="newFolderName"
        type="text"
        class="w-full p-2 border rounded mb-4"
        placeholder="请输入目录名"
        @keyup.enter="createFolder"
      >
      <div class="flex justify-end gap-2">
        <button
          class="px-3 py-1 text-gray-600 hover:text-gray-800"
          @click="showNewFolder = false"
        >
          取消
        </button>
        <button
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          @click="createFolder"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { GitHubService } from '../utils/github';

const props = defineProps<{
  service: GitHubService;
}>();

const emit = defineEmits<{
  'update:folder': [value: string]
}>();

const folders = ref<string[]>([]);
const currentFolder = ref('');
const showNewFolder = ref(false);
const newFolderName = ref('');

watch(currentFolder, (value) => {
  emit('update:folder', value);
});

const createFolder = async () => {
  if (!newFolderName.value) return;
  
  const success = await props.service.createFolder(newFolderName.value);
  if (success) {
    folders.value.push(newFolderName.value);
    currentFolder.value = newFolderName.value;
    showNewFolder.value = false;
    newFolderName.value = '';
  }
};

onMounted(async () => {
  folders.value = await props.service.getFolders();
});
</script>
