<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppTabBar from "@/components/AppTabBar.vue";
import AsyncState from "@/components/AsyncState.vue";
import { getProfile } from "@/services/api";
import type { ProfileData } from "@/types/api";

type MenuItem = { icon: string; label: string; value?: string; tone?: "positive" | "warning" };

const data = ref<ProfileData>();
const loading = ref(true);
const error = ref("");

const commonServices = [
  { icon: "♡", label: "我的关注" },
  { icon: "▯", label: "项目收藏" },
  { icon: "↶", label: "浏览记录" },
  { icon: "▣", label: "路演预约", unread: true }
];

const helpItems: MenuItem[] = [
  { icon: "客", label: "在线客服" },
  { icon: "册", label: "业务办理指南" },
  { icon: "言", label: "意见反馈" },
  { icon: "i", label: "关于平台" },
  { icon: "!", label: "风险揭示" }
];

const accountItems = computed<MenuItem[]>(() => [
  { icon: "证", label: "实名认证", value: data.value?.accountStatuses.realNameStatus === "COMPLETED" ? "已完成" : "未完成", tone: "positive" },
  { icon: "评", label: "适当性评估", value: data.value?.accountStatuses.suitabilityValidUntil ? `有效期至 ${data.value.accountStatuses.suitabilityValidUntil}` : "待评估" },
  { icon: "资", label: "资料管理" },
  { icon: "信", label: "消息通知" }
]);

const companyItems = computed<MenuItem[]>(() => [
  { icon: "企", label: "我的企业" },
  { icon: "挂", label: "挂牌业务申请", value: data.value?.accountStatuses.listingApplicationStatus === "REVIEWING" ? "审核中" : undefined, tone: "warning" },
  { icon: "融", label: "融资申请", value: data.value?.accountStatuses.financingDraftCount ? `草稿 ${data.value.accountStatuses.financingDraftCount}` : undefined },
  { icon: "披", label: "披露材料" }
]);

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    data.value = await getProfile();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "个人信息加载失败";
  } finally {
    loading.value = false;
  }
}

onLoad(loadData);
</script>

<template>
  <view class="profile-header page-content-width">
    <text class="page-title center-title">我的</text>
    <view class="notice-icon"><text>♟</text><text v-if="data?.notificationUnread" class="notice-dot" /></view>
  </view>

  <view class="page-shell profile-content">
    <AsyncState :loading="loading" :error="error" @retry="loadData">
      <template v-if="data">
        <view class="profile-card">
          <view class="avatar">张</view>
          <view class="profile-main">
            <view class="profile-name-row">
              <text class="profile-name">{{ data.user.displayName }}</text>
              <text class="verify-pill">◎ 合格投资者认证 · 已完成</text>
            </view>
            <text class="mobile">{{ data.user.maskedMobile }}</text>
            <text class="profile-link">查看个人资料 ›</text>
          </view>
          <text class="settings">⚙</text>
        </view>

        <view class="card count-card">
          <view><text class="count-value">{{ data.counts.followedCompanyCount }}</text><text>关注企业</text></view>
          <view><text class="count-value">{{ data.counts.favoriteProjectCount }}</text><text>收藏项目</text></view>
          <view><text class="count-value">{{ data.counts.businessApplicationCount }}</text><text>业务申请</text></view>
        </view>

        <view class="card common-card">
          <text class="section-title">常用服务</text>
          <view class="common-grid">
            <view v-for="item in commonServices" :key="item.label" class="common-item">
              <view class="common-icon-wrap"><text class="common-icon">{{ item.icon }}</text><text v-if="item.unread" class="service-dot" /></view>
              <text>{{ item.label }}</text>
            </view>
          </view>
        </view>

        <view class="card menu-section">
          <text class="menu-title">账户与认证</text>
          <view v-for="item in accountItems" :key="item.label" class="menu-row">
            <text class="menu-icon">{{ item.icon }}</text>
            <text class="menu-label">{{ item.label }}</text>
            <text v-if="item.value" class="menu-value" :class="`menu-value-${item.tone || 'normal'}`">{{ item.value }}</text>
            <text class="menu-chevron">›</text>
          </view>
        </view>

        <view class="card menu-section">
          <text class="menu-title">企业服务</text>
          <view v-for="item in companyItems" :key="item.label" class="menu-row">
            <text class="menu-icon">{{ item.icon }}</text>
            <text class="menu-label">{{ item.label }}</text>
            <text v-if="item.value" class="menu-value" :class="`menu-value-${item.tone || 'normal'}`">{{ item.value }}</text>
            <text class="menu-chevron">›</text>
          </view>
        </view>

        <view class="card menu-section">
          <text class="menu-title">帮助与合规</text>
          <view v-for="item in helpItems" :key="item.label" class="menu-row">
            <text class="menu-icon">{{ item.icon }}</text>
            <text class="menu-label">{{ item.label }}</text>
            <text class="menu-chevron">›</text>
          </view>
        </view>

        <view class="security-entry">◈ 账号与安全</view>
      </template>
    </AsyncState>
  </view>
  <AppTabBar active="profile" />
