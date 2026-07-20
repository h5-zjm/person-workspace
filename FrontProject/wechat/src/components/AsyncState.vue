<script setup lang="ts">
defineProps<{
  loading: boolean;
  error?: string;
  empty?: boolean;
  emptyText?: string;
}>();

defineEmits<{ (event: "retry"): void }>();
</script>

<template>
  <view v-if="loading" class="state-box">
    <view class="loading-ring" />
    <text>数据加载中...</text>
  </view>
  <view v-else-if="error" class="state-box">
    <text class="state-symbol">!</text>
    <text>{{ error }}</text>
    <view class="retry-action" @click="$emit('retry')">重新加载</view>
  </view>
  <view v-else-if="empty" class="state-box">
    <text class="state-symbol">—</text>
    <text>{{ emptyText || "暂无数据" }}</text>
  </view>
  <slot v-else />
</template>

<style scoped lang="scss">
@import "@/styles/tokens.scss";

.state-box {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: $color-text-secondary;
}

.loading-ring {
  width: 28px;
  height: 28px;
  border: 3px solid $color-border;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.state-symbol {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $color-primary-soft;
  color: $color-primary;
  font-size: 20px;
  font-weight: 800;
}

.retry-action {
  padding: 8px 18px;
  border-radius: 8px;
  background: $color-primary;
  color: $color-surface;
  font-weight: 700;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
