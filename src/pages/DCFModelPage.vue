<template>
  <t-layout>
    <t-content style="margin: 0 60px">
      <t-typography-title>
        DCF企业自由现金流估值模型
      </t-typography-title>
      <!-- =========================
           估值模式
      ========================== -->
      <t-space direction="vertical">
        <t-typography-title level="h4">
          <span class="border-left-title"></span>估值模式
        </t-typography-title>
        <t-radio-group v-model="formData.growthMode">
          <t-radio value="single">单阶段增长</t-radio>
          <t-radio value="two-stage">两阶段增长</t-radio>
        </t-radio-group>
      </t-space>
      <!-- =========================
           基础参数
      ========================== -->
      <t-typography-title level="h4">
        <span class="border-left-title"></span>基础参数
      </t-typography-title>
      <t-form
          :data="formData"
          label-align="top"
          class="dcf-form"
      >
        <t-row>
          <!-- 基准 FCF -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item label="基准FCF（亿元）">
              <t-input-number
                  v-model="formData.baseFcf"
                  :min="-999999"
                  :decimal-places="2"
                  theme="normal"
                  suffix="亿元"
              />
            </t-form-item>
          </t-col>

          <!-- 第一阶段增长率 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item
                :label="
                formData.growthMode === 'single'
                  ? '未来增长率'
                  : '第一阶段增长率'"
            >
              <t-input-number
                  v-model="formData.growthRate"
                  :min="-99.99"
                  :max="200"
                  :decimal-places="2"
                  suffix="%"
                  style="width: auto"
              />
            </t-form-item>
          </t-col>

          <!-- 第一阶段年数 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item
                :label="
                formData.growthMode === 'single'
                  ? '预测期'
                  : '第一阶段年数'
              "
            >
              <t-select v-model="formData.forecastYears">
                <t-option
                    v-for="year in yearOptions"
                    :key="year"
                    :value="year"
                    :label="`${year} 年`"
                />
              </t-select>
            </t-form-item>
          </t-col>
        </t-row>
        <!-- 第二阶段 -->
        <template v-if="formData.growthMode === 'two-stage'">
          <t-row justify="end">
            <t-col :xs="12" :sm="6" :md="4">
              <t-form-item label="第二阶段增长率">
                <t-input-number
                    v-model="formData.secondGrowthRate"
                    :min="-99.99"
                    :max="100"
                    :decimal-places="2"
                    suffix="%"
                    style="width: auto"
                />
              </t-form-item>
            </t-col>

            <t-col :xs="12" :sm="6" :md="4">
              <t-form-item label="第二阶段年数">
                <t-select v-model="formData.secondStageYears">
                  <t-option
                      v-for="year in secondStageYearOptions"
                      :key="year"
                      :value="year"
                      :label="`${year} 年`"
                  />
                </t-select>
              </t-form-item>
            </t-col>
          </t-row>
        </template>

        <t-row>
          <!-- 折现率 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item label="折现率r">
              <t-input-number
                  v-model="formData.discountRate"
                  :min="0.03"
                  :max="100"
                  :decimal-places="2"
                  suffix="%"
                  style="width: auto"
              />
            </t-form-item>
          </t-col>

          <!-- 永续增长率 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item label="永续增长率g">
              <t-input-number
                  v-model="formData.terminalGrowthRate"
                  :min="-50"
                  :max="10"
                  :decimal-places="2"
                  suffix="%"
                  style="width: auto"
              />
            </t-form-item>
          </t-col>

          <!-- 总股本 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item label="总股本（亿股）">
              <t-input-number
                  v-model="formData.totalShares"
                  :min="0"
                  :decimal-places="2"
                  suffix="亿股"
                  style="width: auto"
              />
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <!-- 现金 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item label="现金及现金等价物（亿元）">
              <t-input-number
                  v-model="formData.cash"
                  :min="0"
                  :decimal-places="2"
                  suffix="亿元"
                  style="width: auto"
              />
            </t-form-item>
          </t-col>

          <!-- 有息负债 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item label="有息负债（亿元）">
              <t-input-number
                  v-model="formData.debt"
                  :min="0"
                  :decimal-places="2"
                  suffix="亿元"
                  style="width: auto"
              />
            </t-form-item>
          </t-col>

          <!-- 安全边际 -->
          <t-col :xs="12" :sm="6" :md="4">
            <t-form-item label="安全边际">
              <t-input-number
                  v-model="formData.marginOfSafety"
                  :min="0"
                  :max="90"
                  :decimal-places="2"
                  suffix="%"
                  style="width: auto"
              />
            </t-form-item>
          </t-col>
        </t-row>
      </t-form>

      <!-- =========================
           参数检查
      ========================== -->
      <t-alert
          v-if="!isValid"
          theme="error"
          :message="validationMessage"
          class="result-alert"
      />

      <template v-if="isValid">
        <!-- =========================
             核心估值结果
        ========================== -->
        <t-divider/>
        <t-typography-title level="h4">
          <span class="border-left-title"></span>估值结果
        </t-typography-title>
        <t-row :gutter="[16, 16]">
          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="预测期FCF现值"
                :value="formatNumber(pvOfForecast)"
                suffix="亿元"
            />
          </t-col>

          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="终值TV"
                :value="formatNumber(terminalValue)"
                suffix="亿元"
            />
          </t-col>

          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="终值现值"
                :value="formatNumber(pvOfTerminalValue)"
                suffix="亿元"
            />
          </t-col>
          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="企业价值EV"
                :value="formatNumber(enterpriseValue)"
                suffix="亿元"
            />
          </t-col>
        </t-row>
        <t-row :gutter="[16, 16]" class="result-row">
          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="股权价值"
                :value="formatNumber(equityValue)"
                suffix="亿元"
            />
          </t-col>
          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="每股内在价值"
                :value="formatNumber(intrinsicValuePerShare)"
                suffix="元"
            />
          </t-col>
          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="安全边际价格"
                :value="formatNumber(safetyMarginPrice)"
                suffix="元"
            />
          </t-col>
          <t-col :xs="12" :sm="6" :md="3">
            <t-statistic
                title="终值占企业价值"
                :value="formatPercent(terminalValueRatio)"
            />
          </t-col>
        </t-row>

        <!-- =========================
             估值判断
        ========================== -->
        <t-divider/>
        <t-typography-title level="h4">
          <span class="border-left-title"></span>估值判断
        </t-typography-title>

        <t-row :gutter="[16, 16]">
          <t-col :xs="12" :sm="6" :md="4">
            <t-card title="内在价值">
              <template #content>
                <Ticker
                    :value="formatNumber(intrinsicValuePerShare)"
                    :duration="800"
                    easing="linear"
                    direction="ANY"
                    suffix="元"
                    characterLists={[Presets.CURRENCY]}
                    :number-format="formatter"
                    class="metric-value"
                />
              </template>
            </t-card>
          </t-col>

          <t-col :xs="12" :sm="6" :md="4">
            <t-card title="30%安全边际价格">
              <template #content>
                <Ticker
                    :value="formatNumber(intrinsicValuePerShare*0.7)"
                    :duration="800"
                    easing="linear"
                    direction="ANY"
                    suffix="元"
                    characterLists={[Presets.CURRENCY]}
                    :number-format="formatter"
                    class="metric-value"
                    autoScale
                />
              </template>
            </t-card>
          </t-col>

          <t-col :xs="12" :sm="6" :md="4">
            <t-card title="20%安全边际价格">
              <template #content>
                <Ticker
                    :value="formatNumber(intrinsicValuePerShare*0.8)"
                    :duration="800"
                    easing="linear"
                    direction="ANY"
                    suffix="元"
                    characterLists={[Presets.CURRENCY]}
                    :number-format="formatter"
                    class="metric-value"
                />
              </template>
            </t-card>
          </t-col>
        </t-row>

        <!-- =========================
             FCF预测表
        ========================== -->
        <t-divider/>
        <t-typography-title level="h4">
          <span class="border-left-title"></span>未来现金流预测
        </t-typography-title>

        <t-table
            :data="forecastData"
            :columns="columns"
            row-key="year"
            bordered
            stripe
            hover
            size="small"
        />

        <!-- =========================
             关键指标
        ========================== -->
        <t-divider/>

        <t-typography-title level="h4">
          <span class="border-left-title"></span>关键估值指标
        </t-typography-title>

        <t-descriptions
            bordered
            :column="3"
            size="small"
        >
          <t-descriptions-item label="基准 FCF">
            {{ formatNumber(formData.baseFcf) }} 亿元
          </t-descriptions-item>

          <t-descriptions-item label="第一阶段增长率">
            {{ formData.growthRate.toFixed(2) }}%
          </t-descriptions-item>

          <t-descriptions-item label="折现率">
            {{ formData.discountRate.toFixed(2) }}%
          </t-descriptions-item>

          <t-descriptions-item label="永续增长率">
            {{ formData.terminalGrowthRate.toFixed(2) }}%
          </t-descriptions-item>

          <t-descriptions-item label="预测期">
            {{ totalForecastYears }} 年
          </t-descriptions-item>

          <t-descriptions-item label="r-g">
            {{
              (
                  formData.discountRate -
                  formData.terminalGrowthRate
              ).toFixed(2)
            }}%
          </t-descriptions-item>

          <t-descriptions-item label="预测期FCF现值">
            {{ formatNumber(pvOfForecast) }} 亿元
          </t-descriptions-item>

          <t-descriptions-item label="终值现值">
            {{ formatNumber(pvOfTerminalValue) }} 亿元
          </t-descriptions-item>

          <t-descriptions-item label="终值占EV">
            {{ formatPercent(terminalValueRatio) }}
          </t-descriptions-item>
        </t-descriptions>

        <!-- =========================
             计算公式
        ========================== -->
        <t-divider/>
        <t-typography-title level="h4">
          <span class="border-left-title"></span>计算公式
        </t-typography-title>

        <div class="formula-box">
          <div>
            <strong>未来 FCF：</strong>
            FCFₙ = FCF₀ × (1 + g)ⁿ
          </div>

          <div>
            <strong>现金流现值：</strong>
            PVₙ = FCFₙ ÷ (1 + r)ⁿ
          </div>

          <div>
            <strong>终值：</strong>
            TV = FCFₙ × (1 + gₜ) ÷ (r - gₜ)
          </div>

          <div>
            <strong>终值现值：</strong>
            PV(TV) = TV ÷ (1 + r)ⁿ
          </div>

          <div>
            <strong>企业价值：</strong>
            EV = ΣPV(FCF) + PV(TV)
          </div>

          <div>
            <strong>股权价值：</strong>
            Equity Value = EV + Cash - Debt
          </div>

          <div>
            <strong>每股内在价值：</strong>
            IV = Equity Value ÷ Total Shares
          </div>

          <div>
            <strong>安全边际价格：</strong>
            Buy Price = IV × (1 - MOS)
          </div>
        </div>
      </template>
    </t-content>
  </t-layout>
