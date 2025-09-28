<template>
  <!--prettier-ignore-attribute-->
  <Popup v-model="visible" @confirm="submit">
    <div class="my-0.5 text-(length:--TH-FontSize-md) font-bold">创建新文件夹</div>
    <div class="flex w-full flex-col justify-center gap-0.5 p-1">
      <div class="flex flex-col items-start">
        <div class="font-bold">文件夹名称:</div>
        <input id="folder-name-input" type="text" class="text_pole w-full" placeholder="请输入文件夹名称" />
      </div>

      <div class="flex flex-col items-start">
        <div class="font-bold">文件夹图标:</div>
        <div class="my-0.5 flex w-full gap-2">
          <div class="flex flex-wrap items-center">
            <span>选择颜色</span>
            <toolcool-color-picker id="folder-color-picker" color="#4a90e2"></toolcool-color-picker>
          </div>
          <div class="flex flex-wrap items-center">
            <span>选择图标</span>
            <i
              class="fa-solid fa-folder ml-[5px] rounded-sm border border-(--SmartThemeBorderColor) p-[5px]"
              title="点击选择图标"
            ></i>
            <input type="hidden" value="fa-folder" />
          </div>
        </div>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>({ required: true });
const submit = () => {
  //TODO: 文件夹保存
  return true;
};
</script>

<style scoped></style>
