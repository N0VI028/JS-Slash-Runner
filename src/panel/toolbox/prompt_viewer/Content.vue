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
      <template v-for="(block, index) in decorated_blocks" :key="index">
        <div
          class="TH-prompt-content-block wrap-break-word whitespace-pre-wrap"
          :style="{ containIntrinsicSize: `auto ${block.intrinsicSizeLh}lh` }"
        >
          <template v-for="(piece, piece_index) in block.pieces" :key="piece_index">
            <!-- 世界书/预设/ST自收集来源片段：条目标签独占一行置于片段之前，正文本身不改动样式 -->
            <div v-if="piece.mark" class="TH-wi-piece">
              <div class="TH-wi-badge-row">
                <span class="TH-wi-badge"
                  ><i
                    v-if="piece.mark.icon"
                    :class="piece.mark.icon"
                    aria-hidden="true"
                    class="mr-0.5 align-middle text-[0.75em]!"
                  ></i
                  >{{ piece.mark.label }}</span
                >
              </div>
              {{ piece.text }}
            </div>
            <Highlighter v-else-if="block.matched && searchInput !== null" :query="searchInput">
              {{ piece.text }}
            </Highlighter>
            <template v-else>
              {{ piece.text }}
            </template>
          </template>
        </div>
      </template>
    </template>
  </template>
</template>

<script setup lang="ts">
import { splitBySpans, type WiMark } from '@/panel/toolbox/prompt_viewer/wi_tracer/marks';
import { chunkBy } from '@/util/algorithm';

const props = defineProps<{
  content: string;
  searchInput: RegExp | null;
  matchedOnly: boolean;
  /** 世界书/预设/ST内联标记（偏移基于 content 原文），无标记时为 undefined */
  marks?: WiMark[];
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

/**
 * 正常模式下按世界书/预设/ST标记切分各内容块为片段序列
 * matched_only 折叠视图（按行收缩）不叠加标注，保持行折叠语义清晰
 */
const decorated_blocks = computed(() => {
  const marks = props.marks ?? [];
  let base = 0;
  return normal_blocks.value.map(block => {
    const pieces = marks.length ? splitBySpans(block.text, base, marks) : [];
    base += block.text.length + 1; // 块间由 join('\n') 的换行分隔
    return { ...block, pieces: pieces.length ? pieces : [{ text: block.text || ' ' }] };
  });
});
</script>

<style scoped>
@reference '../../../global.css';

.TH-prompt-content-block {
  content-visibility: auto;
  overflow-anchor: none;
}

/* 世界书/预设/ST来源片段：块级 wrapper 限定标签吸顶作用域（同一内容块多标签不会叠顶） */
.TH-wi-piece {
  @apply my-0.25;
}

/*
 * 标签承载行：整行不透明底色（吸顶时干净遮住滚过的正文），文字色与正文一致
 * 仅它参与 sticky（徽章本身是行内元素、不吸顶），向下与正文留 mb-0.25 间距
 */
.TH-wi-badge-row {
  @apply sticky top-0 z-1 mb-0.25 bg-(--SmartThemeBlurTintColor) py-px text-(--SmartThemeBodyColor);
}

/* 世界书/预设/ST 徽章：统一主题强调色外形，置于承载行内 */
.TH-wi-badge {
  @apply inline-block w-fit rounded-sm bg-(--SmartThemeQuoteColor)/30 px-0.5 whitespace-nowrap text-(--SmartThemeQuoteColor);
}
</style>