</template>

<script setup lang="ts">
import {computed, reactive, watch} from 'vue'
import type {TableProps} from 'tdesign-vue-next'
import {formatter} from "../common/utils.ts";
import {Ticker} from "@tombcato/smart-ticker/vue";

/**
 * ==========================================
 * DCF 企业自由现金流估值模型
 * ==========================================
 *
 * 单位：
 *
 * FCF / 现金 / 负债 / 企业价值：
 * 亿元
 *
 * 总股本：
 * 亿股
 *
 * 每股价值：
 * 元
 */

type GrowthMode = 'single' | 'two-stage'

interface DcfFormData {
  /**
   * 基准年份（FCF0所属年份，默认上一年）
   */
  baseYear: number
  /**
   * 估值模式
   *
   * single:
   *   单阶段增长
   *
   * two-stage:
   *   两阶段增长
   */
  growthMode: GrowthMode

  /**
   * 基准 FCF
   */
  baseFcf: number

  /**
   * 第一阶段增长率
   */
  growthRate: number
  /**
   * 第一阶段年数
   */
  forecastYears: number
  /**
   * 第二阶段增长率
   */
  secondGrowthRate: number

  /**
   * 第二阶段年数
   */
  secondStageYears: number

  /**
   * 折现率 r
   */
  discountRate: number

