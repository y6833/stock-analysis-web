/**
 * Tushare API 类型定义
 * 基于 Tushare Pro API 官方文档
 */

// 通用类型定义
export type TushareDate = string // YYYYMMDD 格式
export type TushareCode = string // 股票代码，如 000001.SZ
export type TushareExchange = 'SSE' | 'SZSE' | 'BSE' // 交易所
export type TushareMarket = '主板' | '中小板' | '创业板' | '科创板' | 'CDR' | '北交所'
export type TushareListStatus = 'L' | 'D' | 'P' // 上市状态
export type TushareHsStatus = 'N' | 'H' | 'S' // 沪深港通状态

// API 错误代码枚举
export enum TushareErrorCode {
  SUCCESS = 0,
  PERMISSION_DENIED = 40001,
  INVALID_TOKEN = 40002,
  RATE_LIMIT_EXCEEDED = 40203,
  DAILY_LIMIT_EXCEEDED = 40101,
  INVALID_PARAMS = 40301,
  SERVER_ERROR = 50001
}

// 数据质量等级
export enum DataQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// 数据来源类型
export enum DataSourceType {
  REALTIME = 'realtime',
  DELAYED = 'delayed',
  HISTORICAL = 'historical',
  CACHE = 'cache'
}

// Tushare API 基础响应格式
export interface TushareResponse<T = any> {
  request_id: string
  code: TushareErrorCode
  msg: string
  data: {
    fields: string[]
    items: T[][]
  }
}

// 扩展的 Tushare 响应格式（包含元数据）
export interface TushareExtendedResponse<T = any> extends TushareResponse<T> {
  data_source?: string
  data_source_message?: string
  is_real_time?: boolean
  cache?: boolean
  quality?: DataQuality
  source_type?: DataSourceType
  timestamp?: number
}

// 分页响应
export interface TusharePaginatedResponse<T = any> extends TushareResponse<T> {
  has_more: boolean
  total_count?: number
  page_size?: number
  current_page?: number
}

// Tushare API 请求基础参数
export interface TushareRequestParams {
  api_name: string
  token: string
  params: Record<string, any>
  fields?: string
}

// 股票基础信息 (stock_basic)
export interface StockBasicItem {
  ts_code: TushareCode // 股票代码
  symbol: string // 股票代码（不含后缀）
  name: string // 股票名称
  area: string // 地域
  industry: string // 所属行业
  fullname: string // 股票全称
  enname: string // 英文全称
  cnspell: string // 拼音缩写
  market: TushareMarket // 市场类型
  exchange: TushareExchange // 交易所代码
  curr_type: string // 交易货币
  list_status: TushareListStatus // 上市状态
  list_date: TushareDate // 上市日期
  delist_date: TushareDate // 退市日期
  is_hs: TushareHsStatus // 是否沪深港通标的
}

// 日线行情 (daily)
export interface DailyItem {
  ts_code: TushareCode // 股票代码
  trade_date: TushareDate // 交易日期
  open: number // 开盘价
  high: number // 最高价
  low: number // 最低价
  close: number // 收盘价
  pre_close: number // 昨收价
  change: number // 涨跌额
  pct_chg: number // 涨跌幅 (%)
  vol: number // 成交量 (手)
  amount: number // 成交额 (千元)
}

// 每日指标 (daily_basic)
export interface DailyBasicItem {
  ts_code: string // 股票代码
  trade_date: string // 交易日期
  close: number // 当日收盘价
  turnover_rate: number // 换手率（%）
  turnover_rate_f: number // 换手率（自由流通股）
  volume_ratio: number // 量比
  pe: number // 市盈率（总市值/净利润， 亏损的PE为空）
  pe_ttm: number // 市盈率（TTM，亏损的PE为空）
  pb: number // 市净率（总市值/净资产）
  ps: number // 市销率
  ps_ttm: number // 市销率（TTM）
  dv_ratio: number // 股息率 （%）
  dv_ttm: number // 股息率（TTM）（%）
  total_share: number // 总股本 （万股）
  float_share: number // 流通股本 （万股）
  free_share: number // 自由流通股本 （万股）
  total_mv: number // 总市值 （万元）
  circ_mv: number // 流通市值（万元）
}

// 复权行情 (pro_bar)
export interface ProBarItem {
  ts_code: string // 股票代码
  trade_date: string // 交易日期
  open: number // 开盘价
  high: number // 最高价
  low: number // 最低价
  close: number // 收盘价
  pre_close: number // 昨收价
  change: number // 涨跌额
  pct_chg: number // 涨跌幅
  vol: number // 成交量
  amount: number // 成交额
}

