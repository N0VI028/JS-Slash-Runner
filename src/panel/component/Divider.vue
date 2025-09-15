<template>
  <div class="tavern-helper-Divider--container">
    <div v-if="$slots.default" class="tavern-helper-Divider--text" :class="`tavern-helper-Divider--text-${type}`">
      <slot></slot>
    </div>
    <div class="tavern-helper-Divider--line" :class="`tavern-helper-Divider--line-${type}`"></div>
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

<style lang="scss">
.tavern-helper-Divider-- {
  &container {
    display: flex;
    align-items: center;
    width: 100%;
    margin: 10px 0;
  }

  &text {
    font-size: calc(var(--mainFontSize) * 0.8);
    white-space: nowrap;
    word-spacing: 1.5;
    margin-right: 10px;
  }

  &line {
    flex-grow: 1;
    background-color: var(--grey5050a);

    &-plain {
      height: 1px;
    }

    &-major {
      height: 2px;
    }
  }
}
</style>
