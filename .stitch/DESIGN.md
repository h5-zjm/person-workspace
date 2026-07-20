---
name: 可信蓝金融交易系统
colors:
  background: '#F5F7FA'
  surface: '#F5F7FA'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#EFF3F7'
  surface-container: '#E8EDF3'
  surface-container-high: '#DEE5ED'
  on-background: '#17212B'
  on-surface: '#17212B'
  on-surface-variant: '#667382'
  outline: '#A8B3BF'
  outline-variant: '#D7DEE6'
  primary: '#0B4F8A'
  on-primary: '#FFFFFF'
  primary-container: '#DCEEFF'
  on-primary-container: '#06365F'
  secondary: '#B47A16'
  on-secondary: '#FFFFFF'
  secondary-container: '#FFF0CE'
  on-secondary-container: '#5B3A00'
  tertiary: '#0C7C70'
  on-tertiary: '#FFFFFF'
  tertiary-container: '#D6F3EE'
  on-tertiary-container: '#075048'
  error: '#C43D3D'
  on-error: '#FFFFFF'
  error-container: '#FFE2E2'
  on-error-container: '#7D2020'
  inverse-surface: '#263442'
  inverse-on-surface: '#F3F6F9'
typography:
  display-lg:
    fontFamily: Noto Sans SC
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Noto Sans SC
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Noto Sans SC
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-base:
    fontFamily: Noto Sans SC
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 23px
  number-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  label-sm:
    fontFamily: Noto Sans SC
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.375rem
  DEFAULT: 0.625rem
  md: 0.75rem
  lg: 1rem
  full: 9999px
spacing:
  page-gutter: 1rem
  stack-gap: 0.75rem
  card-padding: 1rem
  section-gap: 1.5rem
---

## 品牌与风格

这是一套面向区域性股权交易中心小程序的移动端设计系统。核心气质是可信、克制、专业和易读，不模仿高频证券交易终端，也不制造收益承诺。界面使用清晰的信息层级、充足留白和稳定的卡片布局，让企业融资信息、市场动态与投资者服务快速可扫读。

## 色彩规则

- 主色“可信蓝”用于品牌识别、主要操作、当前导航和重要信息。
- 金色仅用于重点入口、认证标签与品牌级强调，避免大面积铺色。
- 青绿色用于正常经营、已披露、已认证等正向状态。
- 红色仅用于风险提示、异常和涨幅数字；绿色用于跌幅数字，遵循中国金融市场认知。
- 页面背景使用冷灰，内容卡片使用白色，以轻微层级差代替浓重阴影。

## 字体与数据

- 中文内容使用 Noto Sans SC，保证小程序内的中文可读性。
- 金额、数量、涨跌幅等关键数字使用 Inter，并采用等宽数字特性。
- 标题简洁，避免营销式夸张；关键指标必须配有清晰单位和解释。

## 布局与间距

- Mobile-first，按 390px 宽度设计，左右安全边距 16px。
- 首页使用单列纵向滚动；核心指标可使用两列网格，功能入口使用四列宫格。
- 8px 基础间距体系；区块之间 24px，卡片内部 16px。
- 顶部状态栏和底部 Tab Bar 需要适配小程序安全区。

## 圆角与层级

- 主要卡片使用 16px 圆角，按钮和输入区域使用 10px 至 12px 圆角。
- 状态标签使用胶囊形态。
- 卡片以背景层级和细描边区分，不使用强烈投影。

## 核心组件

### 行情概览卡

展示挂牌企业数、总股本、成交金额等平台级统计。数字优先，单位与同比信息次级呈现。数据不是实时行情时必须标注更新时间。

### 企业项目卡

包含企业简称、行业、融资轮次或挂牌状态、拟融资金额、地区、认证或披露状态。整卡可点击，右侧保留明确的详情指示。

### 功能宫格

四列图标入口，优先放置挂牌展示、融资项目、信息披露、投资者服务。图标保持线性风格，文案不超过六个汉字。

### 公告列表

标题最多两行，展示公告类型与日期。重要公告可使用小型强调标签，但不使用大面积警示色。

### 风险提示

在页面底部提供常驻的投资风险提示入口。涉及交易、认购或咨询的按钮，应在流程中明确展示适当性与风险说明。

### 底部导航

固定五项：首页、市场、项目、服务、我的。当前项使用主色图标和文字，其余项使用中性灰。
