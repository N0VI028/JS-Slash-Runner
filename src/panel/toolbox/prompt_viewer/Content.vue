<template>
  <Highlighter :query="searchInput">
    <template v-if="props.searchInput !== null && props.matchedOnly">
      <template v-for="(item, index) in parsed_content" :key="index">
        <div v-if="is_expanded[index]">
          <div class="wrap-break-word whitespace-pre-wrap">
            {{ item }}
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
    <template v-else>{{ content }}</template>
  </Highlighter>
</template>

<script setup lang="ts">
import { chunkBy } from '@/util/algorithm';

const props = defineProps<{
  content: string;
  searchInput: RegExp | null;
  matchedOnly: boolean;
}>();

/** 除了匹配到文本的那一行外, 上下要额外显示几行 */
const NEARBY_LINE_COUNT = 2;

const is_expanded = ref<boolean[]>([]);
const is_collapsible = ref<boolean[]>([]);
const parsed_content = shallowRef<string[]>([]);
watch(
  () => [props.searchInput, props.matchedOnly] as const,
  ([search_input, matched_only]) => {
    if (search_input === null || !matched_only) {
      return;
    }

    const line_starts = _.concat(0, [...props.content.matchAll(/\n/g)].map(match => match.index) ?? []);
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

    const matches = [...props.content.matchAll(new RegExp(search_input, search_input.flags + 'g'))];
    if (matches.length === 0) {
      is_expanded.value = [];
      is_collapsible.value = [];
      parsed_content.value = [props.content];
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

    const lines = props.content.split('\n');

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

    parsed_content.value = result.map(item => item.content);
    is_expanded.value = result.map(item => item.is_expanded);
    is_collapsible.value = result.map(item => item.collapsible);
  },
  { immediate: true },
);
</script>