// 利润表 (income)
export interface IncomeItem {
  ts_code: string // 股票代码
  ann_date: string // 公告日期
  f_ann_date: string // 实际公告日期
  end_date: string // 报告期
  report_type: string // 报告类型
  comp_type: string // 公司类型
  basic_eps: number // 基本每股收益
  diluted_eps: number // 稀释每股收益
  total_revenue: number // 营业总收入
  revenue: number // 营业收入
  int_income: number // 利息收入
  prem_earned: number // 已赚保费
  comm_income: number // 手续费及佣金收入
  n_commis_income: number // 手续费及佣金净收入
  n_oth_income: number // 其他经营净收益
  n_oth_b_income: number // 加:其他业务净收益
  prem_income: number // 保险业务收入
  out_prem: number // 减:分出保费
  une_prem_reser: number // 提取未到期责任准备金
  reins_income: number // 其中:分保费收入
  n_sec_tb_income: number // 代理买卖证券业务净收入
  n_sec_uw_income: number // 证券承销业务净收入
  n_asset_mg_income: number // 受托客户资产管理业务净收入
  oth_b_income: number // 其他业务收入
  fv_value_chg_gain: number // 加:公允价值变动净收益
  invest_income: number // 加:投资净收益
  ass_invest_income: number // 其中:对联营企业和合营企业的投资收益
  forex_gain: number // 加:汇兑净收益
  total_cogs: number // 营业总成本
  oper_cost: number // 减:营业成本
  int_exp: number // 减:利息支出
  comm_exp: number // 减:手续费及佣金支出
  biz_tax_surchg: number // 减:营业税金及附加
  sell_exp: number // 减:销售费用
  admin_exp: number // 减:管理费用
  fin_exp: number // 减:财务费用
  assets_impair_loss: number // 减:资产减值损失
  prem_refund: number // 退保金
  compens_payout: number // 赔付总支出
  reser_insur_liab: number // 提取保险责任准备金
  div_payt: number // 保户红利支出
  reins_exp: number // 分保费用
  oper_exp: number // 营业支出
  compens_payout_refu: number // 减:摊回赔付支出
  insur_reser_refu: number // 减:摊回保险责任准备金
  reins_cost_refund: number // 减:摊回分保费用
  other_bus_cost: number // 其他业务成本
  operate_profit: number // 营业利润
  non_oper_income: number // 加:营业外收入
  non_oper_exp: number // 减:营业外支出
  nca_disploss: number // 其中:减:非流动资产处置净损失
  total_profit: number // 利润总额
  income_tax: number // 减:所得税费用
  n_income: number // 净利润(含少数股东损益)
  n_income_attr_p: number // 净利润(不含少数股东损益)
  minority_gain: number // 少数股东损益
  oth_compr_income: number // 其他综合收益
  t_compr_income: number // 综合收益总额
  compr_inc_attr_p: number // 归属于母公司(或股东)的综合收益总额
  compr_inc_attr_m_s: number // 归属于少数股东的综合收益总额
  ebit: number // 息税前利润
  ebitda: number // 息税折旧摊销前利润
  insurance_exp: number // 保险业务支出
  undist_profit: number // 年初未分配利润
  distable_profit: number // 可分配利润
  rd_exp: number // 研发费用
  fin_exp_int_exp: number // 财务费用:利息费用
  fin_exp_int_inc: number // 财务费用:利息收入
  transfer_surplus_rese: number // 盈余公积转入
  transfer_housing_imprest: number // 住房周转金转入
  transfer_oth: number // 其他转入
  adj_lossgain: number // 调整以前年度损益
  withdra_legal_surplus: number // 提取法定盈余公积
  withdra_legal_pubfund: number // 提取法定公益金
  withdra_biz_devfund: number // 提取企业发展基金
  withdra_rese_fund: number // 提取储备基金
  withdra_oth_ersu: number // 提取任意盈余公积金
  workers_welfare: number // 职工奖金福利
  distr_profit_shrhder: number // 可供股东分配的利润
  prfshare_payable_dvd: number // 应付优先股股利
  comshare_payable_dvd: number // 应付普通股股利
  capit_comstock_div: number // 转作股本的普通股股利
  continued_net_profit: number // 持续经营净利润
  end_net_profit: number // 终止经营净利润
}

