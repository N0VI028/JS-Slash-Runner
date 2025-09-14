<template>
  <div class="info-container">
    <div class="info-text flex flex1 flexFlowColumn">
      <div style="font-size: calc(var(--mainFontSize) * 0.8); margin-bottom: 5px; font-weight: 500">
        作者：KAKAA，青空莉想做舞台少女的狗
      </div>
      <div>本扩展免费使用，禁止任何形式的商业用途</div>
      <div>脚本可能存在风险，请确保安全后再运行</div>
    </div>
    <div class="flex-container alignItemsCenter" style="gap: 12px">
      <a
        href="https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/关于酒馆助手/常见问题/安装与更新问题.html"
        target="_blank"
      >
        <i class="fa-solid fa-book"></i>
      </a>
      <a href="https://github.com/N0VI028/JS-Slash-Runner" target="_blank">
        <i class="fa-brands fa-github"></i>
      </a>
      <a
        href="https://discord.com/channels/1291925535324110879/1363482767421341868/1363482767421341868"
        target="_blank"
      >
        <i class="fa-brands fa-discord"></i>
      </a>
    </div>
    <div class="text-decoration">About Us</div>
  </div>
</template>

<style lang="scss" scoped>
.info-container {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  position: relative;
  width: 100%;
  background-color: var(--grey5020a);
  border-radius: 5px;
  padding: 20px;
}

.info-text {
  font-size: calc(var(--mainFontSize) * 0.7);
  opacity: 0.7;
}
</style>
