import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

type WikiNode = {
  children?: Array<WikiNode> | undefined;
  description: string;
  kind: "folder" | "page";
  path: string;
  status: (string | null) | Array<string | null>;
  title: string;
};

const kind = z.union([z.string(), z.null()]).optional();
const CaseRow = z
  .object({
    case_id: z.string(),
    decided_by: z.union([z.string(), z.null()]),
    decision: z.union([z.string(), z.null()]),
    kind: z.string(),
    kind_label: z.string(),
    question_id: z.union([z.string(), z.null()]),
    sku: z.string(),
    title: z.string(),
    week_start: z.union([z.string(), z.null()]),
  })
  .passthrough();
const Page_CaseRow_ = z
  .object({
    items: z.array(CaseRow),
    page: z.number().int().gte(1),
    page_size: z.number().int().gte(1),
    total: z.number().int().gte(0),
    total_pages: z.number().int().gte(0),
  })
  .passthrough();
const ValidationError = z
  .object({
    ctx: z.object({}).partial().passthrough().optional(),
    input: z.unknown().optional(),
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
  })
  .passthrough();
const HTTPValidationError = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .passthrough();
const CaseDetail = z
  .object({
    actual_qty: z.union([z.number(), z.null()]),
    booking_count: z.union([z.number(), z.null()]),
    case_id: z.string(),
    decided_by: z.union([z.string(), z.null()]),
    decision: z.union([z.string(), z.null()]),
    expected_qty: z.union([z.number(), z.null()]),
    first_date: z.union([z.string(), z.null()]),
    kind: z.string(),
    kind_label: z.string(),
    last_date: z.union([z.string(), z.null()]),
    note: z.union([z.string(), z.null()]),
    options: z.array(z.string()),
    question_id: z.union([z.string(), z.null()]),
    sku: z.string(),
    summary: z.string(),
    title: z.string(),
    week_start: z.union([z.string(), z.null()]),
  })
  .passthrough();
