<template>
  <div class="tavern-helper-Toggle--container">
    <input :id="props.id" v-model="model" type="checkbox" class="tavern-helper-Toggle--input" />
    <label :for="props.id" class="tavern-helper-Toggle--label">
      <span class="tavern-helper-Toggle--handle"></span>
    </label>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<boolean>();
const props = defineProps<{ id: string }>();
</script>

<style lang="scss">
.tavern-helper-Toggle-- {
  &container {
    position: relative;
    display: inline-block;
    width: 30px;
    height: 16px;
  }

  &input {
    opacity: 0;

    &:checked + .tavern-helper-Toggle--label {
      background-color: var(--SmartThemeQuoteColor);

      .tavern-helper-Toggle--handle {
        transform: translateX(14px);
      }
    }

    &:focus + .tavern-helper-Toggle--label {
      box-shadow: 0 0 1px var(--SmartThemeQuoteColor);
    }
  }

  &label {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
  }

  &handle {
    position: absolute;
    content: '';
    height: 10px;
    width: 10px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
}
</style>
