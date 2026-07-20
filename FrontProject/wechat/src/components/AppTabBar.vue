<script setup lang="ts">
type TabKey = "home" | "market" | "projects" | "service" | "profile";

const props = defineProps<{ active: TabKey }>();

const tabs: Array<{ key: TabKey; label: string; icon: string; path?: string }> = [
  { key: "home", label: "首页", icon: "⌂", path: "/pages/index/index" },
  { key: "market", label: "市场", icon: "▥", path: "/pages/market/market" },
  { key: "projects", label: "项目", icon: "▢", path: "/pages/projects/projects" },
  { key: "service", label: "服务", icon: "▦" },
  { key: "profile", label: "我的", icon: "♙", path: "/pages/profile/profile" }
];

function navigate(path?: string, key?: TabKey) {
  if (!path || key === props.active) return;
  uni.reLaunch({ url: path });
}
</script>

<template>
  <view class="tab-bar">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{ 'tab-item-active': tab.key === active }"
      @click="navigate(tab.path, tab.key)"
    >
      <text class="tab-icon">{{ tab.icon }}</text>
      <text class="tab-label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@import "@/styles/tokens.scss";

.tab-bar {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 10px max(10px, calc((100vw - 480px) / 2)) calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid $color-border;
  background: $color-surface;
}

.tab-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
  color: $color-text-secondary;
}

.tab-item-active {
  color: $color-primary;
}

.tab-icon {
  height: 24px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 24px;
  font-weight: 800;
  line-height: 22px;
}

.tab-label {
  font-size: 12px;
  font-weight: 700;
}
</style>
