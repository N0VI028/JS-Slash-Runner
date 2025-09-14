<template>
  <div class="tavern-helper-item tavern-helper-item-box">
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
</template>

<style lang="scss" scoped>
@import '@/panel/component/item.scss';

.tavern-helper-item-box {
  padding: 1em;
  border-radius: 10px;
  border: 1px solid var(--grey5050a);
}
</style>
