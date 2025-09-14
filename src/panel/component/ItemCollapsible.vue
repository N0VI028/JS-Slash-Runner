<template>
  <div class="tavern-helper-item tavern-helper-item-collapsible collapsible flexFlowColumn">
    <div class="flex-container alignItemsCenter width100p">
      <div class="flex flexFlowColumn">
        <div class="tavern-helper-item-title">
          <slot name="title" />
        </div>
        <div class="tavern-helper-item-description">
          <slot name="description" />
        </div>
      </div>
    </div>
    <div class="collapsible-content">
      <slot name="content" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/panel/component/item.scss';

.tavern-helper-item-collapsible {
  padding: 1em;
  border-radius: 10px;
  border: 1px solid var(--grey5050a);
  align-items: flex-start;
}
</style>
