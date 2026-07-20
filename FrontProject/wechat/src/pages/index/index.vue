<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppTabBar from "@/components/AppTabBar.vue";
import AsyncState from "@/components/AsyncState.vue";
import { getHome } from "@/services/api";
import type { HomeData, NewsItem } from "@/types/api";

const data = ref<HomeData>();
const loading = ref(true);
const error = ref("");
const newsTab = ref<"announcements" | "disclosures" | "policies">("announcements");

const newsTabs = [
  { key: "announcements" as const, label: "中心公告" },
  { key: "disclosures" as const, label: "信息披露" },
  { key: "policies" as const, label: "政策资讯" }
];

const services = [
  { icon: "挂", label: "挂牌展示", route: "/pages/market/market" },
  { icon: "融", label: "融资项目", route: "/pages/projects/projects" },
  { icon: "披", label: "信息披露" },
  { icon: "投", label: "投资者服务" },
  { icon: "法", label: "政策法规" },
  { icon: "指", label: "交易指南" },
  { icon: "演", label: "路演中心" },
  { icon: "企", label: "企业服务" }
];

const visibleNews = computed<NewsItem[]>(() => data.value?.news[newsTab.value] || []);

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    data.value = await getHome();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "首页数据加载失败";
  } finally {
    loading.value = false;
  }
}

function navigate(route?: string) {
  if (route) uni.reLaunch({ url: route });
}

onLoad(loadData);
</script>

<template>
  <view class="page-shell home-page">
    <view class="brand-row">
      <text class="brand-mark">▰</text>
      <text class="brand-name">股权交易中心</text>
    </view>

    <view class="home-search-row">
      <view class="search-box home-search">
        <text class="search-icon">⌕</text>
        <input class="search-input" placeholder="搜索企业、项目或公告" placeholder-class="search-placeholder" />
      </view>
      <view class="notice-icon"><text>♟</text><text class="notice-dot" /></view>
    </view>

    <AsyncState :loading="loading" :error="error" @retry="loadData">
      <template v-if="data">
        <view class="hero-card">
          <text class="hero-title">连接资本与成长</text>
          <text class="hero-subtitle">服务实体经济 · 助力企业规范发展</text>
          <view class="hero-action">了解挂牌服务</view>
          <view class="hero-dots"><text class="hero-dot-active" /><text /><text /></view>
        </view>

        <view class="card overview-card">
          <view class="section-head overview-head">
            <text class="section-title">市场概览</text>
            <text class="subtle">数据更新 {{ data.marketOverview.updatedAt }}</text>
          </view>
          <view class="overview-grid">
            <view class="metric-cell">
              <view><text class="metric-value">{{ data.marketOverview.listedCompanyCount }}</text><text> 家</text></view>
              <text class="metric-label">挂牌企业</text>
            </view>
            <view class="metric-cell metric-bordered">
              <view><text class="metric-value">{{ data.marketOverview.monthlyNewCount }}</text><text> 家</text></view>
              <text class="metric-label">本月新增</text>
            </view>
            <view class="metric-cell">
              <view><text class="metric-value">{{ data.marketOverview.totalFinancingAmount }}</text><text> {{ data.marketOverview.totalFinancingUnit }}</text></view>
              <text class="metric-label">累计融资</text>
            </view>
          </view>
        </view>

        <view class="card service-grid">
          <view v-for="service in services" :key="service.label" class="service-item" @click="navigate(service.route)">
            <view class="service-icon">{{ service.icon }}</view>
            <text>{{ service.label }}</text>
          </view>
        </view>

        <view class="project-section">
          <view class="section-head">
            <text class="section-title">精选融资项目</text>
            <text class="section-link" @click="navigate('/pages/projects/projects')">查看全部 ›</text>
          </view>
          <view v-for="project in data.featuredProjects" :key="project.id" class="card featured-card">
            <view class="featured-title-row">
              <text class="featured-name">{{ project.name }}</text>
              <text class="chevron">›</text>
            </view>
            <view class="badge-row">
              <text class="badge">{{ project.industry }}</text>
              <text v-for="badge in project.badges" :key="badge" class="badge">{{ badge }}</text>
            </view>
            <view class="divider" />
            <view class="amount-row">
              <view>
                <text class="amount-label">拟融资金额</text>
                <view><text class="amount">{{ project.financingAmount }}</text><text class="amount-unit"> {{ project.financingUnit }}</text></view>
              </view>
              <text class="region">⌖ {{ project.region }}</text>
            </view>
          </view>
        </view>

        <view class="card news-card">
          <view class="news-tabs">
            <text
              v-for="tab in newsTabs"
              :key="tab.key"
              class="news-tab"
              :class="{ 'news-tab-active': newsTab === tab.key }"
              @click="newsTab = tab.key"
            >{{ tab.label }}</text>
          </view>
          <view v-if="visibleNews.length">
            <view v-for="item in visibleNews" :key="item.id" class="news-item">
              <text class="news-title">[{{ item.type }}] {{ item.title }}</text>
              <text class="news-date">{{ item.publishedAt }}</text>
            </view>
          </view>
          <view v-else class="news-empty">暂无相关资讯</view>
        </view>

        <view class="risk-note">
          <text class="risk-title">理性投资，审慎决策</text>
          <text>股权投资具有风险，请充分了解项目并完成投资者适当性评估</text>
          <text class="risk-link">查看风险揭示</text>
        </view>
      </template>
    </AsyncState>
  </view>
  <AppTabBar active="home" />
