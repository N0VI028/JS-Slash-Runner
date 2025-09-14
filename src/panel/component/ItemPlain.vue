<template>
  <div class="tavern-helper-item">
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
</style>
