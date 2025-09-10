<template>
  <div>
    <h3>{{ title }}</h3>
    <div class="flex-container flexFlowColumn width100p padding10 justifyLeft">
      <label :for="`${prefix}-target-global`">
        <input type="radio" :name="`${prefix}-target`" :id="`${prefix}-target-global`" value="global" checked />
        <span> {{ globalLabel }} </span>
      </label>
      <label :for="`${prefix}-target-character`">
        <input type="radio" :name="`${prefix}-target`" :id="`${prefix}-target-character`" value="character" />
        <span> {{ characterLabel }} </span>
      </label>
      <label v-if="showPresetOption" :for="`${prefix}-target-preset`">
        <input type="radio" :name="`${prefix}-target`" :id="`${prefix}-target-preset`" value="preset" />
        <span> {{ presetLabel }} </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  prefix: string;
  globalLabel: string;
  characterLabel: string;
  presetLabel?: string;
  showPresetOption?: boolean;
  currentPresetName?: string;
}

withDefaults(defineProps<Props>(), {
  title: '',
  prefix: '',
  globalLabel: '',
  characterLabel: '',
  presetLabel: '',
  showPresetOption: false,
  currentPresetName: undefined,
});

</script>

