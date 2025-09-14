<template>
  <div
    class="tavern-helper-item"
    :class="[`tavern-helper-${type}-item`, { 'tavern-helper-item-collapsible collapsible flexFlowColumn': has_detail }]"
  >
    <template v-if="!has_detail">
      <div class="flex flexFlowColumn">
        <div class="tavern-helper-item-title">
          <slot name="title" />
        </div>
        <div class="tavern-helper-item-description">
          <slot name="description" />
        </div>
      </div>
      <slot name="content" />
    </template>

    <template v-else>
      <div
        class="flex-container alignItemsCenter width100p"
        :class="{
          'tavern-helper-item-collapsible-with-content spaceBetween': has_content,
        }"
      >
        <div class="flex flexFlowColumn">
          <div class="tavern-helper-item-title">
            <slot name="title" />
          </div>
          <div class="tavern-helper-item-description">
            <slot name="description" />
          </div>
        </div>
        <slot name="content" />
      </div>
      <div class="collapsible-content flex-container width100p">
        <slot name="detail" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

withDefaults(
  defineProps<{
    type?: 'plain' | 'box';
  }>(),
  { type: 'plain' },
);

const slots = useSlots();
const has_content = computed(() => !!slots.content);
const has_detail = computed(() => !!slots.detail);
</script>

<style lang="scss" scoped>
.tavern-helper-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.tavern-helper-box-item {
  padding: 1em;
  border-radius: 10px;
  border: 1px solid var(--grey5050a);
}

.tavern-helper-item-collapsible {
  align-items: flex-start;
}

.tavern-helper-item-collapsible-with-content {
  flex: 0.9;
  flex-wrap: nowrap;
}

.tavern-helper-item-title {
  font-size: var(--mainFontSize);
  font-weight: 600;
}

.tavern-helper-item-description {
  margin-top: 2px;
  font-size: calc(var(--mainFontSize) * 0.8);
  opacity: 0.7;
}
</style>