// 资产负债表 (balancesheet)
export interface BalanceSheetItem {
  ts_code: string // 股票代码
  ann_date: string // 公告日期
  f_ann_date: string // 实际公告日期
  end_date: string // 报告期
  report_type: string // 报告类型
  comp_type: string // 公司类型
  total_share: number // 期末总股本
  cap_rese: number // 资本公积金
  undistr_porfit: number // 未分配利润
  surplus_rese: number // 盈余公积金
  special_rese: number // 专项储备
  money_cap: number // 货币资金
  trad_asset: number // 交易性金融资产
  notes_receiv: number // 应收票据
  accounts_receiv: number // 应收账款
  oth_receiv: number // 其他应收款
  prepayment: number // 预付款项
  div_receiv: number // 应收股利
  int_receiv: number // 应收利息
  inventories: number // 存货
  amor_exp: number // 长期待摊费用
  nca_within_1y: number // 一年内到期的非流动资产
  sett_rsrv: number // 结算备付金
  loanto_oth_bank_fi: number // 拆出资金
  premium_receiv: number // 应收保费
  reinsur_receiv: number // 应收分保账款
  reinsur_res_receiv: number // 应收分保合同准备金
  pur_resale_fa: number // 买入返售金融资产
  oth_cur_assets: number // 其他流动资产
  total_cur_assets: number // 流动资产合计
  fa_avail_for_sale: number // 可供出售金融资产
  htm_invest: number // 持有至到期投资
  lt_eqt_invest: number // 长期股权投资
  invest_real_estate: number // 投资性房地产
  time_deposits: number // 定期存款
  oth_assets: number // 其他资产
  lt_rec: number // 长期应收款
  fix_assets: number // 固定资产
  cip: number // 在建工程
  const_materials: number // 工程物资
  fixed_assets_disp: number // 固定资产清理
  produc_bio_assets: number // 生产性生物资产
  oil_and_gas_assets: number // 油气资产
  intan_assets: number // 无形资产
  r_and_d: number // 研发支出
  goodwill: number // 商誉
  lt_amor_exp: number // 长期待摊费用
  defer_tax_assets: number // 递延所得税资产
  decr_in_disbur: number // 发放贷款及垫款
  oth_nca: number // 其他非流动资产
  total_nca: number // 非流动资产合计
  cash_reser_cb: number // 现金及存放中央银行款项
  depos_in_oth_bfi: number // 存放同业和其它金融机构款项
  prec_metals: number // 贵金属
  deriv_assets: number // 衍生金融资产
  rr_reins_une_prem: number // 应收分保未到期责任准备金
  rr_reins_outstd_cla: number // 应收分保未决赔款准备金
  rr_reins_lins_liab: number // 应收分保寿险责任准备金
  rr_reins_lthins_liab: number // 应收分保长期健康险责任准备金
  refund_depos: number // 存出保证金
  ph_pledge_loans: number // 保户质押贷款
  refund_cap_depos: number // 存出资本保证金
  indep_acct_assets: number // 独立账户资产
  client_depos: number // 其中：客户资金存款
  client_prov: number // 其中：客户备付金
  transac_seat_fee: number // 其中:交易席位费
  invest_as_receiv: number // 应收款项类投资
  total_assets: number // 资产总计
  lt_borr: number // 长期借款
  st_borr: number // 短期借款
  cb_borr: number // 向中央银行借款
  depos_ib_deposits: number // 吸收存款及同业存放
  loan_oth_bank: number // 拆入资金
  trading_fl: number // 交易性金融负债
  notes_payable: number // 应付票据
  acct_payable: number // 应付账款
  adv_receipts: number // 预收款项
  sold_for_repur_fa: number // 卖出回购金融资产款
  comm_payable: number // 应付手续费及佣金
  payroll_payable: number // 应付职工薪酬
  taxes_payable: number // 应交税费
  int_payable: number // 应付利息
  div_payable: number // 应付股利
  oth_payable: number // 其他应付款
  acc_exp: number // 预提费用
  deferred_inc: number // 递延收益
  st_bonds_payable: number // 应付短期债券
  payable_to_reinsurer: number // 应付分保账款
  rsrv_insur_cont: number // 保险合同准备金
  acting_trading_sec: number // 代理买卖证券款
  acting_uw_sec: number // 代理承销证券款
  non_cur_liab_due_1y: number // 一年内到期的非流动负债
  oth_cur_liab: number // 其他流动负债
  total_cur_liab: number // 流动负债合计
  bond_payable: number // 应付债券
  lt_payable: number // 长期应付款
  specific_payables: number // 专项应付款
  estimated_liab: number // 预计负债
  defer_tax_liab: number // 递延所得税负债
  defer_inc_non_cur_liab: number // 递延收益-非流动负债
  oth_ncl: number // 其他非流动负债
  total_ncl: number // 非流动负债合计
  depos_oth_bfi: number // 同业和其它金融机构存放款项
  deriv_liab: number // 衍生金融负债
  depos: number // 吸收存款
  agency_bus_liab: number // 代理业务负债
  oth_liab: number // 其他负债
  prem_receiv_adva: number // 预收保费
  depos_received: number // 存入保证金
  ph_invest: number // 保户储金及投资款
  reser_une_prem: number // 未到期责任准备金
  reser_outstd_claims: number // 未决赔款准备金
  reser_lins_liab: number // 寿险责任准备金
  reser_lthins_liab: number // 长期健康险责任准备金
  indept_acc_liab: number // 独立账户负债
  pledge_borr: number // 其中:质押借款
  indem_payable: number // 应付赔付款
  policy_div_payable: number // 应付保单红利
  total_liab: number // 负债合计
  treasury_share: number // 减:库存股
  ordin_risk_reser: number // 一般风险准备
  forex_differ: number // 外币报表折算差额
  invest_loss_unconf: number // 未确认的投资损失
  minority_int: number // 少数股东权益
  total_hldr_eqy_exc_min_int: number // 股东权益合计(不含少数股东权益)
  total_hldr_eqy_inc_min_int: number // 股东权益合计(含少数股东权益)
  total_liab_hldr_eqy: number // 负债及股东权益总计
  lt_payroll_payable: number // 长期应付职工薪酬
  oth_comp_income: number // 其他综合收益
  oth_eqt_tools: number // 其他权益工具
  oth_eqt_tools_p_shr: number // 其他权益工具(优先股)
  lending_funds: number // 融出资金
  acc_receivable: number // 应收款项
  st_fin_payable: number // 应付短期融资款
  payables: number // 应付款项
  hfs_assets: number // 持有待售资产
  hfs_sales: number // 持有待售负债
  cost_fin_assets: number // 以摊余成本计量的金融资产
  fair_value_fin_assets: number // 以公允价值计量且其变动计入其他综合收益的金融资产
  cip_total: number // 在建工程(合计)
  oth_pay_total: number // 其他应付款(合计)
  long_pay_total: number // 长期应付款(合计)
  debt_invest: number // 债权投资
  oth_debt_invest: number // 其他债权投资
  oth_eq_invest: number // 其他权益工具投资
  oth_illiq_fin_assets: number // 其他非流动金融资产
  oth_eq_ppbond: number // 其他权益工具:永续债
  receiv_financing: number // 应收款项融资
  use_right_assets: number // 使用权资产
  lease_liab: number // 租赁负债
  contract_assets: number // 合同资产
  contract_liab: number // 合同负债
  accounts_receiv_bill: number // 应收票据及应收账款
  accounts_pay: number // 应付票据及应付账款
  oth_rcv_total: number // 其他应收款(合计)
  fix_assets_total: number // 固定资产(合计)
}

