<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppTabBar from "@/components/AppTabBar.vue";
import AsyncState from "@/components/AsyncState.vue";
import { getProjects } from "@/services/api";
import type { ProjectsData, ProjectStatus } from "@/types/api";

type PickerEvent = { detail: { value: string } };

const data = ref<ProjectsData>();
const loading = ref(true);
const error = ref("");
const keyword = ref("");
const status = ref<ProjectStatus>("ALL");
const industry = ref("");
const region = ref("");
const financingScale = ref("");

const industries = ["行业", "先进制造", "数字经济", "生物医药", "企业服务", "绿色能源"];
const regions = ["地区", "杭州", "宁波", "绍兴", "嘉兴"];
const scales = [
  { label: "融资规模", value: "" },
  { label: "2000万以下", value: "BELOW_2000" },
  { label: "2000-5000万", value: "2000_TO_5000" },
  { label: "5000万以上", value: "ABOVE_5000" }
];

const statusTabs = computed(() => [
  { key: "ALL" as const, label: "全部", count: data.value?.counts.all ?? 0 },
  { key: "FUNDRAISING" as const, label: "募集中", count: data.value?.counts.fundraising ?? 0 },
  { key: "ROADSHOW" as const, label: "路演中", count: data.value?.counts.roadshow ?? 0 },
  { key: "ENDED" as const, label: "已结束", count: data.value?.counts.ended ?? 0 }
]);

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    data.value = await getProjects({
      keyword: keyword.value,
      status: status.value,
      industry: industry.value,
      region: region.value,
      financingScale: financingScale.value,
      page: 1,
      size: 20
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "项目数据加载失败";
  } finally {
    loading.value = false;
  }
}

function selectStatus(value: ProjectStatus) {
  status.value = value;
  loadData();
}

function selectIndustry(event: PickerEvent) {
  const value = industries[Number(event.detail.value)];
  industry.value = value === "行业" ? "" : value;
  loadData();
}

function selectRegion(event: PickerEvent) {
  const value = regions[Number(event.detail.value)];
  region.value = value === "地区" ? "" : value;
  loadData();
}

function selectScale(event: PickerEvent) {
  financingScale.value = scales[Number(event.detail.value)].value;
  loadData();
}

function scaleLabel() {
  return scales.find(item => item.value === financingScale.value)?.label || "融资规模";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = { FUNDRAISING: "募集中", ROADSHOW: "路演中", ENDED: "已结束" };
  return labels[value] || value;
}

function formatRoadshow(value: string) {
  const match = value.match(/-(\d{2})-(\d{2})/);
  return match ? `${match[1]}月${match[2]}日` : value;
}

onLoad(loadData);
</script>

<template>
  <view class="projects-page">
    <view class="projects-header page-shell-header">
      <text class="page-title center-title">融资项目</text>
      <view class="mini-capsule"><text>•••</text><text class="capsule-line" /><text>×</text></view>
    </view>

    <view class="search-area page-content-width">
      <view class="search-box project-search">
        <text class="search-icon">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索项目或企业"
          placeholder-class="search-placeholder"
          confirm-type="search"
          @confirm="loadData"
        />
      </view>
      <view class="notice-icon"><text>♟</text><text class="notice-dot" /></view>
    </view>

    <view class="status-tabs page-content-width">
      <view
        v-for="tab in statusTabs"
        :key="tab.key"
        class="status-tab"
        :class="{ 'status-tab-active': status === tab.key }"
        @click="selectStatus(tab.key)"
      >{{ tab.label }} {{ tab.count }}</view>
    </view>

    <view class="page-shell projects-content">
      <AsyncState :loading="loading" :error="error" :empty="Boolean(data && !data.items.length)" empty-text="未找到符合条件的融资项目" @retry="loadData">
        <template v-if="data">
          <view class="campaign-card">
            <text class="campaign-kicker">本周精选</text>
            <text class="campaign-title">{{ data.featuredCampaign.title }}</text>
            <text class="campaign-subtitle">{{ data.featuredCampaign.projectCount }} 个项目正在展示</text>
            <view class="campaign-action">查看专场 →</view>
            <view class="campaign-circle campaign-circle-one" />
            <view class="campaign-circle campaign-circle-two" />
          </view>

          <view class="project-filter-row">
            <picker :range="industries" @change="selectIndustry"><view>{{ industry || "行业" }}⌄</view></picker>
            <picker :range="regions" @change="selectRegion"><view>{{ region || "地区" }}⌄</view></picker>
            <picker :range="scales" range-key="label" @change="selectScale"><view>{{ scaleLabel() }}⌄</view></picker>
            <view>最新发布 ⇅</view>
            <text>共 {{ data.total }} 个项目</text>
          </view>

          <view v-for="project in data.items" :key="project.id" class="card project-card">
            <view class="project-title-row">
              <text class="project-name">{{ project.title }}</text>
              <text class="status-badge" :class="`status-${project.status.toLowerCase()}`">{{ statusLabel(project.status) }}</text>
            </view>
            <view class="meta-tags">
              <text>▣ {{ project.industry }}</text>
              <text>⌖ {{ project.region }}</text>
            </view>
            <text class="finance-label">融资金额</text>
            <view class="finance-row">
              <view><text class="amount">{{ project.financingAmount }}</text><text class="amount-unit"> {{ project.financingUnit }}</text></view>
              <view class="project-tags"><text v-for="tag in project.tags" :key="tag" class="badge">{{ tag }}</text></view>
            </view>
            <view class="project-bottom">
              <view v-if="project.intentCount !== null" class="project-stat">♙ 意向登记 {{ project.intentCount }}</view>
              <view v-else-if="project.nextRoadshowAt" class="project-stat roadshow-stat">▣ 下一场路演 {{ formatRoadshow(project.nextRoadshowAt) }}</view>
              <view class="detail-action">查看详情</view>
            </view>
          </view>

          <view class="risk-note">
            <text>ⓘ 项目展示不构成投资建议，参与前请完成适当性评估</text>
            <text class="risk-link">查看风险揭示</text>
          </view>
        </template>
      </AsyncState>
    </view>
  </view>
  <AppTabBar active="projects" />
