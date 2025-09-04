<template>
  <div class="script-list-container">
    <!-- 空状态 -->
    <div v-if="displayScripts.length === 0" class="empty-state">
      <div v-if="isSearching" class="empty-search">
        <i class="fa-solid fa-search"></i>
        <h3>未找到匹配的脚本</h3>
        <p>尝试使用不同的关键词搜索</p>
        <button @click="$emit('clear-search')" class="TavernHelper-button">清除搜索条件</button>
      </div>
      <div v-else class="empty-repository">
        <i class="fa-solid fa-scroll"></i>
        <h3>脚本库为空</h3>
        <p>开始创建你的第一个脚本吧</p>
        <button
          @click="$emit('create-script', { name: '我的第一个脚本', folderId: null, enabled: false })"
          class="TavernHelper-button"
        >
          <i class="fa-solid fa-plus"></i>
          创建脚本
        </button>
      </div>
    </div>

    <!-- 脚本列表 -->
    <div v-else class="script-list" ref="listContainer">
      <script-list-item
        v-for="script in displayScripts"
        :key="script.id"
        :script="script"
        :is-selected="selectedScriptId === script.id"
        @select="$emit('select-script', script.id)"
        @toggle="$emit('toggle-script', script.id)"
        @run="$emit('run-script', script.id)"
        @menu="handleMenu"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ScriptListItem from '@/component/script_repository/v2/components/ScriptListItem.vue';
import { computed, ref } from 'vue';
import type { Script } from '../schemas/script.schema';

// 导入 emit 函数
const $emit = defineEmits<Emits>();

// Props
interface Props {
  scripts: Script[];
  selectedScriptId: string | null;
  isSearching: boolean;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  'clear-search': [];
  'create-script': [payload: { name: string; folderId: string | null; enabled: boolean }];
  'select-script': [id: string];
  'toggle-script': [id: string];
  'run-script': [id: string];
  'script-menu': [payload: { script: Script; event: Event }];
}

// Refs
const listContainer = ref<HTMLElement>();

// Computed
const displayScripts = computed(() => props.scripts);

// Methods
/**
 * 处理脚本菜单事件
 */
const handleMenu = (script: Script, event: Event) => {
  $emit('script-menu', { script, event });
};

// TODO: 虚拟滚动实现
// 当脚本数量很大时（>1000），可以考虑实现虚拟滚动
// 目前使用简单的渲染方式
</script>

<style scoped>
.script-list-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px; /* 为滚动条留空间 */
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}

.empty-search,
.empty-repository {
  text-align: center;
  color: var(--SmartThemeBodyColor);
}

.empty-search i,
.empty-repository i {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

.empty-search h3,
.empty-repository h3 {
  margin: 10px 0;
  color: var(--SmartThemeEmColor);
}

.empty-search p,
.empty-repository p {
  margin-bottom: 15px;
  opacity: 0.8;
}

.script-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

/* 滚动条样式 */
.script-list-container::-webkit-scrollbar {
  width: 8px;
}

.script-list-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.script-list-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.script-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
