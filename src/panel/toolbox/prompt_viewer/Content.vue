<template>
  <!-- 空 content 不渲染，避免仅工具调用时出现空白行 -->
  <template v-if="props.content">
    <template v-for="(block, index) in decorated_blocks" :key="index">
      <!-- 可折叠间隙块未展开：展开按钮 -->
      <div v-if="block.expandable && !is_expanded[index]" @click="is_expanded[index] = true">
        <!-- prettier-ignore-attribute -->
        <div
          class="
            my-0.5 flex cursor-pointer items-center justify-center gap-0.5 rounded-sm border
            border-(--SmartThemeBorderColor) px-1 py-0.5 th-text-sm text-(--SmartThemeQuoteColor)
          "
        >
          {{ t`展开` }} {{ (block.text.match(/\n/g)?.length ?? 0) + 1 }} {{ t`行隐藏内容` }}
          <i class="fa-solid fa-chevron-down" />
        </div>
      </div>
      <!-- 展开内容 -->
      <div
        v-else
        class="TH-prompt-content-block wrap-break-word whitespace-pre-wrap"
        :style="{ containIntrinsicSize: `auto ${block.intrinsicSizeLh}lh` }"
      >
        <template v-for="(piece, piece_index) in block.pieces" :key="piece_index">
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
            <Highlighter v-if="block.matched && searchInput !== null" :query="searchInput">
              {{ piece.text }}
            </Highlighter>
            <template v-else>
              {{ piece.text }}
            </template>
          </div>
          <Highlighter v-else-if="block.matched && searchInput !== null" :query="searchInput">
            {{ piece.text }}
          </Highlighter>
          <template v-else>
            {{ piece.text }}
          </template>
        </template>
        <!-- 可折叠块展开后的收起按钮 -->
        <!-- prettier-ignore-attribute -->
        <div
          v-if="block.expandable"
          class="
            my-0.5 flex cursor-pointer items-center justify-center gap-0.5 rounded-sm border
            border-(--SmartThemeBorderColor) px-1 py-0.5 th-text-sm text-(--SmartThemeQuoteColor)
          "
          @click="is_expanded[index] = false"
        >
          {{ t`收起内容` }}<i class="fa-solid fa-chevron-up"></i>
        </div>
      </div>
    </template>
  </template>
</template>

<script setup lang="ts">
import { splitBySpans, type WiMark } from '@/panel/toolbox/prompt_viewer/wi_tracer/marks';
import { chunkBy } from '@/util/algorithm';

type DisplayBlock = {
  text: string; 
  base: number; 
  matched: boolean; 
  intrinsicSizeLh: number; 
  expandable: boolean; 
};

const props = defineProps<{
  content: string;
  searchInput: RegExp | null;
  matchedOnly: boolean;
  marks?: WiMark[];
}>();

const CONTENT_BLOCK_LINE_COUNT = 500;
const NEARBY_LINE_COUNT = 2;
const is_expanded = ref<boolean[]>([]);
const blocks = shallowRef<DisplayBlock[]>([]);

watch(
  () => [props.content, props.searchInput, props.matchedOnly] as const,
  ([content, search_input, matched_only]) => {
    // 空 content 不生成占位 block，避免 tool_calls 前出现空白行
    if (!content) {
      is_expanded.value = [];
      blocks.value = [];
      return;
    }

    if (search_input !== null && matched_only) {
      const line_starts = _.concat(0, [...content.matchAll(/\n/g)].map(match => match.index + 1));
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
        is_expanded.value = [true];
        blocks.value = [
          {
            text: content,
            base: 0,
            matched: true,
            expandable: false,
            intrinsicSizeLh: Math.max(content.split('\n').length + 2, 4),
          },
        ];
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

      const next_blocks: DisplayBlock[] = [];
      const next_expanded: boolean[] = [];

      const addBlock = (start_line: number, end_line: number, expandable: boolean) => {
        const block_lines = lines.slice(start_line, end_line + 1);
        next_blocks.push({
          text: block_lines.join('\n'),
          base: line_starts[start_line],
          matched: true,
          expandable,
          intrinsicSizeLh: Math.max(block_lines.length + 2, 4),
        });
        next_expanded.push(!expandable);
      };

      let previous_end = -1;
      for (const { start, end } of matched_ranges) {
        if (start > previous_end + 1) {
          addBlock(previous_end + 1, start - 1, true);
        }
        addBlock(start, end, false);
        previous_end = end;
      }
      if (previous_end < line_count - 1) {
        addBlock(previous_end + 1, line_count - 1, true);
      }

      is_expanded.value = next_expanded;
      blocks.value = next_blocks;
      return;
    }

    const regex = search_input === null ? null : new RegExp(search_input.source, search_input.flags);
    is_expanded.value = [];
    let current_base = 0;
    blocks.value = _.chunk(content.split('\n'), CONTENT_BLOCK_LINE_COUNT).map(lines => {
      const text = lines.join('\n');
      const base = current_base;
      current_base += text.length + 1;
      return {
        text,
        base,
        matched: regex?.test(text) ?? false,
        intrinsicSizeLh: Math.max(lines.length + 2, 4),
        expandable: false,
      };
    });
  },
  { immediate: true },
);

/**
 * 按世界书/预设标记切分各内容块为片段序列，两种模式均叠加标注
 */
const decorated_blocks = computed(() => {
  const marks = props.marks ?? [];
  return blocks.value.map(block => {
    const pieces = marks.length ? splitBySpans(block.text, block.base, marks) : [];
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

.TH-wi-piece {
  @apply my-0.25;
}


.TH-wi-badge-row {
  @apply sticky top-0 z-1 mb-0.25 bg-(--SmartThemeBlurTintColor) py-px text-(--SmartThemeBodyColor);
}

.TH-wi-badge {
  @apply inline-block w-fit max-w-full overflow-hidden rounded-sm bg-(--SmartThemeQuoteColor)/30 px-0.5 text-ellipsis whitespace-nowrap text-(--SmartThemeQuoteColor);
}
</style>
