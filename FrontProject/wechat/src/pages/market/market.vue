<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppTabBar from "@/components/AppTabBar.vue";
import AsyncState from "@/components/AsyncState.vue";
import { getMarket } from "@/services/api";
import type { MarketData } from "@/types/api";

type PickerEvent = { detail: { value: string } };

const data = ref<MarketData>();
const loading = ref(true);
const error = ref("");
const keyword = ref("");
const activeIndustry = ref("");
const region = ref("");
const companyLevel = ref("");

const industries = ["全部", "先进制造", "数字经济", "生物医药", "消费服务", "绿色能源"];
const regions = ["全部地区", "杭州", "宁波", "绍兴", "嘉兴"];
const levels = ["企业层级", "创新层", "培育层", "展示层"];

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    data.value = await getMarket({
      keyword: keyword.value,
      industry: activeIndustry.value,
      region: region.value,
      companyLevel: companyLevel.value,
      page: 1,
      size: 20
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "市场数据加载失败";
  } finally {
    loading.value = false;
  }
}

function selectIndustry(value: string) {
  activeIndustry.value = value === "全部" ? "" : value;
  loadData();
}

function selectRegion(event: PickerEvent) {
  const value = regions[Number(event.detail.value)];
  region.value = value === "全部地区" ? "" : value;
  loadData();
}

function selectLevel(event: PickerEvent) {
  const value = levels[Number(event.detail.value)];
  companyLevel.value = value === "企业层级" ? "" : value;
  loadData();
}

onLoad(loadData);
</script>

<template>
  <view class="page-shell market-page">
    <text class="page-title">市场</text>

    <view class="search-box market-search">
      <text class="search-icon">⌕</text>
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索企业简称、挂牌代码"
        placeholder-class="search-placeholder"
        confirm-type="search"
        @confirm="loadData"
      />
      <text class="filter-mark">≡</text>
    </view>

    <AsyncState :loading="loading" :error="error" :empty="Boolean(data && !data.items.length)" empty-text="未找到符合条件的挂牌企业" @retry="loadData">
      <template v-if="data">
        <view class="card market-overview">
          <view class="section-head">
            <text class="section-title overview-title">市场概览</text>
            <text class="subtle">数据更新于 {{ data.overview.updatedAt }}</text>
          </view>
          <view class="overview-metrics">
            <view><text>挂牌企业</text><view><text class="metric-value">{{ data.overview.listedCompanyCount }}</text> 家</view></view>
            <view><text>本周新增</text><view><text class="metric-value">{{ data.overview.weeklyNewCount }}</text> 家</view></view>
            <view><text>今日披露</text><view><text class="metric-value">{{ data.overview.todayDisclosureCount }}</text> 条</view></view>
          </view>
          <view class="report-link">查看市场报告 ›</view>
        </view>

        <scroll-view class="industry-scroll" scroll-x :show-scrollbar="false">
          <view class="industry-row">
            <view
              v-for="item in industries"
              :key="item"
              class="filter-chip"
              :class="{ 'filter-chip-active': (item === '全部' && !activeIndustry) || item === activeIndustry }"
              @click="selectIndustry(item)"
            >{{ item }}</view>
          </view>
        </scroll-view>

        <view class="filter-row">
          <picker :range="regions" @change="selectRegion">
            <view>{{ region || "全部地区" }}⌄</view>
          </picker>
          <picker :range="levels" @change="selectLevel">
            <view>{{ companyLevel || "企业层级" }}⌄</view>
          </picker>
          <view>最新挂牌 ⇅</view>
          <text class="result-count">共 {{ data.total }} 家</text>
        </view>

        <view v-for="company in data.items" :key="company.id" class="card company-card">
          <view class="company-head">
            <view class="company-avatar">{{ company.shortName.slice(0, 1) }}</view>
            <view class="company-main">
              <view class="company-name-row">
                <text class="company-name">{{ company.shortName }}</text>
                <text class="badge">{{ company.listingStatus }}</text>
              </view>
              <text class="listing-code">{{ company.listingCode }}</text>
            </view>
            <text class="chevron">›</text>
          </view>
          <view class="tag-row">
            <text>{{ company.industry }}</text>
            <text>{{ company.region }}</text>
            <text class="level-tag">{{ company.companyLevel }}</text>
          </view>
          <view class="disclosure-row">
            <text class="subtle">最新披露</text>
            <text>{{ company.latestDisclosureDate }}</text>
          </view>
        </view>

        <view class="risk-note market-note">
          <text>挂牌信息以企业最新披露文件为准</text>
          <text class="risk-link">查看信息披露 ↗</text>
        </view>
      </template>
    </AsyncState>
  </view>
  <AppTabBar active="market" />
</template>

<style scoped lang="scss">
@import "@/styles/tokens.scss";

.market-page { padding-top: calc(env(safe-area-inset-top) + 52px); }
.market-search { margin-top: 38px; box-shadow: $shadow-card; }
.filter-mark { padding-left: 15px; border-left: 1px solid $color-border; color: $color-text; font-size: 26px; transform: rotate(180deg); }
.market-overview { margin-top: 26px; padding: 20px; }
.overview-title { color: $color-primary-dark; font-size: 21px; }
.overview-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.overview-metrics > view { display: flex; min-height: 90px; align-items: center; justify-content: center; flex-direction: column; gap: 7px; border: 1px solid #c8dcf3; border-radius: 10px; background: $color-primary-soft; color: $color-text-secondary; text-align: center; }
.report-link { margin-top: 18px; padding-top: 15px; border-top: 1px solid $color-border; color: $color-primary; font-weight: 700; text-align: right; }
.industry-scroll { width: calc(100% + 16px); margin-top: 26px; }
.industry-row { display: flex; gap: 10px; padding-right: 16px; }
.filter-row { display: grid; grid-template-columns: 1fr 1fr 1.15fr auto; align-items: center; gap: 7px; margin: 24px 0 15px; font-weight: 700; }
.filter-row picker, .filter-row > view { min-width: 0; font-size: 13px; }
.result-count { color: $color-text-secondary; font-weight: 500; white-space: nowrap; }
.company-card { margin-bottom: 14px; padding: 18px; }
.company-head { display: flex; align-items: center; gap: 14px; }
.company-avatar { display: flex; width: 52px; height: 52px; align-items: center; justify-content: center; flex: none; border: 1px solid #c8dcf3; border-radius: 10px; background: $color-primary-soft; color: $color-primary-dark; font-size: 21px; font-weight: 800; }
.company-main { min-width: 0; flex: 1; }
.company-name-row { display: flex; align-items: center; gap: 8px; }
.company-name { font-size: 18px; font-weight: 800; }
.listing-code { display: block; margin-top: 2px; color: #414b5a; font-family: Inter, monospace; font-size: 20px; font-weight: 700; }
.chevron { color: $color-text-secondary; font-size: 30px; }
.tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.tag-row text { padding: 5px 10px; border: 1px solid $color-border; border-radius: 16px; color: $color-text-secondary; }
.tag-row .level-tag { background: $color-primary-soft; color: $color-primary; }
.disclosure-row { display: flex; justify-content: space-between; padding-top: 14px; border-top: 1px solid $color-border; }
.market-note { padding-bottom: 18px; }
</style>