// 现金流量表 (cashflow)
export interface CashFlowItem {
  ts_code: string // 股票代码
  ann_date: string // 公告日期
  f_ann_date: string // 实际公告日期
  end_date: string // 报告期
  report_type: string // 报告类型
  comp_type: string // 公司类型
  net_profit: number // 净利润
  finan_exp: number // 财务费用
  c_fr_sale_sg: number // 销售商品、提供劳务收到的现金
  recp_tax_rends: number // 收到的税费返还
  n_depos_incr_fi: number // 客户存款和同业存放款项净增加额
  n_incr_loans_cb: number // 向中央银行借款净增加额
  n_inc_borr_oth_fi: number // 向其他金融机构拆入资金净增加额
  prem_fr_orig_contr: number // 收到原保险合同保费取得的现金
  n_incr_insured_dep: number // 保户储金净增加额
  n_reinsur_prem: number // 收到再保业务现金净额
  n_incr_disp_tfa: number // 处置交易性金融资产净增加额
  ifc_cash_incr: number // 收取利息和手续费净增加额
  n_incr_disp_faas: number // 处置可供出售金融资产净增加额
  n_incr_loans_oth_bank: number // 拆入资金净增加额
  n_cap_incr_repur: number // 回购业务资金净增加额
  c_fr_oth_operate_a: number // 收到其他与经营活动有关的现金
  c_inf_fr_operate_a: number // 经营活动现金流入小计
  c_paid_goods_s: number // 购买商品、接受劳务支付的现金
  c_paid_to_for_empl: number // 支付给职工以及为职工支付的现金
  c_paid_for_taxes: number // 支付的各项税费
  n_incr_clt_loan_adv: number // 客户贷款及垫款净增加额
  n_incr_dep_cbob: number // 存放央行和同业款项净增加额
  c_pay_claims_orig_inco: number // 支付原保险合同赔付款项的现金
  pay_handling_chrg: number // 支付手续费的现金
  pay_comm_insur_plcy: number // 支付保单红利的现金
  oth_cash_pay_oper_act: number // 支付其他与经营活动有关的现金
  st_cash_out_act: number // 经营活动现金流出小计
  n_cashflow_act: number // 经营活动产生的现金流量净额
  oth_recp_ral_inv_act: number // 收到其他与投资活动有关的现金
  c_disp_withdrwl_invest: number // 收回投资收到的现金
  c_recp_return_invest: number // 取得投资收益收到的现金
  n_recp_disp_fiolta: number // 处置固定资产无形资产和其他长期资产收回的现金净额
  n_recp_disp_sobu: number // 处置子公司及其他营业单位收到的现金净额
  stot_inflows_inv_act: number // 投资活动现金流入小计
  c_pay_acq_const_fiolta: number // 购建固定资产无形资产和其他长期资产支付的现金
  c_paid_invest: number // 投资支付的现金
  n_disp_subs_oth_biz: number // 质押贷款净增加额
  oth_pay_ral_inv_act: number // 支付其他与投资活动有关的现金
  n_incr_pledge_loan: number // 质押贷款净增加额
  stot_out_inv_act: number // 投资活动现金流出小计
  n_cashflow_inv_act: number // 投资活动产生的现金流量净额
  c_recp_borrow: number // 取得借款收到的现金
  proc_issue_bonds: number // 发行债券收到的现金
  oth_cash_recp_ral_fnc_act: number // 收到其他与筹资活动有关的现金
  stot_cash_in_fnc_act: number // 筹资活动现金流入小计
  free_cashflow: number // 企业自由现金流量
  c_prepay_amt_borr: number // 偿还债务支付的现金
  c_pay_dist_dpcp_int_exp: number // 分配股利利润或偿付利息支付的现金
  incl_dvd_profit_paid_sc_ms: number // 其中:子公司支付给少数股东的股利利润
  oth_cashpay_ral_fnc_act: number // 支付其他与筹资活动有关的现金
  stot_cashout_fnc_act: number // 筹资活动现金流出小计
  n_cash_flows_fnc_act: number // 筹资活动产生的现金流量净额
  eff_fx_flu_cash: number // 汇率变动对现金的影响
  n_incr_cash_cash_equ: number // 现金及现金等价物净增加额
  c_cash_equ_beg_period: number // 期初现金及现金等价物余额
  c_cash_equ_end_period: number // 期末现金及现金等价物余额
  c_recp_cap_contrib: number // 吸收投资收到的现金
  incl_cash_rec_saims: number // 其中:子公司吸收少数股东投资收到的现金
  uncon_invest_loss: number // 未确认投资损失
  prov_depr_assets: number // 加:资产减值准备
  depr_fa_coga_dpba: number // 固定资产折旧油气资产折耗生产性生物资产折旧
  amort_intang_assets: number // 无形资产摊销
  lt_amort_deferred_exp: number // 长期待摊费用摊销
  decr_deferred_exp: number // 待摊费用减少
  incr_acc_exp: number // 预提费用增加
  loss_disp_fiolta: number // 处置固定、无形资产和其他长期资产的损失
  loss_scr_fa: number // 固定资产报废损失
  loss_fv_chg: number // 公允价值变动损失
  invest_loss: number // 投资损失
  decr_def_inc_tax_assets: number // 递延所得税资产减少
  incr_def_inc_tax_liab: number // 递延所得税负债增加
  decr_inventories: number // 存货的减少
  decr_oper_payable: number // 经营性应收项目的减少
  incr_oper_payable: number // 经营性应付项目的增加
  others: number // 其他
  im_net_cashflow_oper_act: number // 经营活动产生的现金流量净额(间接法)
  conv_debt_into_cap: number // 债务转为资本
  conv_copbonds_due_within_1y: number // 一年内到期的可转换公司债券
  fa_fnc_leases: number // 融资租入固定资产
  end_bal_cash: number // 现金的期末余额
  beg_bal_cash: number // 减:现金的期初余额
  end_bal_cash_equ: number // 加:现金等价物的期末余额
  beg_bal_cash_equ: number // 减:现金等价物的期初余额
  im_n_incr_cash_equ: number // 现金及现金等价物净增加额(间接法)
}

