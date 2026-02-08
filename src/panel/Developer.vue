<template>
  <div class="flex flex-col gap-0.5">
    <MacroLike />
    <Listener />
    <Reference />
  </div>
</template>

<script setup lang="ts">
import Listener from '@/panel/developer/Listener.vue';
import MacroLike from '@/panel/developer/MacroLike.vue';
import Reference from '@/panel/developer/Reference.vue';
</script>
