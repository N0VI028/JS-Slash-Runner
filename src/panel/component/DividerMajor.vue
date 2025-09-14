<template>
  <div class="tavern-helper-divider-major-container">
    <div class="tavern-helper-divier-major-text">
      <slot></slot>
    </div>
    <div class="tavern-helper-divider-major-line"></div>
  </div>
</template>

<style lang="scss" scoped>
.tavern-helper-divider-major-container {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 10px 0;
}

.tavern-helper-divier-major-text {
  font-size: calc(var(--mainFontSize) * 0.8);
  white-space: nowrap;
  word-spacing: 1.5;
  margin-right: 10px;
}

.tavern-helper-divider-major-line {
  flex-grow: 1;
  height: 2px;
  background-color: var(--grey5050a);
}
</style>