// 财务指标 (fina_indicator)
export interface FinaIndicatorItem {
  ts_code: string // 股票代码
  ann_date: string // 公告日期
  end_date: string // 报告期
  eps: number // 基本每股收益
  dt_eps: number // 稀释每股收益
  total_revenue_ps: number // 每股营业总收入
  revenue_ps: number // 每股营业收入
  capital_rese_ps: number // 每股资本公积
  surplus_rese_ps: number // 每股盈余公积
  undist_profit_ps: number // 每股未分配利润
  extra_item: number // 非经常性损益
  profit_dedt: number // 扣除非经常性损益后的净利润
  gross_margin: number // 毛利
  current_ratio: number // 流动比率
  quick_ratio: number // 速动比率
  cash_ratio: number // 保守速动比率
  invturn_days: number // 存货周转天数
  arturn_days: number // 应收账款周转天数
  inv_turn: number // 存货周转次数
  ar_turn: number // 应收账款周转次数
  ca_turn: number // 流动资产周转次数
  fa_turn: number // 固定资产周转次数
  assets_turn: number // 总资产周转次数
  op_income: number // 经营活动净收益
  valuechange_income: number // 价值变动净收益
  interst_income: number // 利息费用
  daa: number // 折旧与摊销
  ebit: number // 息税前利润
  ebitda: number // 息税折旧摊销前利润
  fcff: number // 企业自由现金流量
  fcfe: number // 股权自由现金流量
  current_exint: number // 无息流动负债
  noncurrent_exint: number // 无息非流动负债
  interestdebt: number // 带息债务
  netdebt: number // 净债务
  tangible_asset: number // 有形资产
  working_capital: number // 营运资金
  networking_capital: number // 营运流动资本
  invest_capital: number // 全部投入资本
  retained_earnings: number // 留存收益
  diluted2_eps: number // 期末摊薄每股收益
  bps: number // 每股净资产
  ocfps: number // 每股经营活动产生的现金流量净额
  retainedps: number // 每股留存收益
  cfps: number // 每股现金流量净额
  ebit_ps: number // 每股息税前利润
  fcff_ps: number // 每股企业自由现金流量
  fcfe_ps: number // 每股股东自由现金流量
  netprofit_margin: number // 销售净利率
  grossprofit_margin: number // 销售毛利率
  cogs_of_sales: number // 销售成本率
  expense_of_sales: number // 销售期间费用率
  profit_to_gr: number // 净利润/营业总收入
  saleexp_to_gr: number // 销售费用/营业总收入
  adminexp_of_gr: number // 管理费用/营业总收入
  finaexp_of_gr: number // 财务费用/营业总收入
  impai_ttm: number // 资产减值损失/营业总收入
  gc_of_gr: number // 营业总成本/营业总收入
  op_of_gr: number // 营业利润/营业总收入
  ebit_of_gr: number // 息税前利润/营业总收入
  roe: number // 净资产收益率
  roe_waa: number // 加权平均净资产收益率
  roe_dt: number // 净资产收益率(扣除非经常损益)
  roa: number // 总资产报酬率
  npta: number // 总资产净利润率
  roic: number // 投入资本回报率
  roe_yearly: number // 年化净资产收益率
  roa2_yearly: number // 年化总资产报酬率
  roe_avg: number // 平均净资产收益率(增发条件)
  opincome_of_ebt: number // 经营活动净收益/利润总额
  investincome_of_ebt: number // 价值变动净收益/利润总额
  n_op_profit_of_ebt: number // 营业外收支净额/利润总额
  tax_to_ebt: number // 所得税/利润总额
  dtprofit_to_profit: number // 扣除非经常损益后的净利润/净利润
  salescash_to_or: number // 销售商品提供劳务收到的现金/营业收入
  ocf_to_or: number // 经营活动产生的现金流量净额/营业收入
  ocf_to_opincome: number // 经营活动产生的现金流量净额/经营活动净收益
  capitalized_to_da: number // 资本支出/折旧和摊销
  debt_to_assets: number // 资产负债率
  assets_to_eqt: number // 权益乘数
  dp_assets_to_eqt: number // 权益乘数(杜邦分析)
  ca_to_assets: number // 流动资产/总资产
  nca_to_assets: number // 非流动资产/总资产
  tbassets_to_totalassets: number // 有形资产/总资产
  int_to_talcap: number // 带息债务/全部投入资本
  eqt_to_talcapital: number // 归属于母公司的股东权益/全部投入资本
  currentdebt_to_debt: number // 流动负债/负债合计
  longdeb_to_debt: number // 非流动负债/负债合计
  ocf_to_shortdebt: number // 经营活动产生的现金流量净额/流动负债
  debt_to_eqt: number // 产权比率
  eqt_to_debt: number // 归属于母公司的股东权益/负债合计
  eqt_to_interestdebt: number // 归属于母公司的股东权益/带息债务
  tangibleasset_to_debt: number // 有形资产/负债合计
  tangasset_to_intdebt: number // 有形资产/带息债务
  tangibleasset_to_netdebt: number // 有形资产/净债务
  ocf_to_debt: number // 经营活动产生的现金流量净额/负债合计
  ocf_to_interestdebt: number // 经营活动产生的现金流量净额/带息债务
  ocf_to_netdebt: number // 经营活动产生的现金流量净额/净债务
  ebit_to_interest: number // 已获利息倍数(EBIT/利息费用)
  longdebt_to_workingcapital: number // 长期债务与营运资金比率
  ebitda_to_debt: number // 息税折旧摊销前利润/负债合计
  turn_days: number // 营业周期
  roa_yearly: number // 年化总资产净利率
  roa_dp: number // 总资产净利率(杜邦分析)
  fixed_assets: number // 固定资产合计
  profit_prefin_exp: number // 扣除财务费用前营业利润
  non_op_profit: number // 非营业利润
  op_to_ebt: number // 营业利润／利润总额
  nop_to_ebt: number // 非营业利润／利润总额
  ocf_to_profit: number // 经营活动产生的现金流量净额／营业利润
  cash_to_liqdebt: number // 货币资金／流动负债
  cash_to_liqdebt_withinterest: number // 货币资金／带息流动负债
  op_to_liqdebt: number // 营业利润／流动负债
  op_to_debt: number // 营业利润／负债合计
  roic_yearly: number // 年化投入资本回报率
  total_fa_trun: number // 固定资产合计周转率
  profit_to_op: number // 利润总额／营业收入
  q_opincome: number // 经营活动单季度净收益
  q_investincome: number // 价值变动单季度净收益
  q_dtprofit: number // 扣除非经常损益后的单季度净利润
  q_eps: number // 每股收益(单季度)
  q_netprofit_margin: number // 销售净利率(单季度)
  q_gsprofit_margin: number // 销售毛利率(单季度)
  q_exp_to_sales: number // 销售期间费用率(单季度)
  q_profit_to_gr: number // 净利润／营业总收入(单季度)
  q_saleexp_to_gr: number // 销售费用／营业总收入 (单季度)
  q_adminexp_to_gr: number // 管理费用／营业总收入 (单季度)
  q_finaexp_to_gr: number // 财务费用／营业总收入 (单季度)
  q_impair_to_gr_ttm: number // 资产减值损失／营业总收入(单季度)
  q_gc_to_gr: number // 营业总成本／营业总收入 (单季度)
  q_op_to_gr: number // 营业利润／营业总收入(单季度)
  q_roe: number // 净资产收益率(单季度)
  q_dt_roe: number // 净资产收益率(扣除非经常损益)(单季度)
  q_npta: number // 总资产净利润率(单季度)
  q_opincome_to_ebt: number // 经营活动净收益／利润总额(单季度)
  q_investincome_to_ebt: number // 价值变动净收益／利润总额(单季度)
  q_dtprofit_to_profit: number // 扣除非经常损益后的净利润／净利润(单季度)
  q_salescash_to_or: number // 销售商品提供劳务收到的现金／营业收入(单季度)
  q_ocf_to_sales: number // 经营活动产生的现金流量净额／营业收入(单季度)
  q_ocf_to_or: number // 经营活动产生的现金流量净额／经营活动净收益(单季度)
  basic_eps_yoy: number // 基本每股收益同比增长率(%)
  dt_eps_yoy: number // 稀释每股收益同比增长率(%)
  cfps_yoy: number // 每股经营活动产生的现金流量净额同比增长率(%)
  op_yoy: number // 营业利润同比增长率(%)
  ebt_yoy: number // 利润总额同比增长率(%)
  netprofit_yoy: number // 归属母公司股东的净利润同比增长率(%)
  dt_netprofit_yoy: number // 归属母公司股东的净利润(扣除非经常损益)同比增长率(%)
  ocf_yoy: number // 经营活动产生的现金流量净额同比增长率(%)
  roe_yoy: number // 净资产收益率(摊薄)同比增长率(%)
  bps_yoy: number // 每股净资产相对年初增长率(%)
  assets_yoy: number // 资产总计相对年初增长率(%)
  eqt_yoy: number // 归属母公司的股东权益相对年初增长率(%)
  tr_yoy: number // 营业总收入同比增长率(%)
  or_yoy: number // 营业收入同比增长率(%)
  q_gr_yoy: number // 营业总收入同比增长率(%)(单季度)
  q_gr_qoq: number // 营业总收入环比增长率(%)(单季度)
  q_sales_yoy: number // 营业收入同比增长率(%)(单季度)
  q_sales_qoq: number // 营业收入环比增长率(%)(单季度)
  q_op_yoy: number // 营业利润同比增长率(%)(单季度)
  q_op_qoq: number // 营业利润环比增长率(%)(单季度)
  q_profit_yoy: number // 净利润同比增长率(%)(单季度)
  q_profit_qoq: number // 净利润环比增长率(%)(单季度)
  q_netprofit_yoy: number // 归属母公司股东的净利润同比增长率(%)(单季度)
  q_netprofit_qoq: number // 归属母公司股东的净利润环比增长率(%)(单季度)
  equity_yoy: number // 净资产同比增长率
  rd_exp: number // 研发费用
  rd_exp_to_gr: number // 研发费用/营业总收入
}

