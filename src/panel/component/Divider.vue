<template>
  <div class="tavern-helper-divider" :class="`tavern-helper-${type}-divider`">
    <div v-if="$slots.default" class="tavern-helper-divider-text" :class="`tavern-helper-${type}-divider-text`">
      <slot></slot>
    </div>
    <div class="tavern-helper-divider-line" :class="`tavern-helper-${type}-divider-line`"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'plain' | 'major';
  }>(),
  { type: 'plain' },
);
</script>

<style lang="scss" scoped>
.tavern-helper-divider {
  display: flex;
  align-items: center;
  width: 100%;
}
.tavern-helper-major-divider {
  margin: 10px 0;
}

.tavern-helper-divider-text {
  font-size: calc(var(--mainFontSize) * 0.8);
  white-space: nowrap;
  word-spacing: 1.5;
  margin-right: 10px;
}

.tavern-helper-divider-line {
  flex-grow: 1;
  background-color: var(--grey5050a);
}
.tavern-helper-plain-divider-line {
  height: 1px;
}
.tavern-helper-major-divider-line {
  height: 2px;
}
</style>
