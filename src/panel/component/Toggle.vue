<template>
  <div class="tavern-helper-toggle">
    <input type="checkbox" :id="props.id" class="tavern-helper-toggle-input" v-model="model" />
    <label :for="props.id" class="tavern-helper-toggle-label">
      <span class="tavern-helper-toggle-handle"></span>
    </label>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<boolean>();
const props = defineProps<{ id: string }>();
</script>

<style lang="scss" scoped>
.tavern-helper-toggle {
  position: relative;
  display: inline-block;
  width: 30px;
  height: 16px;
}

.tavern-helper-toggle-input {
  opacity: 0;
}

.tavern-helper-toggle-label {
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

.tavern-helper-toggle-handle {
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

.tavern-helper-toggle-input:checked + .tavern-helper-toggle-label {
  background-color: var(--SmartThemeQuoteColor);
}

.tavern-helper-toggle-input:checked + .tavern-helper-toggle-label .tavern-helper-toggle-handle {
  transform: translateX(14px);
}

.tavern-helper-toggle-input:focus + .tavern-helper-toggle-label {
  box-shadow: 0 0 1px var(--SmartThemeQuoteColor);
}
</style>