  /**
   * 永续增长率 g
   */
  terminalGrowthRate: number

  /**
   * 总股本
   */
  totalShares: number

  /**
   * 现金
   */
  cash: number

  /**
   * 有息负债
   */
  debt: number

  /**
   * 安全边际
   */
  marginOfSafety: number
}

interface ForecastRow {
  year: number
  stage: string
  growthRate: number
  fcf: number
  discountFactor: number
  presentValue: number,
  label: string
}

/**
 * ==========================================
 * 默认参数
 * ==========================================
 *
 * 使用你目前分析福能股份的数据：
 *
 * FCF = 18亿元
 * 增长率 = 6%
 * 折现率 = 10%
 * 永续增长率 = 3%
 * 预测期 = 5年
 * 安全边际 = 30%
 */
const defaultFormData: DcfFormData = {
  baseYear: new Date().getFullYear()-1,
  growthMode: 'single',
  baseFcf: 18,
  growthRate: 6,
  forecastYears: 5,
  secondGrowthRate: 8,
  secondStageYears: 5,
  discountRate: 10,
  terminalGrowthRate: 3,
  totalShares: 0,
  cash: 0,
  debt: 0,
  marginOfSafety: 30,
}

const formData = reactive<DcfFormData>(loadFromLocalStorage())

/**
 * 预测期选项
 */
const yearOptions = Array.from(
    {length: 10},
    (_, index) => index + 1,
)