// 指数基础信息 (index_basic)
export interface IndexBasicItem {
  ts_code: string // 指数代码
  name: string // 指数名称
  fullname: string // 指数全称
  market: string // 市场
  publisher: string // 发布方
  index_type: string // 指数风格
  category: string // 指数类别
  base_date: string // 基期
  base_point: number // 基点
  list_date: string // 发布日期
  weight_rule: string // 加权方式
  desc: string // 描述
  exp_date: string // 终止日期
}

// 指数日线行情 (index_daily)
export interface IndexDailyItem {
  ts_code: string // 指数代码
  trade_date: string // 交易日期
  close: number // 收盘点位
  open: number // 开盘点位
  high: number // 最高点位
  low: number // 最低点位
  pre_close: number // 昨日收盘点
  change: number // 涨跌点
  pct_chg: number // 涨跌幅 (%)
  vol: number // 成交量 (手)
  amount: number // 成交额 (千元)
}

// 交易日历 (trade_cal)
export interface TradeCalItem {
  exchange: string // 交易所 SSE上交所 SZSE深交所
  cal_date: string // 日历日期
  is_open: number // 是否交易 0休市 1交易
  pretrade_date: string // 上一交易日
}

// 复权因子 (adj_factor)
export interface AdjFactorItem {
  ts_code: string // 股票代码
  trade_date: string // 交易日期
  adj_factor: number // 复权因子
}

