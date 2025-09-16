<template>
  <div
    class="tavern-helper-Item--container"
    :class="[
      `
        tavern-helper-Item--container-${type}
      `,
      { 'tavern-helper-Item--container-collapsible collapsible flexFlowColumn': has_detail },
    ]"
  >
    <template v-if="!has_detail">
      <div class="flexFlowColumn flex">
        <div class="tavern-helper-Item--title">
          <slot name="title" />
        </div>
        <div class="tavern-helper-Item--description">
          <slot name="description" />
        </div>
      </div>
      <slot name="content" />
    </template>

    <template v-else>
      <div
        class="flex-container alignItemsCenter width100p"
        :class="{
          'tavern-helper-Item--head-collapsible_with_content spaceBetween': has_content,
        }"
      >
        <div class="flexFlowColumn flex">
          <div class="tavern-helper-Item--title">
            <slot name="title" />
          </div>
          <div class="tavern-helper-Item--description">
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

<style lang="scss">
.tavern-helper-Item-- {
  &container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

    &-box {
      padding: 1em;
      border-radius: 10px;
      border: 1px solid var(--grey5050a);
    }

    &-collapsible {
      align-items: flex-start;
    }
  }

  &head-collapsible_with_content {
    flex: 0.9;
    flex-wrap: nowrap;
  }

  &title {
    font-size: var(--mainFontSize);
    font-weight: 600;
  }

  &description {
    margin-top: 2px;
    font-size: calc(var(--mainFontSize) * 0.8);
    opacity: 0.7;
  }
}
</style>