/**
 * 第二阶段年数
 */
const secondStageYearOptions = Array.from(
    {length: 10},
    (_, index) => index + 1,
)

/**
 * ==========================================
 * 百分比转换
 * ==========================================
 *
 * 例如：
 *
 * 10 -> 0.10
 */
const toRate = (value: number) => {
  return value / 100
}

/**
 * 折现率
 */
const r = computed(() => {
  return toRate(formData.discountRate)
})

/**
 * 永续增长率
 */
const terminalGrowth = computed(() => {
  return toRate(formData.terminalGrowthRate)
})

/**
 * 第一阶段增长率
 */
const firstGrowth = computed(() => {
  return toRate(formData.growthRate)
})

/**
 * 第二阶段增长率
 */
const secondGrowth = computed(() => {
  return toRate(formData.secondGrowthRate)
})

/**
 * ==========================================
 * 总预测期
 * ==========================================
 */
const totalForecastYears = computed(() => {
  if (formData.growthMode === 'single') {
    return formData.forecastYears
  }

  return (
      formData.forecastYears +
      formData.secondStageYears
  )
})

/**
 * ==========================================
 * 参数检查
 * ==========================================
 */
const isValid = computed(() => {
  return (
      Number.isFinite(formData.baseFcf) &&
      formData.baseFcf > 0 &&
      formData.forecastYears > 0 &&
      formData.discountRate > 0 &&
      terminalGrowth.value < r.value
  )
})

/**
 * 参数错误信息
 */
const validationMessage = computed(() => {
  if (
      !Number.isFinite(formData.baseFcf) ||
      formData.baseFcf <= 0
  ) {
    return '基准 FCF 必须大于 0。'
  }

  if (formData.discountRate <= 0) {
    return '折现率 r 必须大于 0。'
  }

  if (
      terminalGrowth.value >= r.value
  ) {
    return '永续增长率 g 必须小于折现率 r，否则终值无法计算。'
  }

  if (
      formData.growthMode === 'two-stage' &&
      formData.secondStageYears <= 0
  ) {
    return '第二阶段年数必须大于 0。'
  }

  return '未知错误'
})

/**
 * ==========================================
 * 生成未来 FCF
 * ==========================================
 */
const forecastData = computed<ForecastRow[]>(() => {
  const result: ForecastRow[] = []

  let previousFcf = formData.baseFcf

  for (
      let year = 1;
      year <= totalForecastYears.value;
      year++
  ) {
    let currentGrowth = firstGrowth.value
    let stage = '第一阶段'

    /**
     * 两阶段模型
     */
    if (
        formData.growthMode === 'two-stage' &&
        year > formData.forecastYears
    ) {
      currentGrowth = secondGrowth.value
      stage = '第二阶段'
    }

    /**
     * FCFn = FCF(n-1) × (1 + growth)
     */
    const fcf = previousFcf *(1 + currentGrowth);

    /**
     * PV = FCF / (1+r)^n
     */
    const discountFactor = Math.pow(1 + r.value, year);
    const presentValue = fcf / discountFactor;

    result.push({
      year,
      stage,
      growthRate: currentGrowth,
      fcf,
      discountFactor,
      presentValue,
      label: (year + formData.baseYear).toString()
    })

    previousFcf = fcf
  }

  return result
})

/**
 * ==========================================
 * 预测期 FCF 现值
 * ==========================================
 */
const pvOfForecast = computed(() => {
  return forecastData.value.reduce(
      (sum, item) =>
          sum + item.presentValue,
      0,
  )
})

/**
 * ==========================================
 * 最后一年 FCF
 * ==========================================
 */
const finalYearFcf = computed(() => {
  const data = forecastData.value

  if (!data.length) {
    return 0
  }

  return data[data.length - 1].fcf
})

/**
 * ==========================================
 * 终值计算
 * ==========================================
 *
 * FCF(n+1)
 *
 * = FCFn × (1 + g)
 *
 * TV
 *
 * = FCF(n+1)/(r-g)
 */
const terminalYearFcf = computed(() => finalYearFcf.value *(1 + terminalGrowth.value));

const terminalValue = computed(() => {
  return (
      terminalYearFcf.value /
      (r.value - terminalGrowth.value)
  )
})

/**
 * ==========================================
 * 终值现值
 * ==========================================
 */
const pvOfTerminalValue = computed(() => {
  return (
      terminalValue.value / Math.pow(1 + r.value, totalForecastYears.value,)
  )
})

/**
 * ==========================================
 * 企业价值 EV
 * ==========================================
 *
 * EV
 * =
 * 预测期 FCF 现值
 * +
 * 终值现值
 */