</template>

<style scoped lang="scss">
@import "@/styles/tokens.scss";

.projects-page { min-height: 100vh; }
.page-shell-header, .page-content-width { width: 100%; max-width: 480px; margin-right: auto; margin-left: auto; padding-right: 16px; padding-left: 16px; }
.projects-header { position: relative; padding-top: calc(env(safe-area-inset-top) + 18px); padding-bottom: 18px; border-bottom: 1px solid $color-border; }
.projects-header .page-title { display: block; font-size: 21px; }
.mini-capsule { position: absolute; top: calc(env(safe-area-inset-top) + 10px); right: 16px; display: flex; height: 38px; align-items: center; gap: 11px; padding: 0 14px; border: 1px solid $color-border; border-radius: 20px; background: $color-surface; font-size: 19px; }
.capsule-line { width: 1px; height: 20px; background: $color-border; }
.search-area { display: flex; align-items: center; gap: 14px; padding-top: 12px; padding-bottom: 12px; border-bottom: 1px solid $color-border; }
.project-search { flex: 1; }
.notice-icon { position: relative; color: $color-text-secondary; font-size: 25px; }
.notice-dot { position: absolute; top: 1px; right: -2px; width: 7px; height: 7px; border-radius: 50%; background: $color-danger; }
.status-tabs { display: grid; grid-template-columns: repeat(4, 1fr); padding-top: 14px; border-bottom: 1px solid $color-border; }
.status-tab { position: relative; padding-bottom: 14px; color: $color-text-secondary; font-size: 15px; text-align: center; }
.status-tab-active { color: $color-primary; font-weight: 800; }
.status-tab-active::after { position: absolute; right: 24%; bottom: -1px; left: 24%; height: 4px; border-radius: 4px 4px 0 0; background: $color-primary; content: ""; }
.projects-content { padding-top: 24px; }
.campaign-card { position: relative; overflow: hidden; min-height: 194px; padding: 24px; border-radius: 18px; background: $color-primary; color: $color-surface; }
.campaign-kicker { display: inline-flex; padding: 6px 10px; border-radius: 5px; background: rgba(255,255,255,.14); font-weight: 700; }
.campaign-title { position: relative; z-index: 1; display: block; margin-top: 17px; font-size: 23px; font-weight: 800; }
.campaign-subtitle { position: relative; z-index: 1; display: block; margin-top: 7px; color: rgba(255,255,255,.82); font-size: 16px; }
.campaign-action { position: relative; z-index: 1; display: inline-flex; margin-top: 22px; padding: 10px 16px; border-radius: 10px; background: $color-surface; color: $color-primary; font-weight: 700; }
.campaign-circle { position: absolute; border: 28px solid rgba(255,255,255,.09); border-radius: 50%; }
.campaign-circle-one { top: -70px; right: -60px; width: 160px; height: 160px; }
.campaign-circle-two { right: 40px; bottom: -76px; width: 120px; height: 120px; }
.project-filter-row { display: grid; grid-template-columns: .8fr .8fr 1.2fr 1.2fr; align-items: center; gap: 7px; margin: 23px 0 14px; font-weight: 600; }
.project-filter-row picker, .project-filter-row > view { min-width: 0; font-size: 13px; text-align: center; }
.project-filter-row > text { grid-column: 1 / -1; color: $color-text-secondary; font-size: 13px; text-align: right; }
.project-card { margin-bottom: 14px; padding: 18px; }
.project-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.project-name { flex: 1; font-size: 18px; font-weight: 800; line-height: 1.4; }
.status-badge { flex: none; padding: 5px 10px; border: 1px solid; border-radius: 6px; font-size: 12px; }
.status-fundraising { border-color: $color-warning; background: $color-warning-soft; color: #946000; }
.status-roadshow { border-color: #5ed3bd; background: $color-positive-soft; color: #087363; }
.status-ended { border-color: $color-border; background: $color-background; color: $color-text-secondary; }
.meta-tags { display: flex; gap: 8px; margin: 13px 0 18px; }
.meta-tags text { padding: 6px 10px; border: 1px solid $color-border; border-radius: 6px; color: $color-text-secondary; }
.finance-label { display: block; color: $color-text-secondary; margin-bottom: 5px; }
.finance-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.amount-unit { color: $color-danger; font-weight: 700; }
.project-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.project-bottom { display: flex; min-height: 62px; align-items: center; justify-content: space-between; gap: 10px; margin-top: 18px; padding-top: 15px; border-top: 1px solid $color-border; }
.project-stat { color: $color-primary; }
.roadshow-stat { color: $color-text; }
.detail-action { padding: 9px 17px; border: 1px solid $color-primary; border-radius: 9px; color: $color-primary; font-weight: 700; }
</style>