</template>

<style scoped lang="scss">
@import "@/styles/tokens.scss";

.page-content-width { width: 100%; max-width: 480px; margin: 0 auto; padding-right: 16px; padding-left: 16px; }
.profile-header { position: relative; padding-top: calc(env(safe-area-inset-top) + 18px); padding-bottom: 18px; border-bottom: 1px solid $color-border; }
.profile-header .page-title { display: block; font-size: 21px; }
.notice-icon { position: absolute; top: calc(env(safe-area-inset-top) + 17px); right: 18%; color: $color-text-secondary; font-size: 25px; }
.notice-dot { position: absolute; top: 0; right: -2px; width: 8px; height: 8px; border-radius: 50%; background: $color-danger; }
.profile-content { padding-top: 24px; }
.profile-card { display: flex; align-items: center; gap: 14px; padding: 22px 18px; border: 1px solid #ccdbeb; border-radius: 15px; background: $color-primary-soft; box-shadow: $shadow-card; }
.avatar { display: flex; width: 72px; height: 72px; align-items: center; justify-content: center; flex: none; border: 3px solid $color-surface; border-radius: 50%; background: $color-primary; color: $color-surface; font-size: 24px; font-weight: 800; }
.profile-main { min-width: 0; flex: 1; }
.profile-name-row { display: flex; align-items: center; gap: 8px; }
.profile-name { font-size: 20px; font-weight: 800; }
.verify-pill { padding: 7px 11px; border-radius: 20px; background: $color-primary-dark; color: $color-surface; font-size: 11px; line-height: 1.35; }
.mobile { display: block; margin-top: 6px; color: $color-text-secondary; font-family: Inter, monospace; }
.profile-link { display: block; margin-top: 5px; color: $color-primary; font-size: 13px; font-weight: 700; }
.settings { flex: none; color: $color-text-secondary; font-size: 24px; }
.count-card { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 24px; padding: 18px 0; }
.count-card > view { display: flex; align-items: center; flex-direction: column; gap: 6px; border-right: 1px solid $color-border; color: $color-text-secondary; }
.count-card > view:last-child { border-right: 0; }
.count-value { color: $color-text; font-family: Inter, monospace; font-size: 28px; font-weight: 800; }
.common-card { margin-top: 24px; padding: 20px 17px; }
.common-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 18px; }
.common-item { display: flex; align-items: center; flex-direction: column; gap: 9px; font-size: 12px; text-align: center; }
.common-icon-wrap { position: relative; }
.common-icon { display: flex; width: 46px; height: 46px; align-items: center; justify-content: center; border-radius: 50%; background: $color-primary-soft; color: $color-primary; font-size: 23px; }
.service-dot { position: absolute; top: 1px; right: 0; width: 7px; height: 7px; border-radius: 50%; background: $color-danger; }
.menu-section { overflow: hidden; margin-top: 24px; }
.menu-title { display: block; padding: 18px; font-size: 18px; font-weight: 800; }
.menu-row { display: flex; min-height: 54px; align-items: center; gap: 12px; padding: 0 16px; border-top: 1px solid $color-border; }
.menu-icon { display: flex; width: 26px; height: 26px; align-items: center; justify-content: center; border: 1px solid $color-text-secondary; border-radius: 5px; color: $color-text-secondary; font-size: 12px; font-weight: 700; }
.menu-label { flex: 1; font-size: 16px; }
.menu-value { color: $color-text-secondary; font-size: 13px; }
.menu-value-positive { color: $color-positive; }
.menu-value-warning { color: $color-warning; }
.menu-chevron { color: $color-border; font-size: 27px; }
.security-entry { padding: 24px 0 8px; color: $color-text-secondary; text-align: center; }
</style>
