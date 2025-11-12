<template>
  <div class="flex h-full flex-col gap-1 overflow-hidden p-1 text-(--SmartThemeBodyColor)">
    <div class="flex flex-col gap-0.5 bg-(--grey5020a) p-0.5">
      <div class="flex items-center gap-0.5">
        <div
          class="flex h-2 w-2 cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)"
          @click="is_filter_opened = !is_filter_opened"
        >
          <i class="fa-solid fa-filter" />
        </div>
        <SearchBar
          v-model="search_input"
          class="grow rounded-sm bg-transparent th-text-base text-(--mainTextColor)"
          :placeholder="t`搜索日志内容...`"
        />
        <div class="flex h-2 w-2 cursor-pointer items-center justify-center">
          <i class="fa-solid fa-ban" />
        </div>
      </div>
      <div v-if="is_filter_opened" ref="teleportTarget" class="flex items-center gap-0.5"></div>
      <Teleport v-if="teleportTarget" :to="teleportTarget">
        <div class="flex gap-1">
          <div class="flex items-center gap-0.5">
            <input type="checkbox" value="system" />
            {{ t`详细` }}
          </div>
          <div class="flex items-center gap-0.5">
            <input type="checkbox" value="user" />
            {{ t`信息` }}
          </div>
          <div class="flex items-center gap-0.5">
            <input type="checkbox" value="assistant" />
            {{ t`警告` }}
          </div>
          <div class="flex items-center gap-0.5">
            <input type="checkbox" value="error" />
            {{ t`错误` }}
          </div>
        </div>
      </Teleport>
    </div>
    <div
      class="flex flex-1 flex-col gap-[var(--log-gap)] overflow-y-auto"
      style="--log-gap: calc(var(--mainFontSize) * 0.5);"
    >
      <div class="TH-log-item TH-normal">initializing Prompt Itemization Array on Startup</div>
      <div class="TH-log-item TH-normal">普通消息</div>
      <div class="TH-log-item TH-warn">警告信息</div>
      <div class="TH-log-item TH-error">错误信息</div>
      <div class="TH-log-item TH-normal">initializing Prompt Itemization Array on Startup</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const teleportTarget = useTemplateRef<HTMLElement>('teleportTarget');

const search_input = ref<RegExp | null>(null);
const is_filter_opened = ref<boolean>(false);
</script>

<style scoped>
.TH-log-item {
  position: relative;
  border-radius: 3px;
  padding: 3px 5px;
}

/* 仅普通条目之间：在两条之间的间隙中线居中 */
.TH-log-item.TH-normal + .TH-log-item.TH-normal::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--log-gap) / 2);
  height: 1px;
  background: var(--grey5020a);
  pointer-events: none;
}

/* 级别底色 */
.TH-log-item.TH-warn {
  background: rgba(255, 208, 0, 0.4);
}
.TH-log-item.TH-error {
  background: var(--crimson-hover);
}
</style>