// 停复牌信息 (suspend_d)
export interface SuspendItem {
  ts_code: string // 股票代码
  trade_date: string // 交易日期
  suspend_timing: string // 停牌时间
  suspend_type: string // 停牌类型
  suspend_reason: string // 停牌原因
  resume_timing: string // 复牌时间
  resume_date: string // 复牌日期
}

// 每日涨跌停价格 (stk_limit)
export interface StkLimitItem {
  ts_code: string // 股票代码
  trade_date: string // 交易日期
  up_limit: number // 涨停价
  down_limit: number // 跌停价
}

// 分红送股数据 (dividend)
export interface DividendItem {
  ts_code: string // 股票代码
  end_date: string // 分红年度
  ann_date: string // 预案公告日
  div_proc: string // 实施进度
  stk_div: number // 每股送转
  stk_bo_rate: number // 每股送股比例
  stk_co_rate: number // 每股转增比例
  cash_div: number // 每股分红(税前)
  cash_div_tax: number // 每股分红(税后)
  record_date: string // 股权登记日
  ex_date: string // 除权除息日
  pay_date: string // 派息日
  div_listdate: string // 红股上市日
  imp_ann_date: string // 实施公告日
  base_date: string // 基准日
  base_share: number // 基准股本(万)
}

// 业绩预告 (forecast)
export interface ForecastItem {
  ts_code: string // 股票代码
  ann_date: string // 公告日期
  end_date: string // 报告期
  type: string // 业绩预告类型(预增/预减/扭亏/首亏/续亏/续盈/略增/略减)
  p_change_min: number // 预告净利润变动幅度下限(%)
  p_change_max: number // 预告净利润变动幅度上限(%)
  net_profit_min: number // 预告净利润下限(万元)
  net_profit_max: number // 预告净利润上限(万元)
  last_parent_net: number // 上年同期归属母公司净利润
  first_ann_date: string // 首次公告日
  summary: string // 业绩预告摘要
  change_reason: string // 业绩变动原因
}

// 业绩快报 (express)
export interface ExpressItem {
  ts_code: string // 股票代码
  ann_date: string // 公告日期
  end_date: string // 报告期
  revenue: number // 营业收入(万元)
  operate_profit: number // 营业利润(万元)
  total_profit: number // 利润总额(万元)
  n_income: number // 净利润(万元)
  total_assets: number // 总资产(万元)
  total_hldr_eqy_exc_min_int: number // 股东权益合计(不含少数股东权益)(万元)
  diluted_eps: number // 每股收益(摊薄)(元)
  diluted_roe: number // 净资产收益率(摊薄)(%)
  yoy_net_profit: number // 去年同期修正后净利润
  bps: number // 每股净资产
  yoy_sales: number // 同比增长率:营业收入
  yoy_op: number // 同比增长率:营业利润
  yoy_tp: number // 同比增长率:利润总额
  yoy_dedu_np: number // 同比增长率:归属母公司股东的净利润
  yoy_eps: number // 同比增长率:基本每股收益
  yoy_roe: number // 同比增减:加权平均净资产收益率
  growth_assets: number // 比年初增长率:总资产
  yoy_equity: number // 比年初增长率:归属母公司的股东权益
  growth_bps: number // 比年初增长率:归属于母公司股东的每股净资产
  or_last_year: number // 去年同期营业收入
  op_last_year: number // 去年同期营业利润
  tp_last_year: number // 去年同期利润总额
  np_last_year: number // 去年同期净利润
  eps_last_year: number // 去年同期每股收益
  open_net_assets: number // 期初净资产
  open_bps: number // 期初每股净资产
  perf_summary: string // 业绩简要说明
  is_audit: number // 是否审计： 1是 0否
  remark: string // 备注
}

