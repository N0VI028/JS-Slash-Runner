<template>
  <!-- 空 content 不渲染，避免仅工具调用时出现空白行 -->
  <template v-if="props.content">
    <template v-if="props.searchInput !== null && props.matchedOnly">
      <template v-for="(item, index) in match_only_blocks" :key="index">
        <div v-if="is_expanded[index]">
          <div class="wrap-break-word whitespace-pre-wrap">
            <Highlighter :query="searchInput">{{ item }}</Highlighter>
          </div>
          <!-- prettier-ignore-attribute -->
          <div
            v-if="is_collapsible[index]"
            class="
              my-0.5 flex cursor-pointer items-center justify-center gap-0.5 rounded-sm border
              border-(--SmartThemeBorderColor) px-1 py-0.5 th-text-sm text-(--SmartThemeQuoteColor)
            "
            @click="is_expanded[index] = false"
          >
            {{ t`收起内容` }}<i class="fa-solid fa-chevron-up"></i>
          </div>
        </div>
        <div v-else @click="is_expanded[index] = true">
          <!-- prettier-ignore-attribute -->
          <div
            class="
              my-0.5 flex cursor-pointer items-center justify-center gap-0.5 rounded-sm border
              border-(--SmartThemeBorderColor) px-1 py-0.5 th-text-sm text-(--SmartThemeQuoteColor)
            "
          >
            {{ t`展开` }} {{ (item.match(/\n/g)?.length ?? 0) + 1 }} {{ t`行隐藏内容` }}
            <i class="fa-solid fa-chevron-down" />
          </div>
        </div>
      </template>
    </template>
    <template v-else>
      <template v-for="(block, index) in normal_blocks" :key="index">
        <div
          class="TH-prompt-content-block wrap-break-word whitespace-pre-wrap"
          :style="{ containIntrinsicSize: `auto ${block.intrinsicSizeLh}lh` }"
        >
          <Highlighter v-if="block.matched && searchInput !== null" :query="searchInput">
            {{ block.text || ' ' }}
          </Highlighter>
          <template v-else>
            {{ block.text || ' ' }}
          </template>
        </div>
      </template>
    </template>
  </template>
</template>

<script setup lang="ts">
import { chunkBy } from '@/util/algorithm';

const props = defineProps<{
  content: string;
  searchInput: RegExp | null;
  matchedOnly: boolean;
}>();

const CONTENT_BLOCK_LINE_COUNT = 500;
const NEARBY_LINE_COUNT = 2;
const is_expanded = ref<boolean[]>([]);
const is_collapsible = ref<boolean[]>([]);
const match_only_blocks = shallowRef<string[]>([]);
const normal_blocks = shallowRef<{ text: string; matched: boolean; intrinsicSizeLh: number }[]>([]);
watch(
  () => [props.content, props.searchInput, props.matchedOnly] as const,
  ([content, search_input, matched_only]) => {
    // 空 content 不生成占位 block，避免 tool_calls 前出现空白行
    if (!content) {
      is_expanded.value = [];
      is_collapsible.value = [];
      match_only_blocks.value = [];
      normal_blocks.value = [];
      return;
    }

    if (search_input !== null && matched_only) {
      const line_starts = _.concat(0, [...content.matchAll(/\n/g)].map(match => match.index) ?? []);
      const line_count = line_starts.length;

      const offsetToLine = (offset: number): number => {
        let low = 0;
        let high = line_starts.length - 1;
        while (low <= high) {
          const mid = (low + high) >>> 1;
          const value = line_starts[mid];
          if (value === offset) {
            return mid;
          }
          if (value < offset) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        return Math.max(0, low - 1);
      };

      const matches = [...content.matchAll(new RegExp(search_input, search_input.flags + 'g'))];
      if (matches.length === 0) {
        is_expanded.value = [];
        is_collapsible.value = [];
        match_only_blocks.value = [content];
        return;
      }

      const matched_ranges: { start: number; end: number }[] = _(matches)
        .map(match => ({
          start: Math.max(0, offsetToLine(match.index) - NEARBY_LINE_COUNT),
          end: Math.min(line_count - 1, offsetToLine(match.index + match.length - 1) + NEARBY_LINE_COUNT),
        }))
        .sortBy('start')
        .thru(matches => chunkBy(matches, (lhs, rhs) => lhs.end >= rhs.start))
        .map(chunks => {
          return {
            start: chunks[0].start,
            end: chunks[chunks.length - 1].end,
          };
        })
        .value();

      const lines = content.split('\n');

      const result: { is_expanded: boolean; content: string; collapsible: boolean }[] = [];
      let previous_end = -1;
      for (const { start, end } of matched_ranges) {
        if (start > previous_end + 1) {
          const unmatched_start = previous_end + 1;
          const unmatched_end = start - 1;
          result.push({
            is_expanded: false,
            content: lines.slice(unmatched_start, unmatched_end + 1).join('\n'),
            collapsible: true,
          });
        }
        result.push({ is_expanded: true, content: lines.slice(start, end + 1).join('\n'), collapsible: false });
        previous_end = end;
      }
      if (previous_end < line_count - 1) {
        const unmatched_start = previous_end + 1;
        const unmatched_end = line_count - 1;
        result.push({
          is_expanded: false,
          content: lines.slice(unmatched_start, unmatched_end + 1).join('\n'),
          collapsible: true,
        });
      }

      is_expanded.value = result.map(item => item.is_expanded);
      is_collapsible.value = result.map(item => item.collapsible);
      match_only_blocks.value = result.map(item => item.content);
      normal_blocks.value = [];
      return;
    }

    const regex = search_input === null ? null : new RegExp(search_input.source, search_input.flags);
    is_expanded.value = [];
    is_collapsible.value = [];
    match_only_blocks.value = [];
    normal_blocks.value = _.chunk(content.split('\n'), CONTENT_BLOCK_LINE_COUNT).map((lines, id) => {
      const text = lines.join('\n');
      return {
        id,
        text,
        matched: regex?.test(text) ?? false,
        intrinsicSizeLh: Math.max(lines.length + 2, 4),
      };
    });
  },
  { immediate: true },
);
</script>

<style scoped>
.TH-prompt-content-block {
  content-visibility: auto;
  overflow-anchor: none;
}
</style>