</template>

<style scoped lang="scss">
@import "@/styles/tokens.scss";

.home-page { padding-top: calc(env(safe-area-inset-top) + 24px); }
.brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: $color-primary-dark; }
.brand-mark { font-size: 24px; transform: rotate(90deg); }
.brand-name { font-size: 20px; font-weight: 800; }
.home-search-row { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
.home-search { flex: 1; }
.notice-icon { position: relative; width: 30px; color: $color-text-secondary; font-size: 25px; text-align: center; }
.notice-dot { position: absolute; top: 1px; right: 1px; width: 8px; height: 8px; border-radius: 50%; background: $color-danger; }
.hero-card { position: relative; overflow: hidden; min-height: 196px; padding: 32px 26px; border-radius: 18px; background: $color-primary-dark; color: $color-surface; }
.hero-card::after { position: absolute; right: -55px; bottom: -70px; width: 190px; height: 190px; border: 26px solid rgba(255,255,255,.08); border-radius: 50%; content: ""; }
.hero-title { display: block; font-size: 29px; font-weight: 800; }
.hero-subtitle { display: block; margin-top: 10px; color: rgba(255,255,255,.82); font-size: 16px; }
.hero-action { display: inline-flex; margin-top: 22px; padding: 10px 18px; border-radius: 11px; background: $color-surface; color: $color-primary; font-weight: 700; }
.hero-dots { position: absolute; bottom: 14px; left: 50%; display: flex; gap: 5px; transform: translateX(-50%); }
.hero-dots text { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.45); }
.hero-dots .hero-dot-active { width: 18px; border-radius: 5px; background: $color-surface; }
.overview-card { margin-top: 24px; padding: 18px; }
.overview-head { margin-bottom: 18px; }
.overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
.metric-cell { display: flex; align-items: center; flex-direction: column; gap: 4px; text-align: center; }
.metric-bordered { border-right: 1px solid $color-border; border-left: 1px solid $color-border; }
.metric-label, .amount-label { color: $color-text-secondary; font-size: 13px; }
.service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px 8px; margin-top: 24px; padding: 20px 10px; }
.service-item { display: flex; align-items: center; flex-direction: column; gap: 8px; font-size: 13px; font-weight: 600; text-align: center; }
.service-icon { display: flex; width: 46px; height: 46px; align-items: center; justify-content: center; border-radius: 50%; background: $color-primary-soft; color: $color-primary; font-size: 17px; font-weight: 800; }
.project-section { margin-top: 28px; }
.featured-card { margin-bottom: 14px; padding: 17px; }
.featured-title-row, .amount-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.featured-name { font-size: 18px; font-weight: 800; }
.chevron { color: $color-text-secondary; font-size: 30px; line-height: 1; }
.badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 16px; }
.amount-row { align-items: flex-end; padding-top: 15px; }
.amount-label { display: block; margin-bottom: 5px; }
.amount-unit { color: $color-text-secondary; }
.region { padding-bottom: 3px; color: $color-text-secondary; }
.news-card { margin-top: 28px; padding: 16px; }
.news-tabs { display: flex; gap: 22px; border-bottom: 1px solid $color-border; }
.news-tab { position: relative; padding-bottom: 12px; color: $color-text-secondary; font-size: 15px; }
.news-tab-active { color: $color-primary; font-weight: 800; }
.news-tab-active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 3px; background: $color-primary; content: ""; }
.news-item { display: flex; flex-direction: column; gap: 8px; padding: 16px 0; border-bottom: 1px solid $color-border-soft; }
.news-item:last-child { border-bottom: 0; }
.news-title { font-size: 15px; line-height: 1.5; }
.news-date { color: $color-text-secondary; font-size: 13px; }
.news-empty { padding: 28px; color: $color-text-muted; text-align: center; }
.risk-title { display: block; margin-bottom: 6px; font-weight: 700; }
</style>