// ============ 工具类型和验证函数 ============

// API 参数映射类型
export type TushareApiParams = {
  stock_basic: StockBasicParams
  daily: DailyParams
  daily_basic: DailyBasicParams
  pro_bar: ProBarParams
  income: IncomeParams
  balancesheet: BalanceSheetParams
  cashflow: CashFlowParams
  fina_indicator: FinaIndicatorParams
  index_basic: IndexBasicParams
  index_daily: IndexDailyParams
  trade_cal: TradeCalParams
  adj_factor: AdjFactorParams
  suspend: SuspendParams
  stk_limit: StkLimitParams
  dividend: DividendParams
  forecast: ForecastParams
  express: ExpressParams
}

// API 响应映射类型
export type TushareApiResponse = {
  stock_basic: StockBasicItem
  daily: DailyItem
  daily_basic: DailyBasicItem
  pro_bar: ProBarItem
  income: IncomeItem
  balancesheet: BalanceSheetItem
  cashflow: CashFlowItem
  fina_indicator: FinaIndicatorItem
  index_basic: IndexBasicItem
  index_daily: IndexDailyItem
  trade_cal: TradeCalItem
  adj_factor: AdjFactorItem
  suspend: SuspendItem
  stk_limit: StkLimitItem
  dividend: DividendItem
  forecast: ForecastItem
  express: ExpressItem
}

// 通用查询参数
export interface CommonQueryParams {
  ts_code?: TushareCode
  trade_date?: TushareDate
  start_date?: TushareDate
  end_date?: TushareDate
  exchange?: TushareExchange
  limit?: number
  offset?: number
}

// 数据验证函数
export const TushareValidators = {
  // 验证股票代码格式
  isValidTsCode: (code: string): code is TushareCode => {
    return /^\d{6}\.(SZ|SH|BJ)$/.test(code)
  },

  // 验证日期格式
  isValidDate: (date: string): date is TushareDate => {
    return /^\d{8}$/.test(date) && !isNaN(Date.parse(
      date.substring(0, 4) + '-' +
      date.substring(4, 6) + '-' +
      date.substring(6, 8)
    ))
  },

  // 验证交易所代码
  isValidExchange: (exchange: string): exchange is TushareExchange => {
    return ['SSE', 'SZSE', 'BSE'].includes(exchange)
  },

  // 验证上市状态
  isValidListStatus: (status: string): status is TushareListStatus => {
    return ['L', 'D', 'P'].includes(status)
  },

  // 验证沪深港通状态
  isValidHsStatus: (status: string): status is TushareHsStatus => {
    return ['N', 'H', 'S'].includes(status)
  }
}

// 数据转换工具
export const TushareConverters = {
  // 将 Tushare 日期转换为 Date 对象
  dateToDate: (tushareDate: TushareDate): Date => {
    return new Date(
      parseInt(tushareDate.substring(0, 4)),
      parseInt(tushareDate.substring(4, 6)) - 1,
      parseInt(tushareDate.substring(6, 8))
    )
  },

  // 将 Date 对象转换为 Tushare 日期格式
  dateToTushareDate: (date: Date): TushareDate => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  },

  // 将股票代码转换为不同格式
  convertTsCode: (tsCode: TushareCode, format: 'symbol' | 'full' = 'symbol'): string => {
    if (format === 'symbol') {
      return tsCode.split('.')[0]
    }
    return tsCode
  },

  // 格式化金额（万元转元）
  formatAmount: (amount: number, unit: 'wan' | 'yi' = 'wan'): number => {
    if (unit === 'wan') {
      return amount * 10000
    } else if (unit === 'yi') {
      return amount * 100000000
    }
    return amount
  }
}

// 错误处理工具
export const TushareErrorHandler = {
  // 判断是否为可重试的错误
  isRetryableError: (code: TushareErrorCode): boolean => {
    return [
      TushareErrorCode.RATE_LIMIT_EXCEEDED,
      TushareErrorCode.SERVER_ERROR
    ].includes(code)
  },

  // 获取错误描述
  getErrorMessage: (code: TushareErrorCode): string => {
    const messages = {
      [TushareErrorCode.SUCCESS]: '成功',
      [TushareErrorCode.PERMISSION_DENIED]: '权限不足',
      [TushareErrorCode.INVALID_TOKEN]: '无效的token',
      [TushareErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超限',
      [TushareErrorCode.DAILY_LIMIT_EXCEEDED]: '每日请求次数超限',
      [TushareErrorCode.INVALID_PARAMS]: '参数错误',
      [TushareErrorCode.SERVER_ERROR]: '服务器错误'
    }
    return messages[code] || '未知错误'
  }
}
