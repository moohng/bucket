<template>
  <div v-if="initError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <p class="text-red-600">{{ initError }}</p>
    <p class="text-sm text-red-500 mt-2">请检查：</p>
    <ul class="list-disc list-inside text-sm text-red-500">
      <li>GitHub Token 是否具有 repo 权限</li>
      <li>仓库名称是否正确</li>
      <li>仓库是否为公开仓库</li>
    </ul>
  </div>

  <div v-else class="space-y-4">
    <!-- 目录管理 -->
    <FolderManager
      :service="githubService"
      v-model:folder="currentFolder"
    />
    
    <!-- 上传区域 -->
    <div class="bg-white rounded-lg shadow p-4">
      <div
        class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
        @click="triggerUpload"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <input
          type="file"
          ref="fileInput"
          class="hidden"
          accept="image/*"
          @change="handleFileChange"
        >
        <div class="text-gray-500">
          <i class="i-carbon-upload text-3xl mb-2"></i>
          <p class="text-sm">{{ uploading ? '上传中...' : '点击或拖拽图片上传' }}</p>
        </div>
      </div>
    </div>

    <!-- 控制栏 -->
    <div class="flex flex-col sm:flex-row gap-4">
      <select v-model="sortBy" class="flex-1 p-2 rounded border">
        <option value="newest">最新上传</option>
        <option value="name">名称排序</option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索图片"
        class="flex-1 p-2 rounded border"
      >
    </div>

    <!-- 图片列表 -->
    <div class="relative min-h-40">
      <div v-if="loading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
        <div class="animate-spin i-carbon-loading"></div>
      </div>
      
      <div v-if="filteredImages.length === 0" class="text-center py-10 text-gray-500">
        暂无图片
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="image in filteredImages"
          :key="image.url"
          class="group relative bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
        >
          <img
            :src="image.url"
            :alt="image.name"
            class="w-full aspect-square object-cover cursor-zoom-in"
            loading="lazy"
            @click="previewImage(image)"
          >
          <div class="p-2 bg-white">
            <p class="truncate text-sm" :title="image.name">{{ image.name }}</p>
            <div class="flex gap-2 mt-2">
              <button
                @click="copyUrl(image.url)"
                class="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                复制链接
              </button>
              <button
                @click="deleteImage(image)"
                class="flex-1 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Toast ref="toast" />
  <ImagePreview
    v-model:visible="previewVisible"
    :url="previewUrl"
    :name="previewName"
    @close="closePreview"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { GitHubService } from '../utils/github';
import Compressor from 'compressorjs';
import Toast from './Toast.vue';
import ImagePreview from './ImagePreview.vue';
import FolderManager from './FolderManager.vue';

const images = ref<Array<{ name: string; url: string }>>([]);

const githubService = new GitHubService(
  import.meta.env.VITE_GITHUB_TOKEN,
  import.meta.env.VITE_GITHUB_OWNER,
  import.meta.env.VITE_GITHUB_REPO
);

const loading = ref(false);
const uploading = ref(false);
const sortBy = ref('newest');
const searchQuery = ref('');

const filteredImages = computed(() => {
  let result = [...images.value];

  if (searchQuery.value) {
    result = result.filter(img =>
      img.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  if (sortBy.value === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
});

const toast = ref();

const currentFolder = ref('');

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6,
      success(result) {
        // Ensure result is a File object with original name
        const compressedFile = new File([result], file.name, {
          type: result.type,
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      },
      error(err) {
        reject(err);
      },
    });
  });
};

const compressWithTinyPNG = async (file: File): Promise<File> => {
  const apiKey = import.meta.env.VITE_TINYPNG_API_KEY;
  if (!apiKey) {
    throw new Error('TinyPNG API key not configured');
  }

  try {
    // 1. Upload to TinyPNG
    const response = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`
      },
      body: file
    });

    if (!response.ok) {
      throw new Error(`TinyPNG API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const outputUrl = data.output.url;

    // 2. Download compressed image
    const compressedResponse = await fetch(outputUrl);
    const blob = await compressedResponse.blob();

    return new File([blob], file.name, {
      type: blob.type,
      lastModified: Date.now()
    });
  } catch (error) {
    console.error('TinyPNG compression failed:', error);
    throw error;
  }
};

const handleUpload = async (options: any) => {
  try {
    uploading.value = true;
    let compressedFile: File;

    // Try TinyPNG first
    try {
      if (!import.meta.env.VITE_TINYPNG_API_KEY) {
        throw new Error('Skip TinyPNG');
      }
      console.log('Starting TinyPNG compression...');
      compressedFile = await compressWithTinyPNG(options.file);
      console.log(`TinyPNG Success: ${(options.file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);
    } catch (error) {
      // Fallback to local compression
      console.log('Falling back to local compression...');
      compressedFile = await compressImage(options.file);
      console.log(`Local Compression: ${(options.file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);
    }

    const url = await githubService.uploadImage(compressedFile, currentFolder.value);
    images.value.unshift({
      name: compressedFile.name,
      url
    });
    toast.value?.success('上传成功');
  } catch (error) {
    console.error(error);
    toast.value?.error('上传失败');
  } finally {
    uploading.value = false;
  }
};

const copyUrl = (url: string) => {
  navigator.clipboard.writeText(url);
  toast.value?.success('链接已复制');
};

const deleteImage = async (image: { name: string; url: string }) => {
  try {
    const path = `images/${image.name}`;
    const confirmed = window.confirm('确定要删除这张图片吗？');
    
    if (confirmed) {
      loading.value = true;
      const { success, sha } = await githubService.deleteImage(path);
      if (success) {
        images.value = images.value.filter(img => img.name !== image.name);
        const imgElements = document.querySelectorAll(`img[src*="${sha}"]`);
        imgElements.forEach(img => {
          img.setAttribute('src', '');
        });
        toast.value?.success('删除成功');
      }
    }
  } catch (error: any) {
    console.error('删除失败:', error);
    toast.value?.error(error.message || '删除失败');
  } finally {
    loading.value = false;
  }
};

const fileInput = ref<HTMLInputElement | null>(null)

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    handleUpload({ file })
  }
}

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files[0]
  if (file?.type.startsWith('image/')) {
    handleUpload({ file })
  }
}

const initialized = ref(false);
const initError = ref('');

const previewVisible = ref(false);
const previewUrl = ref('');
const previewName = ref('');

const previewImage = (image: { name: string; url: string }) => {
  previewUrl.value = image.url;
  previewName.value = image.name;
  previewVisible.value = true;
};

const closePreview = () => {
  previewVisible.value = false;
};

watch(currentFolder, async () => {
  try {
    loading.value = true;
    images.value = await githubService.getImageList(currentFolder.value);
  } catch (error) {
    toast.value?.error('获取图片列表失败');
  } finally {
    loading.value = false;
  }
});

onMounted(async () => {
  try {
    loading.value = true;
    await githubService.init();
    initialized.value = true;
    images.value = await githubService.getImageList(currentFolder.value);
  } catch (error: any) {
    initError.value = error.message;
    console.error('初始化失败:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.upload-card {
  margin-bottom: 20px;
}

.controls {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.image-list {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.image-item {
  position: relative;
  transition: transform 0.2s;
  cursor: pointer;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 4px;
}

.image-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-info {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-name {
  display: inline-block;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.el-image {
  width: 100%;
  height: 150px;
}

.el-upload {
  width: 100%;
}

.el-upload-dragger {
  width: 100%;
}
</style>