const CaseDecisionIn = z
  .object({
    choice: z.string(),
    reason: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const EventOut = z
  .object({
    date: z.string(),
    id: z.string(),
    is_sample: z.boolean(),
    kind: z.string(),
    sku: z.union([z.string(), z.null()]),
    source: z.enum(["kalender", "beispiel", "journal"]),
    title: z.string(),
  })
  .passthrough();
const EventIn = z
  .object({
    date: z.string(),
    kind: z.string().min(1).max(40),
    sku: z.union([z.string(), z.null()]).optional(),
    title: z.string().min(1).max(200),
  })
  .passthrough();
const FeedbackContext = z
  .object({
    app_version: z.string().max(40),
    case_id: z.union([z.string(), z.null()]).optional(),
    page: z.string().max(120),
    reference_date: z.string(),
    route: z.string().max(300),
    sku: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const FeedbackIn = z
  .object({
    author: z.string().max(100).optional().default(""),
    context: FeedbackContext,
    description: z.string().max(4000).optional().default(""),
    kind: z.enum(["frage", "bug", "feature"]),
    title: z.string().min(1).max(200),
  })
  .passthrough();
const FeedbackOut = z
  .object({
    issue_number: z.union([z.number(), z.null()]),
    issue_url: z.union([z.string(), z.null()]),
    message: z.string(),
    status: z.enum(["sent", "pending"]),
  })
  .passthrough();
const ModelQuality = z
  .object({
    articles_evaluated: z.number().int(),
    articles_not_evaluated: z.number().int(),
    bias_mean: z.union([z.number(), z.null()]),
    coverage_mean: z.union([z.number(), z.null()]),
    model: z.string(),
    wape_mean: z.union([z.number(), z.null()]),
  })
  .passthrough();
const WorstArticle = z
  .object({
    model: z.string(),
    sku: z.string(),
    title: z.string(),
    wape: z.number(),
  })
  .passthrough();
const QualityOut = z
  .object({ models: z.array(ModelQuality), worst: z.array(WorstArticle) })
  .passthrough();
const Health = z
  .object({
    reference_date: z.string(),
    status: z.string(),
    version: z.string(),
  })
  .passthrough();
const target_year = z.union([z.number(), z.null()]).optional();
const ApprovalOut = z
  .object({
    approved_at: z.string(),
    author: z.string(),
    total: z.number().int(),
    tranche: z.number().int(),
  })
  .passthrough();
const StepOut = z
  .object({
    delta: z.number(),
    key: z.string(),
    label: z.string(),
    note: z.string(),
    question_id: z.union([z.string(), z.null()]),
    value: z.number(),
  })
  .passthrough();
const DerivationOut = z
  .object({ result: z.number(), steps: z.array(StepOut) })
  .passthrough();
const PlanRowOut = z
  .object({
    adjustment_reason: z.union([z.string(), z.null()]),
    changed_by: z.union([z.string(), z.null()]),
    derivation: DerivationOut,
    deviation: z.number().int(),
    net_demand: z.number(),
    quantity: z.number().int(),
    sku: z.string(),
    stock: z.number(),
    suggested_quantity: z.number().int(),
    title: z.string(),
    tranche_adjustment: z.number().int(),
    warnings: z.array(z.string()),
  })
  .passthrough();
const SpecialOut = z
  .object({ sku: z.string(), stock: z.number(), title: z.string() })
  .passthrough();
const PlanOut = z
  .object({
    approval: z.union([ApprovalOut, z.null()]),
    rows: z.array(PlanRowOut),
    special: z.array(SpecialOut),
    suggested_total: z.number().int(),
    target_week: z.number().int(),
    target_year: z.number().int(),
    total: z.number().int(),
    tranche: z.number().int(),
    tranche_options: z.array(z.number().int()),
    unresolved: z.number().int(),
  })
  .passthrough();
const ApproveIn = z
  .object({
    target_week: z.union([z.number(), z.null()]),
    target_year: z.union([z.number(), z.null()]),
    tranche: z.union([z.number(), z.null()]),
  })
  .partial()
  .passthrough();
const QuantityIn = z.object({ quantity: z.number().int() }).passthrough();
const colour = z
  .union([z.enum(["red", "yellow", "green", "blue"]), z.null()])
  .optional();
const ProductRow = z
  .object({
    brand: z.union([z.string(), z.null()]),
    category: z.union([z.string(), z.null()]),
    colour: z.union([z.enum(["red", "yellow", "green", "blue"]), z.null()]),
    is_special: z.boolean(),
    sku: z.string(),
    stock: z.number(),
    stockout_label: z.union([z.string(), z.null()]),
    title: z.string(),
    turnover_class: z.union([z.number(), z.null()]),
  })
  .passthrough();
const Page_ProductRow_ = z
  .object({
    items: z.array(ProductRow),
    page: z.number().int().gte(1),
    page_size: z.number().int().gte(1),
    total: z.number().int().gte(0),
    total_pages: z.number().int().gte(0),
  })
  .passthrough();
const Filters = z
  .object({
    brands: z.array(z.string()),
    categories: z.array(z.string()),
    turnover_classes: z.array(z.number().int()),
  })
  .passthrough();
const ChannelShare = z
  .object({ channel: z.string(), is_sample: z.boolean(), share: z.number() })
  .passthrough();
const SetShare = z
  .object({
    set_sku: z.string(),
    set_title: z.string(),
    share: z.number(),
    units_last_52_weeks: z.number(),
    units_per_set: z.number().int(),
  })
  .passthrough();
const DemandOrigin = z
  .object({
    channels: z.array(ChannelShare),
    channels_are_sample: z.boolean(),
    direct_units: z.number(),
    set_share: z.number(),
    set_units: z.number(),
    sets: z.array(SetShare),
  })
  .passthrough();
const ForecastPoint = z
  .object({
    capped: z.boolean(),
    lower_80: z.union([z.number(), z.null()]),
    quantity: z.number(),
    upper_80: z.union([z.number(), z.null()]),
    week_start: z.string(),
  })
  .passthrough();
const SalesWeek = z
  .object({
    direct: z.number(),
    excluded: z.boolean(),
    from_sets: z.number(),
    total: z.number(),
    week_start: z.string(),
  })
  .passthrough();
const JournalLine = z
  .object({
    author: z.string(),
    choice: z.string(),
    created_at: z.string(),
    id: z.string(),
    reason: z.union([z.string(), z.null()]),
    type: z.string(),
    value: z.union([z.string(), z.number(), z.number(), z.boolean(), z.null()]),
  })
  .passthrough();
const Marker = z
  .object({ date: z.string(), key: z.string(), label: z.string() })
  .passthrough();
const ModelRow = z
  .object({
    bias: z.union([z.number(), z.null()]),
    coverage: z.union([z.number(), z.null()]),
    evaluated: z.boolean(),
    model: z.string(),
    selected: z.boolean(),
    wape: z.union([z.number(), z.null()]),
  })
  .passthrough();
const ProductDetail = z
  .object({
    brand: z.union([z.string(), z.null()]),
    category: z.union([z.string(), z.null()]),
    colour: z.union([z.enum(["red", "yellow", "green", "blue"]), z.null()]),
    demand_origin: DemandOrigin,
    derivation: z.union([DerivationOut, z.null()]),
    forecast: z.array(ForecastPoint),
    history: z.array(SalesWeek),
    is_special: z.boolean(),
    journal: z.array(JournalLine),
    markers: z.array(Marker),
    models: z.array(ModelRow),
    quantity: z.union([z.number(), z.null()]),
    recommendation: z.union([z.string(), z.null()]),
    selected_model: z.union([z.string(), z.null()]),
    sentence: z.union([z.string(), z.null()]),
    sku: z.string(),
    stock: z.number(),
    stockout_label: z.union([z.string(), z.null()]),
    stockout_week: z.union([z.string(), z.null()]),
    title: z.string(),
    trend_percent: z.union([z.number(), z.null()]),
    turnover_class: z.union([z.number(), z.null()]),
  })
  .passthrough();
const QuestionOut = z
  .object({
    description: z.string(),
    priority: z.union([z.string(), z.null()]),
    question_id: z.string(),
    status: z.string(),
    title: z.string(),
  })
  .passthrough();
const RunOut = z
  .object({
    finished_at: z.union([z.string(), z.null()]),
    is_current: z.boolean(),
    model_counts: z.union([z.string(), z.null()]),
    run_id: z.number().int(),
    sku_count: z.union([z.number(), z.null()]),
    started_at: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
  })
  .passthrough();
const DataOut = z
  .object({
    checksum: z.union([z.string(), z.null()]),
    comparison: z.union([z.object({}).partial().passthrough(), z.null()]),
    last_rebuild: z.union([z.string(), z.null()]),
    orphans: z.array(z.record(z.string())),
    real_date: z.string(),
    reference_date: z.string(),
    runs: z.array(RunOut),
    source_last_booking: z.union([z.string(), z.null()]),
    source_path: z.string(),
    source_sha256: z.union([z.string(), z.null()]),
    time_machine: z.boolean(),
  })
  .passthrough();
const SetRow = z
  .object({
    components: z.number().int(),
    set_sku: z.string(),
    title: z.string(),
    units_bound_52_weeks: z.number(),
  })
  .passthrough();
const Page_SetRow_ = z
  .object({
    items: z.array(SetRow),
    page: z.number().int().gte(1),
    page_size: z.number().int().gte(1),
    total: z.number().int().gte(0),
    total_pages: z.number().int().gte(0),
  })
  .passthrough();
const ComponentOut = z
  .object({
    quantity: z.number().int(),
    share_from_set: z.number(),
    sku: z.string(),
    title: z.string(),
  })
  .passthrough();
const SetDetail = z
  .object({
    components: z.number().int(),
    components_detail: z.array(ComponentOut),
    set_sku: z.string(),
    title: z.string(),
    units_bound_52_weeks: z.number(),
  })
  .passthrough();
const ParameterOut = z
  .object({
    changed_at: z.union([z.string(), z.null()]),
    changed_by: z.union([z.string(), z.null()]),
    default: z.number(),
    help: z.string(),
    key: z.string(),
    label: z.string(),
    maximum: z.number(),
    minimum: z.number(),
    question_id: z.union([z.string(), z.null()]),
    status: z.string(),
    unit: z.string(),
    value: z.number(),
  })
  .passthrough();
const ParameterChange = z
  .object({
    reason: z.union([z.string(), z.null()]).optional(),
    value: z.number(),
  })
  .passthrough();
const Stage = z
  .object({
    finished_at: z.union([z.string(), z.null()]),
    key: z.string(),
    label: z.string(),
    status: z.enum(["ok", "warn", "error"]),
  })
  .passthrough();
const User = z.object({ name: z.string(), role: z.string() }).passthrough();
const StatusOut = z
  .object({
    badges: z.record(z.number().int()),
    iso_week: z.number().int(),
    reference_date: z.string(),
    stages: z.array(Stage),
    user: z.union([User, z.null()]).optional(),
  })
  .passthrough();
const PhaseRow = z
  .object({
    duration_days: z.number().int(),
    end_date: z.union([z.string(), z.null()]),
    phase_id: z.string(),
    question_id: z.string().optional().default("Q-101"),
    shipped_during: z.number().int(),
    sku: z.string(),
    start_date: z.string(),
    status: z.enum(["offen", "bestätigt", "abgelehnt"]),
  })
  .passthrough();
const Page_PhaseRow_ = z
  .object({
    items: z.array(PhaseRow),
    page: z.number().int().gte(1),
    page_size: z.number().int().gte(1),
    total: z.number().int().gte(0),
    total_pages: z.number().int().gte(0),
  })
  .passthrough();
const PhaseDecisionIn = z
  .object({
    choice: z.enum(["bestätigen", "ablehnen"]),
    reason: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const SupplierRow = z
  .object({
    article_count: z.number().int(),
    is_sample: z.boolean().optional().default(true),
    minimum_eur: z.number(),
    name: z.string(),
    status: z.enum(["bereit", "wartet – bündeln"]),
    supplier_id: z.string(),
    value_eur: z.number(),
  })
  .passthrough();
const SupplierArticle = z
  .object({
    forecast_4_weeks: z.number(),
    packaging_unit: z.number().int(),
    proposed_units: z.number().int(),
    purchase_price_eur: z.number(),
    sku: z.string(),
    stock: z.number().int(),
    title: z.string(),
    value_eur: z.number(),
  })
  .passthrough();
const TopUp = z
  .object({
    adds_eur: z.number(),
    extra_units: z.number().int(),
    sku: z.string(),
    title: z.string(),
  })
  .passthrough();
const SupplierDetail = z
  .object({
    article_count: z.number().int(),
    articles: z.array(SupplierArticle),
    banner: z.string(),
    decision: z.union([z.string(), z.null()]),
    gap_eur: z.number(),
    is_sample: z.boolean().optional().default(true),
    minimum_eur: z.number(),
    name: z.string(),
    status: z.enum(["bereit", "wartet – bündeln"]),
    supplier_id: z.string(),
    top_up: z.array(TopUp),
    value_eur: z.number(),
  })
  .passthrough();
const ruebert__api__supplier_orders__DecisionIn = z
  .object({
    choice: z.enum(["freigeben", "zurückstellen"]),
    reason: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const Rule = z
  .object({
    colour: z.string(),
    question_id: z.union([z.string(), z.null()]),
    text: z.string(),
  })
  .passthrough();
const QueueItem = z
  .object({
    colour: z.enum(["red", "yellow", "green", "blue"]),
    decision: z.union([z.string(), z.null()]).optional(),
    recommendation: z.union([z.string(), z.null()]),
    sku: z.string(),
    stock: z.number(),
    stockout_label: z.string(),
    suggested_quantity: z.union([z.number(), z.null()]),
    title: z.string(),
  })
  .passthrough();
const TrafficLightOut = z
  .object({
    counts: z.record(z.number().int()),
    decided: z.number().int(),
    explanation: z.array(Rule),
    queue: z.array(QueueItem),
    special: z.array(QueueItem),
  })
  .passthrough();
const ruebert__api__traffic_light__DecisionIn = z
  .object({
    choice: z.enum(["annehmen", "zurückstellen"]),
    reason: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const WikiNode: z.ZodType<WikiNode> = z.lazy(() =>
  z
    .object({
      children: z.array(WikiNode).optional().default([]),
      description: z.string(),
      kind: z.enum(["folder", "page"]),
      path: z.string(),
      status: z.union([z.string(), z.null()]),
      title: z.string(),
    })
    .passthrough()
);
const WikiPage = z
  .object({
    body: z.string(),
    description: z.string(),
    path: z.string(),
    status: z.union([z.string(), z.null()]),
    title: z.string(),
    type: z.union([z.string(), z.null()]),
    visibility: z.union([z.string(), z.null()]),
  })
  .passthrough();

export const schemas = {
  kind,
  CaseRow,
  Page_CaseRow_,
  ValidationError,
  HTTPValidationError,
  CaseDetail,
  CaseDecisionIn,
  EventOut,
  EventIn,
  FeedbackContext,
  FeedbackIn,
  FeedbackOut,
  ModelQuality,
  WorstArticle,
  QualityOut,
  Health,
  target_year,
  ApprovalOut,
  StepOut,
  DerivationOut,
  PlanRowOut,
  SpecialOut,
  PlanOut,
  ApproveIn,
  QuantityIn,
  colour,
  ProductRow,
  Page_ProductRow_,
  Filters,
  ChannelShare,
  SetShare,
  DemandOrigin,
  ForecastPoint,
  SalesWeek,
  JournalLine,
  Marker,
  ModelRow,
  ProductDetail,
  QuestionOut,
  RunOut,
  DataOut,
  SetRow,
  Page_SetRow_,
  ComponentOut,
  SetDetail,
  ParameterOut,
  ParameterChange,
  Stage,
  User,
  StatusOut,
  PhaseRow,
  Page_PhaseRow_,
  PhaseDecisionIn,
  SupplierRow,
  SupplierArticle,
  TopUp,
  SupplierDetail,
  ruebert__api__supplier_orders__DecisionIn,
  Rule,
  QueueItem,
  TrafficLightOut,
  ruebert__api__traffic_light__DecisionIn,
  WikiNode,
  WikiPage,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/api/cases",
    alias: "list_cases_api_cases_get",
    requestFormat: "json",
    parameters: [
      {
        name: "status",
        type: "Query",
        schema: z.enum(["open", "decided", "all"]).optional().default("open"),
      },
      {
        name: "kind",
        type: "Query",
        schema: kind,
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "page_size",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: Page_CaseRow_,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/cases/:case_id",
    alias: "get_case_api_cases__case_id__get",
    requestFormat: "json",
    parameters: [
      {
        name: "case_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: CaseDetail,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/cases/:case_id/decision",
    alias: "decide_case_api_cases__case_id__decision_post",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CaseDecisionIn,
      },
      {
        name: "case_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: CaseRow,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/events",
    alias: "list_events_api_events_get",
    requestFormat: "json",
    parameters: [
      {
        name: "start",
        type: "Query",
        schema: kind,
      },
      {
        name: "end",
        type: "Query",
        schema: kind,
      },
    ],
    response: z.array(EventOut),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/events",
    alias: "add_event_api_events_post",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: EventIn,
      },
    ],
    response: EventOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/feedback",
    alias: "send_feedback_api_feedback_post",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FeedbackIn,
      },
    ],
    response: FeedbackOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/forecast-quality",
    alias: "forecast_quality_api_forecast_quality_get",
    requestFormat: "json",
    response: QualityOut,
  },
  {
    method: "get",
    path: "/api/health",
    alias: "health_api_health_get",
    requestFormat: "json",
    response: Health,
  },
  {
    method: "get",
    path: "/api/order-plans",
    alias: "get_plan_api_order_plans_get",
    requestFormat: "json",
    parameters: [
      {
        name: "target_year",
        type: "Query",
        schema: target_year,
      },
      {
        name: "target_week",
        type: "Query",
        schema: target_year,
      },
      {
        name: "tranche",
        type: "Query",
        schema: target_year,
      },
    ],
    response: PlanOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/order-plans/approve",
    alias: "approve_api_order_plans_approve_post",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApproveIn,
      },
    ],
    response: PlanOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/order-plans/quantities/:sku",
    alias: "set_quantity_api_order_plans_quantities__sku__put",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ quantity: z.number().int() }).passthrough(),
      },
      {
        name: "sku",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: PlanRowOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/products",
    alias: "list_products_api_products_get",
    requestFormat: "json",
    parameters: [
      {
        name: "search",
        type: "Query",
        schema: kind,
      },
      {
        name: "colour",
        type: "Query",
        schema: colour,
      },
      {
        name: "brand",
        type: "Query",
        schema: kind,
      },
      {
        name: "category",
        type: "Query",
        schema: kind,
      },
      {
        name: "turnover_class",
        type: "Query",
        schema: target_year,
      },
      {
        name: "sort",
        type: "Query",
        schema: z
          .enum(["sku", "title", "stock", "colour"])
          .optional()
          .default("sku"),
      },
      {
        name: "descending",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "page_size",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: Page_ProductRow_,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/products/:sku",
    alias: "get_product_api_products__sku__get",
    requestFormat: "json",
    parameters: [
      {
        name: "sku",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ProductDetail,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/products/filters",
    alias: "get_filters_api_products_filters_get",
    requestFormat: "json",
    response: Filters,
  },
  {
    method: "get",
    path: "/api/questions/:question_id",
    alias: "get_question_api_questions__question_id__get",
    requestFormat: "json",
    parameters: [
      {
        name: "question_id",
        type: "Path",
        schema: z.string().max(8),
      },
    ],
    response: QuestionOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/runs",
    alias: "data_and_runs_api_runs_get",
    requestFormat: "json",
    response: DataOut,
  },
  {
    method: "get",
    path: "/api/sets",
    alias: "list_sets_api_sets_get",
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "page_size",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: Page_SetRow_,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/sets/:set_sku",
    alias: "get_set_api_sets__set_sku__get",
    requestFormat: "json",
    parameters: [
      {
        name: "set_sku",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: SetDetail,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/settings",
    alias: "list_settings_api_settings_get",
    requestFormat: "json",
    response: z.array(ParameterOut),
  },
  {
    method: "delete",
    path: "/api/settings/:key",
    alias: "reset_setting_api_settings__key__delete",
    requestFormat: "json",
    parameters: [
      {
        name: "key",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ParameterOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/settings/:key",
    alias: "change_setting_api_settings__key__put",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ParameterChange,
      },
      {
        name: "key",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ParameterOut,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/status",
    alias: "get_status_api_status_get",
    requestFormat: "json",
    response: StatusOut,
  },
  {
    method: "get",
    path: "/api/stockouts",
    alias: "list_phases_api_stockouts_get",
    requestFormat: "json",
    parameters: [
      {
        name: "status",
        type: "Query",
        schema: z
          .enum(["offen", "bestätigt", "abgelehnt", "alle"])
          .optional()
          .default("offen"),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "page_size",
        type: "Query",
        schema: z.number().int().gte(1).lte(200).optional().default(20),
      },
    ],
    response: Page_PhaseRow_,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/stockouts/:phase_id/decision",
    alias: "decide_phase_api_stockouts__phase_id__decision_post",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PhaseDecisionIn,
      },
      {
        name: "phase_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: PhaseRow,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/supplier-orders",
    alias: "list_suppliers_api_supplier_orders_get",
    requestFormat: "json",
    response: z.array(SupplierRow),
  },
  {
    method: "get",
    path: "/api/supplier-orders/:supplier_id",
    alias: "get_supplier_api_supplier_orders__supplier_id__get",
    requestFormat: "json",
    parameters: [
      {
        name: "supplier_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: SupplierDetail,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/supplier-orders/:supplier_id/decision",
    alias: "decide_supplier_api_supplier_orders__supplier_id__decision_post",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ruebert__api__supplier_orders__DecisionIn,
      },
      {
        name: "supplier_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: SupplierDetail,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/traffic-light",
    alias: "get_traffic_light_api_traffic_light_get",
    requestFormat: "json",
    response: TrafficLightOut,
  },
  {
    method: "post",
    path: "/api/traffic-light/:sku/decision",
    alias: "decide_api_traffic_light__sku__decision_post",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ruebert__api__traffic_light__DecisionIn,
      },
      {
        name: "sku",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: QueueItem,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/wiki",
    alias: "wiki_tree_api_wiki_get",
    requestFormat: "json",
    response: z.array(WikiNode),
  },
  {
    method: "get",
    path: "/api/wiki/page",
    alias: "wiki_page_api_wiki_page_get",
    requestFormat: "json",
    parameters: [
      {
        name: "path",
        type: "Query",
        schema: z.string().max(300),
      },
    ],
    response: WikiPage,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