const enterpriseValue = computed(() => {
  return (
      pvOfForecast.value +
      pvOfTerminalValue.value
  )
})

/**
 * ==========================================
 * 股权价值
 * ==========================================
 *
 * Equity Value
 *
 * = EV
 * + Cash
 * - Debt
 */
const equityValue = computed(() => {
  return (
      enterpriseValue.value +
      formData.cash -
      formData.debt
  )
})

/**
 * ==========================================
 * 每股内在价值
 * ==========================================
 *
 * IV
 *
 * = Equity Value / Total Shares
 */
const intrinsicValuePerShare = computed(() => {
  if (
      !Number.isFinite(
          formData.totalShares,
      ) ||
      formData.totalShares <= 0
  ) {
    return 0
  }

  return (
      equityValue.value /
      formData.totalShares
  )
})

/**
 * ==========================================
 * 安全边际买入价格
 * ==========================================
 *
 * Buy Price
 *
 * = IV × (1-MOS)
 */
const safetyMarginPrice = computed(() => intrinsicValuePerShare.value * (1 -formData.marginOfSafety / 100));

/**
 * ==========================================
 * 终值占企业价值比例
 * ==========================================
 */
const terminalValueRatio = computed(() => {
  if (
      enterpriseValue.value <= 0
  ) {
    return 0
  }

  return (
      pvOfTerminalValue.value / enterpriseValue.value
  )
})

/**
 * ==========================================
 * 表格
 * ==========================================
 */
const columns: TableProps['columns'] = [
  {
    colKey: 'label',
    title: '年份',
    width: 80,
    align: 'center',
  },

  {
    colKey: 'stage',
    title: '阶段',
    width: 100,
    align: 'center',
  },

  {
    colKey: 'growthRate',
    title: '增长率',
    width: 100,
    align: 'right',
    cell: (h, {row}) =>
        formatPercent(row.growthRate),
  },

  {
    colKey: 'fcf',
    title: '预测 FCF（亿元）',
    align: 'right',
    cell: (h, {row}) =>
        formatNumber(row.fcf),
  },

  {
    colKey: 'discountFactor',
    title: '折现因子',
    align: 'right',
    cell: (h, {row}) =>
        row.discountFactor.toFixed(4),
  },

  {
    colKey: 'presentValue',
    title: 'FCF 现值（亿元）',
    align: 'right',
    cell: (h, {row}) =>
        formatNumber(row.presentValue),
  },
]

/**
 * ==========================================
 * 格式化
 * ==========================================
 */
function formatNumber(
    value: number,
) {
  if (!Number.isFinite(value)) {
    return '—'
  }

  return value.toFixed(2)
}

function formatPercent(
    value: number,
) {
  if (!Number.isFinite(value)) {
    return '—'
  }

  return `${(
      value * 100
  ).toFixed(2)}%`
}

// ==================== LocalStorage持久化Key ====================
const STORAGE_KEY = 'dcf'
// 读取本地缓存
function loadFromLocalStorage(): DcfFormData {
  try {
    const str = localStorage.getItem(STORAGE_KEY)
    if (!str) return {...defaultFormData}
    const parsed = JSON.parse(str) as Partial<DcfFormData>
    // 合并：缺字段使用默认值，防止旧缓存字段缺失报错
    return {...defaultFormData, ...parsed}
  } catch (e) {
    // JSON解析异常，回退默认配置
    return {...defaultFormData}
  }
}

// 监听表单全部变化，自动保存到localStorage
watch(
  formData,
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  },
  {deep: true}
)

</script>

<style scoped>


.dcf-form {
  margin-top: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  margin: 20px 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.section-title::before {
  width: 3px;
  height: 16px;
  margin-right: 8px;
  border-radius: 2px;
  background: var(--td-brand-color);
  content: '';
}

.result-alert {
  margin-top: 20px;
}

.result-row {
  margin-top: 16px;
}

.metric-card {
  padding: 16px;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
}

.metric-label {
  margin-bottom: 8px;
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.metric-value {
  font-family: 'Roboto', -apple-system-font, BlinkMacSystemFont, "Microsoft YaHei",
  "Microsoft YaHei UI", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB",
  Arial, sans-serif;
  font-size: 22px;
  font-weight: 600;
}

.formula-box {
  padding: 16px;
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-primary);
  font-size: 14px;
  line-height: 2;
}

.formula-box > div + div {
  margin-top: 4px;
}

.border-left-title {
  /* 左侧蓝线 */
  border-left: 4px solid var(--td-brand-color);
  /* 左边内边距 = 线条与文字的距离 */
  padding-left: 12px;
}
</style>
