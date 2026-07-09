-- =============================================================================
-- RBB Merchant Banking Ltd. — RTA/RTS Operations Platform
-- Volume 3 Enterprise Extension Schema (PostgreSQL 15+)
--
-- Depends on: schema-v1-core.sql + schema-v2-extensions.sql, already applied.
-- Nothing in Volume 1 or Volume 2 is dropped, renamed, or redefined except
-- via additive ALTER TABLE and behavior-preserving CREATE OR REPLACE
-- FUNCTION — consistent with the "never redesign" instruction this file
-- was built against.
--
-- This file also folds in the Volume 4 hardening patch that came out of
-- a line-by-line verification pass against a live Postgres 16 instance
-- (indexes, constraints, triggers, partitioning, 50k-holder performance,
-- RLS — sections 41+ below). Keeping it as one file is fine: nothing in
-- §41+ has an ordering dependency on anything outside this file, and
-- every CREATE OR REPLACE FUNCTION in §42 legitimately supersedes its
-- Volume 2 predecessor rather than conflicting with it. Load order is
-- still schema-v1-core.sql -> schema-v2-extensions.sql -> this file.
--
-- Sections:
--   27. Holder Classification (configurable, on top of the existing ENUM)
--   28. Configurable TDS Rules (extends, does not replace, tds_configuration)
--   29. Payment Lots
--   30. Payment Batch Summary (trigger-maintained aggregate)
--   31. Bank Reconciliation Detail (line-level, on top of existing header)
--   32. Calculation Parameters — a deliberate NON-table (see note)
--   33. Calculation Runs & Details (reproducibility)
--   34. Formula Versioning
--   35. Reporting Aggregation (materialized views, not tables — see note)
--   36. Financial Aging
--   37. General Ledger Mapping (projects ledger_entries, doesn't duplicate it)
--   38. Audit Log Enrichment
--   39. Performance follow-up (bank reference / lot / lookup indexes)
--   40. Security (soft-delete + RLS + audit wiring for every new table)
--   --- Volume 4 hardening patch, folded in below ---
--   41. CRITICAL FIX — DEFAULT partitions for audit.event_log / api_logs
--   42. Optimistic locking + full audit columns on mutable entities
--       (42a. fixes Volume 2's fn_capture_version error-handling)
--   43. Immutability enforcement on financial payable tables + ledger
--   44. Business calendar — working-day functions on holiday_calendar
--   45. Numbering sequence seed data
--   46. Exchange rates (multi-currency future-proofing)
--   47. Core calculation / posting / reconciliation functions
-- =============================================================================

SET search_path = rta, public;

-- =============================================================================
-- 27. HOLDER CLASSIFICATION
-- =============================================================================
-- Volume 1's rta.holders.category ENUM ('individual','institutional',
-- 'promoter','employee','foreign','minor','joint') is NOT touched — it's a
-- regulator-facing classification baked into a column other code already
-- depends on. What it can't do is the fine-grained, *versioned*,
-- tax/reporting-driving classification your Excel sheets encode (Public /
-- Institution / Tax Exempt / Mutual Fund / Private Placement, and further
-- splits like Retirement Fund vs Insurance vs Bank that all collapse to the
-- single ENUM value 'institutional' today). These two tables add that
-- layer on top, keyed back to the ENUM for backward compatibility.

CREATE TABLE rta.holder_categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT NOT NULL UNIQUE,     -- 'individual','institution','mutual_fund',
                                                   -- 'retirement_fund','government','insurance',
                                                   -- 'bank','corporate','tax_exempt',
                                                   -- 'foreign_investor','employee','promoter'
  display_name          TEXT NOT NULL,
  is_tax_exempt_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID NOT NULL REFERENCES rta.users(id)
);

-- Every holder's classification history — never overwritten, only closed
-- off (effective_to) and superseded by a new row, so "was this holder
-- Public or Institution on last year's record date" is answerable exactly.
CREATE TABLE rta.holder_category_mapping (
  id                    BIGSERIAL PRIMARY KEY,
  holder_id             UUID NOT NULL REFERENCES rta.holders(id) ON DELETE CASCADE,
  holder_category_id    UUID NOT NULL REFERENCES rta.holder_categories(id),
  effective_from        DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to          DATE,
  assigned_by           UUID NOT NULL REFERENCES rta.users(id),
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason                TEXT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
-- A holder may have many closed-off mapping rows, but only one open one.
CREATE UNIQUE INDEX one_open_category_per_holder
  ON rta.holder_category_mapping (holder_id) WHERE effective_to IS NULL;

CREATE VIEW rta.v_holder_current_category AS
SELECT m.holder_id, m.holder_category_id, c.code, c.display_name, c.is_tax_exempt_default
FROM rta.holder_category_mapping m
JOIN rta.holder_categories c ON c.id = m.holder_category_id
WHERE m.effective_to IS NULL;

-- "Each holder should belong to one category" enforced at the moment a
-- holder is created, not left to the application to remember: derive the
-- initial fine-grained category from the existing ENUM automatically.
-- (Ambiguous ENUM values collapse to a sane default — 'minor' and 'joint'
-- both map to 'individual' for tax purposes; that's a modelling choice,
-- flagged here rather than buried, and can be corrected per-holder
-- afterwards through the normal mapping table since it's just another row.)
CREATE OR REPLACE FUNCTION rta.fn_backfill_holder_category() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  v_code TEXT;
  v_cat_id UUID;
BEGIN
  v_code := CASE NEW.category
    WHEN 'individual'   THEN 'individual'
    WHEN 'institutional' THEN 'institution'
    WHEN 'promoter'      THEN 'promoter'
    WHEN 'employee'      THEN 'employee'
    WHEN 'foreign'       THEN 'foreign_investor'
    WHEN 'minor'         THEN 'individual'
    WHEN 'joint'         THEN 'individual'
  END;
  SELECT id INTO v_cat_id FROM rta.holder_categories WHERE code = v_code;
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO rta.holder_category_mapping
      (holder_id, holder_category_id, effective_from, assigned_by, reason)
    VALUES (NEW.id, v_cat_id, CURRENT_DATE, NEW.created_by,
            'auto-mapped from legacy category ENUM (''' || NEW.category || ''') at holder creation');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_backfill_holder_category AFTER INSERT ON rta.holders
  FOR EACH ROW EXECUTE FUNCTION rta.fn_backfill_holder_category();

-- =============================================================================
-- 28. CONFIGURABLE TDS RULES
-- =============================================================================
-- rta.tds_configuration (Volume 2) already versions rate-by-(action_type,
-- holder_category ENUM, effective date) and is left exactly as it is. What
-- it can't express is a company- or instrument-type-specific override, a
-- surcharge, or an explicit exemption flag distinct from a 0% rate — which
-- is what the SRS's "Public 5% / Institution 15% / Tax Exempt 0%" table
-- actually needs once you add per-issuer overrides. tds_rules is the new,
-- more expressive authority; tds_configuration becomes its global,
-- ENUM-keyed fallback. Resolution order (see fn_resolve_tds_rate below):
--   1. tds_rules row scoped to this exact company + instrument_type
--   2. tds_rules row scoped to this company, any instrument_type (NULL)
--   3. tds_rules row scoped to all companies (NULL), this instrument_type
--   4. tds_rules row scoped to all companies, all instrument_types
--   5. legacy rta.tds_configuration by (action_type, holder_category ENUM)
CREATE TABLE rta.tds_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID REFERENCES rta.companies(id),      -- NULL = all companies
  instrument_type       rta.instrument_type,                     -- NULL = all instrument types
  action_type           rta.action_type NOT NULL,
  holder_category_id    UUID NOT NULL REFERENCES rta.holder_categories(id),
  tax_pct               NUMERIC(9,6) NOT NULL DEFAULT 0 CHECK (tax_pct >= 0),
  surcharge_pct         NUMERIC(9,6) NOT NULL DEFAULT 0 CHECK (surcharge_pct >= 0),
  is_exempt             BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID NOT NULL REFERENCES rta.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CHECK (NOT is_exempt OR tax_pct = 0)
);
CREATE INDEX idx_tds_rules_lookup
  ON rta.tds_rules (action_type, holder_category_id, effective_from DESC) WHERE is_active;

-- KNOWN LIMITATION, stated rather than silently accepted: PostgreSQL
-- exclusion constraints treat NULL <> NULL, same as UNIQUE. So this
-- constraint stops two *company-specific* rules for the same category/
-- instrument/date-range from overlapping, but does NOT stop two *global*
-- (company_id IS NULL) rules from overlapping each other, because NULL
-- never equals NULL for the comparison. If that gap matters operationally,
-- the fix is a sentinel "ALL_COMPANIES" row in rta.companies instead of
-- NULL — a five-minute follow-up, not a schema redesign, so left as a
-- recommendation rather than done silently here.
ALTER TABLE rta.tds_rules ADD CONSTRAINT excl_tds_rules_overlap
  EXCLUDE USING gist (
    company_id WITH =, instrument_type WITH =, action_type WITH =, holder_category_id WITH =,
    daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
  );

CREATE TABLE rta.tds_rule_history (
  id                BIGSERIAL PRIMARY KEY,
  tds_rule_id       UUID NOT NULL REFERENCES rta.tds_rules(id) ON DELETE CASCADE,
  changed_field     TEXT NOT NULL,
  old_value         JSONB,
  new_value         JSONB,
  changed_by        UUID NOT NULL REFERENCES rta.users(id),
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION rta.fn_capture_tds_rule_change() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  v_actor UUID := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
BEGIN
  INSERT INTO rta.tds_rule_history (tds_rule_id, changed_field, old_value, new_value, changed_by)
  VALUES (NEW.id, 'row', to_jsonb(OLD), to_jsonb(NEW), COALESCE(v_actor, NEW.created_by));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tds_rule_history BEFORE UPDATE ON rta.tds_rules
  FOR EACH ROW WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION rta.fn_capture_tds_rule_change();

-- Single reusable resolver so every module (dividend, interest, redemption)
-- computes TDS the same way instead of five copies of the same lookup
-- logic — this is the actual "no more Excel formulas" piece.
CREATE OR REPLACE FUNCTION rta.fn_resolve_tds_rate(
  p_company_id UUID, p_instrument_type rta.instrument_type,
  p_action_type rta.action_type, p_holder_category_id UUID, p_as_of DATE
) RETURNS TABLE(tax_pct NUMERIC, surcharge_pct NUMERIC, is_exempt BOOLEAN, source TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_legacy_category rta.holder_category;
BEGIN
  RETURN QUERY
  SELECT r.tax_pct, r.surcharge_pct, r.is_exempt, 'tds_rules'::TEXT
  FROM rta.tds_rules r
  WHERE r.action_type = p_action_type
    AND r.holder_category_id = p_holder_category_id
    AND r.is_active
    AND p_as_of BETWEEN r.effective_from AND COALESCE(r.effective_to, 'infinity'::date)
    AND (r.company_id = p_company_id OR r.company_id IS NULL)
    AND (r.instrument_type = p_instrument_type OR r.instrument_type IS NULL)
  ORDER BY (r.company_id IS NOT NULL) DESC, (r.instrument_type IS NOT NULL) DESC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Fallback to the Volume 2 legacy table, keyed by the original ENUM.
  SELECT c.code::rta.holder_category INTO v_legacy_category
  FROM rta.holder_categories c WHERE c.id = p_holder_category_id
    AND c.code IN ('individual','institutional','promoter','employee','foreign','minor','joint');

  RETURN QUERY
  SELECT t.rate_pct, 0::NUMERIC, (t.rate_pct = 0), 'tds_configuration'::TEXT
  FROM rta.tds_configuration t
  WHERE t.action_type = p_action_type
    AND t.holder_category = COALESCE(v_legacy_category, 'individual')
    AND p_as_of BETWEEN t.effective_from AND COALESCE(t.effective_to, 'infinity'::date)
  ORDER BY t.effective_from DESC
  LIMIT 1;
END;
$$;

-- =============================================================================
-- 29. PAYMENT LOTS
-- =============================================================================

CREATE TABLE rta.payment_lots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_no        TEXT NOT NULL UNIQUE,
  lot_name      TEXT NOT NULL,
  branch        TEXT,
  batch_date    DATE NOT NULL,
  company_id    UUID NOT NULL REFERENCES rta.companies(id),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  created_by    UUID NOT NULL REFERENCES rta.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_lots_open ON rta.payment_lots (company_id) WHERE status = 'open';

-- Each payment batch (Volume 2) can belong to one lot.
ALTER TABLE rta.payment_batches ADD COLUMN payment_lot_id UUID REFERENCES rta.payment_lots(id);
CREATE INDEX ON rta.payment_batches (payment_lot_id);

-- =============================================================================
-- 30. PAYMENT BATCH SUMMARY  (trigger-maintained, not query-time aggregation)
-- =============================================================================
-- Volume 2's payment_batch_items can be tens of thousands of rows per
-- batch; a dashboard that COUNTs/SUMs them live on every page load doesn't
-- scale. This table is refreshed by a STATEMENT-level trigger (not
-- row-level — recomputing the aggregate once per affected batch per bulk
-- INSERT, not once per row, matters at 50,000-row batches: a row-level
-- version would turn an O(n) bulk load into an O(n²) one).

CREATE TABLE rta.payment_batch_summary (
  payment_batch_id  UUID PRIMARY KEY REFERENCES rta.payment_batches(id) ON DELETE CASCADE,
  total_items       INT NOT NULL DEFAULT 0,
  total_amount      NUMERIC(20,4) NOT NULL DEFAULT 0,
  pending_count     INT NOT NULL DEFAULT 0,  pending_amount   NUMERIC(20,4) NOT NULL DEFAULT 0,
  sent_count        INT NOT NULL DEFAULT 0,  sent_amount      NUMERIC(20,4) NOT NULL DEFAULT 0,
  paid_count        INT NOT NULL DEFAULT 0,  paid_amount      NUMERIC(20,4) NOT NULL DEFAULT 0,
  returned_count    INT NOT NULL DEFAULT 0,  returned_amount  NUMERIC(20,4) NOT NULL DEFAULT 0,
  unclaimed_count   INT NOT NULL DEFAULT 0,  unclaimed_amount NUMERIC(20,4) NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION rta.fn_refresh_payment_batch_summary() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO rta.payment_batch_summary AS s
    (payment_batch_id, total_items, total_amount,
     pending_count, pending_amount, sent_count, sent_amount,
     paid_count, paid_amount, returned_count, returned_amount,
     unclaimed_count, unclaimed_amount, last_refreshed_at)
  SELECT
    i.payment_batch_id, count(*), sum(i.amount),
    count(*) FILTER (WHERE i.status='pending'),   COALESCE(sum(i.amount) FILTER (WHERE i.status='pending'),0),
    count(*) FILTER (WHERE i.status='sent'),       COALESCE(sum(i.amount) FILTER (WHERE i.status='sent'),0),
    count(*) FILTER (WHERE i.status='paid'),       COALESCE(sum(i.amount) FILTER (WHERE i.status='paid'),0),
    count(*) FILTER (WHERE i.status='returned'),   COALESCE(sum(i.amount) FILTER (WHERE i.status='returned'),0),
    count(*) FILTER (WHERE i.status='unclaimed'),  COALESCE(sum(i.amount) FILTER (WHERE i.status='unclaimed'),0),
    now()
  FROM rta.payment_batch_items i
  WHERE i.payment_batch_id IN (SELECT DISTINCT payment_batch_id FROM affected_rows)
  GROUP BY i.payment_batch_id
  ON CONFLICT (payment_batch_id) DO UPDATE SET
    total_items = EXCLUDED.total_items, total_amount = EXCLUDED.total_amount,
    pending_count = EXCLUDED.pending_count, pending_amount = EXCLUDED.pending_amount,
    sent_count = EXCLUDED.sent_count, sent_amount = EXCLUDED.sent_amount,
    paid_count = EXCLUDED.paid_count, paid_amount = EXCLUDED.paid_amount,
    returned_count = EXCLUDED.returned_count, returned_amount = EXCLUDED.returned_amount,
    unclaimed_count = EXCLUDED.unclaimed_count, unclaimed_amount = EXCLUDED.unclaimed_amount,
    last_refreshed_at = now();
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_batch_summary_ins
  AFTER INSERT ON rta.payment_batch_items
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION rta.fn_refresh_payment_batch_summary();

CREATE TRIGGER trg_refresh_batch_summary_upd
  AFTER UPDATE ON rta.payment_batch_items
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION rta.fn_refresh_payment_batch_summary();

-- =============================================================================
-- 31. BANK RECONCILIATION DETAIL
-- =============================================================================
-- Volume 2's rta.bank_reconciliation is a batch-level header row
-- (reconciled_amount / unreconciled_amount / reconciled_by). It stays
-- exactly as-is. The two tables below add the LINE-LEVEL detail your
-- Excel reconciliation actually works at — one row per matched/unmatched
-- bank transaction — which is what lets bank_reconciliation's header
-- totals be a SUM of real rows instead of a manually typed number.

CREATE TABLE rta.reconciliation_items (
  id                     BIGSERIAL,
  bank_reconciliation_id UUID NOT NULL REFERENCES rta.bank_reconciliation(id) ON DELETE CASCADE,
  payment_batch_item_id  BIGINT REFERENCES rta.payment_batch_items(id),
  bank_txn_ref           TEXT NOT NULL,
  bank_status            TEXT NOT NULL CHECK (bank_status IN ('matched','unmatched','partially_matched')),
  payment_status         rta.payable_bank_status,
  return_reason          TEXT,
  settlement_date        DATE,
  reconciled_amount      NUMERIC(20,4),
  variance_amount        NUMERIC(20,4),      -- reconciled_amount - the batch item's original amount
  reconciled_by          UUID REFERENCES rta.users(id),
  reconciled_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE rta.reconciliation_items_2026_07 PARTITION OF rta.reconciliation_items
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE rta.reconciliation_items_default PARTITION OF rta.reconciliation_items DEFAULT;

CREATE INDEX ON rta.reconciliation_items (bank_reconciliation_id);
CREATE INDEX ON rta.reconciliation_items (bank_txn_ref);
CREATE INDEX ON rta.reconciliation_items (bank_status) WHERE bank_status <> 'matched';

-- Auto-compute the variance against the batch item's original amount, so
-- "did the bank pay a different amount than we sent" is never a manual
-- Excel subtraction.
CREATE OR REPLACE FUNCTION rta.fn_compute_reconciliation_variance() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_batch_item_id IS NOT NULL AND NEW.reconciled_amount IS NOT NULL THEN
    SELECT NEW.reconciled_amount - pbi.amount INTO NEW.variance_amount
    FROM rta.payment_batch_items pbi WHERE pbi.id = NEW.payment_batch_item_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reconciliation_variance BEFORE INSERT OR UPDATE ON rta.reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION rta.fn_compute_reconciliation_variance();

-- Structured metadata about an incoming bank response file, distinct from
-- Volume 2's payment_files (which just stores the raw blob reference) —
-- this is the parsed-outcome record: how many lines, how many matched.
CREATE TABLE rta.bank_response_files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_batch_id    UUID NOT NULL REFERENCES rta.payment_batches(id),
  payment_file_id     UUID REFERENCES rta.payment_files(id),   -- the underlying stored blob, if any
  file_name           TEXT NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_records       INT NOT NULL DEFAULT 0,
  matched_records     INT NOT NULL DEFAULT 0,
  unmatched_records   INT NOT NULL DEFAULT 0,
  processing_status   TEXT NOT NULL DEFAULT 'received'
                        CHECK (processing_status IN ('received','processing','processed','failed')),
  processed_by        UUID REFERENCES rta.users(id),
  processed_at        TIMESTAMPTZ
);
CREATE INDEX ON rta.bank_response_files (payment_batch_id);

ALTER TABLE rta.reconciliation_items
  ADD COLUMN bank_response_file_id UUID REFERENCES rta.bank_response_files(id);

-- =============================================================================
-- 32. CALCULATION PARAMETERS — DELIBERATELY NOT A NEW MASTER TABLE
-- =============================================================================
-- The brief asks to centrally store dividend rate, coupon rate, interest
-- period, record date, book close date, payment date, face value, par
-- value, day count convention and fiscal year "so no calculation repeats
-- a value." Every one of those already has exactly one canonical home:
--   Dividend rate            -> rta.dividend_cycles.cash_rate_pct
--   Coupon rate               -> rta.debenture_issues.coupon_rate
--   Interest period            -> rta.interest_cycles.period_start/period_end
--   Record date / book close  -> rta.corporate_actions.record_date /
--                                 book_closure_from / book_closure_to
--   Payment date               -> rta.corporate_actions.execution_date
--   Face value / par value    -> rta.instruments.face_value / paid_up_value
--   Day count convention      -> rta.debenture_issues.day_count_method /
--                                 rta.interest_cycles.day_count_used
--   Fiscal year                -> rta.corporate_actions.fiscal_year /
--                                 rta.financial_year (Volume 2)
-- Copying these into a new calculation_parameters table would create a
-- second, independently-updatable copy of the same fact — precisely the
-- Excel failure mode ("which sheet has the current coupon rate?") this
-- project exists to eliminate, and a direct conflict with the brief's own
-- rule against duplicating functionality.
--
-- What reproducibility actually needs is not a duplicate live copy, but a
-- FROZEN snapshot of the resolved values at the moment a calculation ran
-- — the same snapshot principle Volume 1 already uses for holder register
-- freezes (action_snapshots). That's what calculation_runs.parameters_
-- snapshot (below) is for, populated by this helper:
CREATE OR REPLACE FUNCTION rta.fn_snapshot_calculation_parameters(p_corporate_action_id UUID)
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'action_type', ca.action_type,
    'record_date', ca.record_date,
    'book_closure_from', ca.book_closure_from,
    'book_closure_to', ca.book_closure_to,
    'execution_date', ca.execution_date,
    'fiscal_year', ca.fiscal_year,
    'face_value', i.face_value,
    'paid_up_value', i.paid_up_value,
    'cash_rate_pct', dc.cash_rate_pct,
    'coupon_rate', di.coupon_rate,
    'day_count_method', COALESCE(ic.day_count_used, di.day_count_method)
  )
  FROM rta.corporate_actions ca
  JOIN rta.instruments i ON i.id = ca.instrument_id
  LEFT JOIN rta.dividend_cycles dc ON dc.corporate_action_id = ca.id
  LEFT JOIN rta.debenture_issues di ON di.instrument_id = i.id
  LEFT JOIN rta.interest_cycles ic ON ic.corporate_action_id = ca.id
  WHERE ca.id = p_corporate_action_id;
$$;

-- =============================================================================
-- 33a. FORMULA VERSIONING (created here, ahead of calculation_runs, because
-- calculation_runs.formula_version_id points at it — see section 34 below
-- for the narrative on why this table exists)
-- =============================================================================

CREATE TABLE rta.formula_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_name      TEXT NOT NULL,          -- 'dividend_gross_calc','interest_accrual_calc','tds_calc'
  version           INT NOT NULL,
  description       TEXT,
  effective_date    DATE NOT NULL,
  deprecated_date   DATE,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','deprecated')),
  created_by        UUID NOT NULL REFERENCES rta.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (formula_name, version),
  CHECK (deprecated_date IS NULL OR deprecated_date > effective_date)
);
CREATE UNIQUE INDEX one_active_formula_version
  ON rta.formula_versions (formula_name) WHERE status = 'active';

-- =============================================================================
-- 33. CALCULATION RUNS & DETAILS  (reproducibility, per the brief's #7)
-- =============================================================================

CREATE TABLE rta.calculation_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_no                TEXT NOT NULL UNIQUE,
  corporate_action_id   UUID NOT NULL REFERENCES rta.corporate_actions(id),
  formula_version_id    UUID REFERENCES rta.formula_versions(id),
  engine_version        TEXT NOT NULL,
  parameters_snapshot   JSONB NOT NULL,
  input_hash            CHAR(64) NOT NULL,     -- sha256 of (parameters_snapshot + input row set)
  output_hash           CHAR(64),              -- sha256 of the resulting computed rows
  status                TEXT NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running','completed','failed','superseded')),
  started_by            UUID NOT NULL REFERENCES rta.users(id),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by          UUID REFERENCES rta.users(id),
  completed_at          TIMESTAMPTZ,
  error_detail          TEXT
);
CREATE INDEX ON rta.calculation_runs (corporate_action_id, started_at DESC);

CREATE TABLE rta.calculation_details (
  id                    BIGSERIAL,
  calculation_run_id    UUID NOT NULL REFERENCES rta.calculation_runs(id) ON DELETE CASCADE,
  folio_id              UUID NOT NULL REFERENCES rta.folios(id),
  holder_id             UUID NOT NULL REFERENCES rta.holders(id),
  computed_output       JSONB NOT NULL,       -- gross/tds/surcharge/net etc for this folio
  output_ref_table      TEXT,                 -- 'dividend_payable' once posted downstream
  output_ref_id         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE rta.calculation_details_2026_07 PARTITION OF rta.calculation_details
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE rta.calculation_details_default PARTITION OF rta.calculation_details DEFAULT;

CREATE INDEX ON rta.calculation_details (calculation_run_id);
CREATE INDEX ON rta.calculation_details (folio_id);

-- =============================================================================
-- 34. FORMULA VERSIONING
-- =============================================================================
-- (Moved above section 33 during verification — calculation_runs.formula_
-- version_id references this table, so it must exist first. See fix note
-- at the end of this file.)

-- =============================================================================
-- 35. REPORTING AGGREGATION — MATERIALIZED VIEWS, NOT HAND-MAINTAINED TABLES
-- =============================================================================
-- Postgres's own materialized-view refresh mechanism (backed by
-- rta.scheduled_jobs, Volume 2) is a better fit here than a manually
-- triggered summary table: it's read-only by construction (no risk of the
-- summary silently drifting from source data the way a trigger-maintained
-- table can if a trigger is ever missed on some write path), and
-- REFRESH MATERIALIZED VIEW CONCURRENTLY needs only a unique index, not
-- bespoke maintenance code. payment_batch_summary above uses the trigger
-- approach instead because its numbers need to be current within a
-- transaction (bank reconciliation checks it immediately); these dashboard
-- summaries do not.

CREATE MATERIALIZED VIEW rta.mv_dividend_summary AS
SELECT ca.company_id, ca.id AS corporate_action_id, ca.reference_no, ca.fiscal_year,
       ca.record_date, ca.status,
       dc.cash_rate_pct, dc.gross_declared, dc.gross_computed, dc.tds_total, dc.net_disbursed,
       count(dp.id) AS holder_count
FROM rta.corporate_actions ca
JOIN rta.dividend_cycles dc ON dc.corporate_action_id = ca.id
LEFT JOIN rta.dividend_payable dp ON dp.corporate_action_id = ca.id
GROUP BY ca.company_id, ca.id, ca.reference_no, ca.fiscal_year, ca.record_date, ca.status,
         dc.cash_rate_pct, dc.gross_declared, dc.gross_computed, dc.tds_total, dc.net_disbursed
WITH NO DATA;
CREATE UNIQUE INDEX ON rta.mv_dividend_summary (corporate_action_id);

CREATE MATERIALIZED VIEW rta.mv_interest_summary AS
SELECT ca.company_id, ca.id AS corporate_action_id, ca.reference_no, ca.fiscal_year,
       ic.period_start, ic.period_end, ic.effective_coupon_rate,
       sum(ip.gross_interest) AS total_gross_interest,
       sum(ip.tds_amount) AS total_tds,
       sum(ip.net_amount) AS total_net,
       count(ip.id) AS holder_count
FROM rta.corporate_actions ca
JOIN rta.interest_cycles ic ON ic.corporate_action_id = ca.id
LEFT JOIN rta.interest_payable ip ON ip.corporate_action_id = ca.id
GROUP BY ca.company_id, ca.id, ca.reference_no, ca.fiscal_year,
         ic.period_start, ic.period_end, ic.effective_coupon_rate
WITH NO DATA;
CREATE UNIQUE INDEX ON rta.mv_interest_summary (corporate_action_id);

CREATE MATERIALIZED VIEW rta.mv_corporate_action_summary AS
SELECT company_id, action_type, status, fiscal_year, count(*) AS action_count,
       min(record_date) AS earliest_record_date, max(record_date) AS latest_record_date
FROM rta.corporate_actions
GROUP BY company_id, action_type, status, fiscal_year
WITH NO DATA;
CREATE UNIQUE INDEX ON rta.mv_corporate_action_summary (company_id, action_type, status, fiscal_year);

CREATE MATERIALIZED VIEW rta.mv_company_summary AS
SELECT c.id AS company_id, c.legal_name, c.status,
       count(DISTINCT i.id) AS instrument_count,
       count(DISTINCT f.id) AS folio_count,
       count(DISTINCT ca.id) AS corporate_action_count
FROM rta.companies c
LEFT JOIN rta.instruments i ON i.company_id = c.id
LEFT JOIN rta.folios f ON f.instrument_id = i.id
LEFT JOIN rta.corporate_actions ca ON ca.company_id = c.id
GROUP BY c.id, c.legal_name, c.status
WITH NO DATA;
CREATE UNIQUE INDEX ON rta.mv_company_summary (company_id);

CREATE MATERIALIZED VIEW rta.mv_holder_summary AS
SELECT h.id AS holder_id, h.full_name, h.boid,
       COALESCE(sum(dp.net_amount), 0) AS total_dividend_received,
       COALESCE(sum(ip.net_amount), 0) AS total_interest_received,
       count(DISTINCT f.id) AS folio_count
FROM rta.holders h
LEFT JOIN rta.folios f ON f.primary_holder_id = h.id
LEFT JOIN rta.dividend_payable dp ON dp.holder_id = h.id
LEFT JOIN rta.interest_payable ip ON ip.holder_id = h.id
GROUP BY h.id, h.full_name, h.boid
WITH NO DATA;
CREATE UNIQUE INDEX ON rta.mv_holder_summary (holder_id);

CREATE MATERIALIZED VIEW rta.mv_tax_summary AS
SELECT ca.company_id, ca.action_type, ca.fiscal_year, hc.code AS holder_category,
       sum(dp.tds_amount) AS total_tds
FROM rta.dividend_payable dp
JOIN rta.corporate_actions ca ON ca.id = dp.corporate_action_id
JOIN rta.v_holder_current_category hcm ON hcm.holder_id = dp.holder_id
JOIN rta.holder_categories hc ON hc.id = hcm.holder_category_id
GROUP BY ca.company_id, ca.action_type, ca.fiscal_year, hc.code
WITH NO DATA;
CREATE UNIQUE INDEX ON rta.mv_tax_summary (company_id, action_type, fiscal_year, holder_category);

CREATE MATERIALIZED VIEW rta.mv_payment_summary AS
SELECT pb.company_id, pb.source_module, pb.status,
       count(*) AS batch_count,
       sum(s.total_amount) AS total_amount,
       sum(s.unclaimed_amount) AS total_unclaimed
FROM rta.payment_batches pb
LEFT JOIN rta.payment_batch_summary s ON s.payment_batch_id = pb.id
GROUP BY pb.company_id, pb.source_module, pb.status
WITH NO DATA;
CREATE UNIQUE INDEX ON rta.mv_payment_summary (company_id, source_module, status);

-- Wire refreshes into the existing scheduler (Volume 2) instead of a bespoke
-- cron entry per view.
INSERT INTO rta.scheduled_jobs (job_key, description, cron_expression) VALUES
  ('refresh_dividend_summary', 'REFRESH MATERIALIZED VIEW CONCURRENTLY rta.mv_dividend_summary', '*/15 * * * *'),
  ('refresh_interest_summary', 'REFRESH MATERIALIZED VIEW CONCURRENTLY rta.mv_interest_summary', '*/15 * * * *'),
  ('refresh_corporate_action_summary', 'REFRESH MATERIALIZED VIEW CONCURRENTLY rta.mv_corporate_action_summary', '0 * * * *'),
  ('refresh_company_summary', 'REFRESH MATERIALIZED VIEW CONCURRENTLY rta.mv_company_summary', '0 * * * *'),
  ('refresh_holder_summary', 'REFRESH MATERIALIZED VIEW CONCURRENTLY rta.mv_holder_summary', '0 2 * * *'),
  ('refresh_tax_summary', 'REFRESH MATERIALIZED VIEW CONCURRENTLY rta.mv_tax_summary', '0 2 * * *'),
  ('refresh_payment_summary', 'REFRESH MATERIALIZED VIEW CONCURRENTLY rta.mv_payment_summary', '*/15 * * * *');

-- =============================================================================
-- 36. FINANCIAL AGING
-- =============================================================================

CREATE TABLE rta.aging_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_code   TEXT NOT NULL UNIQUE,     -- '0_30','31_90','91_180','181_365','1_3y','3y_plus'
  display_name  TEXT NOT NULL,
  min_days      INT NOT NULL,
  max_days      INT,                       -- NULL = open-ended
  sort_order    SMALLINT NOT NULL,
  CHECK (max_days IS NULL OR max_days > min_days)
);

CREATE TABLE rta.aging_summary (
  id                BIGSERIAL PRIMARY KEY,
  as_of_date        DATE NOT NULL,
  company_id        UUID NOT NULL REFERENCES rta.companies(id),
  source_module     rta.payable_source_module NOT NULL,
  aging_bucket_id   UUID NOT NULL REFERENCES rta.aging_rules(id),
  unclaimed_count   INT NOT NULL DEFAULT 0,
  unclaimed_amount  NUMERIC(20,4) NOT NULL DEFAULT 0,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (as_of_date, company_id, source_module, aging_bucket_id)
);
CREATE INDEX ON rta.aging_summary (as_of_date, company_id);

-- Buckets unclaimed dividend/interest/redemption amounts as of a given
-- date. Run nightly via scheduled_jobs; UPSERTs so re-running for the same
-- as_of_date is idempotent.
CREATE OR REPLACE FUNCTION rta.fn_compute_aging_summary(p_as_of_date DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO rta.aging_summary (as_of_date, company_id, source_module, aging_bucket_id, unclaimed_count, unclaimed_amount)
  SELECT p_as_of_date, ca.company_id, x.source_module, ar.id,
         count(*), sum(x.net_amount)
  FROM (
    SELECT dp.net_amount, dp.corporate_action_id, dp.unclaimed_since, 'dividend'::rta.payable_source_module AS source_module
      FROM rta.dividend_payable dp WHERE dp.unclaimed_since IS NOT NULL
    UNION ALL
    SELECT ip.net_amount, ip.corporate_action_id, ip.unclaimed_since, 'interest'
      FROM rta.interest_payable ip WHERE ip.unclaimed_since IS NOT NULL
    UNION ALL
    SELECT rp.net_amount, rp.corporate_action_id, rp.unclaimed_since, 'redemption'
      FROM rta.redemption_payable rp WHERE rp.unclaimed_since IS NOT NULL
  ) x
  JOIN rta.corporate_actions ca ON ca.id = x.corporate_action_id
  JOIN rta.aging_rules ar
    ON (p_as_of_date - x.unclaimed_since) >= ar.min_days
   AND (ar.max_days IS NULL OR (p_as_of_date - x.unclaimed_since) <= ar.max_days)
  GROUP BY ca.company_id, x.source_module, ar.id
  ON CONFLICT (as_of_date, company_id, source_module, aging_bucket_id) DO UPDATE SET
    unclaimed_count = EXCLUDED.unclaimed_count,
    unclaimed_amount = EXCLUDED.unclaimed_amount,
    computed_at = now();
END;
$$;

INSERT INTO rta.scheduled_jobs (job_key, description, cron_expression) VALUES
  ('nightly_aging_summary', 'SELECT rta.fn_compute_aging_summary(CURRENT_DATE)', '0 1 * * *');

-- =============================================================================
-- 37. GENERAL LEDGER MAPPING
-- =============================================================================
-- Volume 2's rta.ledger_entries is already the immutable posting record
-- for every financial movement. These tables don't duplicate it — they
-- project it onto GL account codes for ERP export, which is the one piece
-- Volume 2 explicitly deferred ("chart_of_accounts + gl_postings... belongs
-- closer to the GL/billing volume").

CREATE TABLE rta.gl_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code  TEXT NOT NULL UNIQUE,
  account_name  TEXT NOT NULL,
  account_type  TEXT NOT NULL CHECK (account_type IN ('asset','liability','income','expense','equity')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE rta.gl_mapping (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module         rta.payable_source_module NOT NULL,
  company_id            UUID REFERENCES rta.companies(id),   -- NULL = default mapping for all companies
  debit_gl_account_id   UUID NOT NULL REFERENCES rta.gl_accounts(id),
  credit_gl_account_id  UUID NOT NULL REFERENCES rta.gl_accounts(id),
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CHECK (debit_gl_account_id <> credit_gl_account_id)
);
CREATE UNIQUE INDEX one_gl_mapping_per_scope
  ON rta.gl_mapping (source_module, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'), effective_from);

-- One row per (ledger_entries row) x (gl_account it posts to). Composite
-- FK back to ledger_entries because that table is itself partitioned by
-- entry_date (its PK is (id, entry_date), not id alone).
CREATE TABLE rta.gl_transactions (
  id                    BIGSERIAL,
  ledger_entry_id       BIGINT NOT NULL,
  ledger_entry_date     DATE NOT NULL,
  gl_account_id         UUID NOT NULL REFERENCES rta.gl_accounts(id),
  dc_indicator          TEXT NOT NULL CHECK (dc_indicator IN ('debit','credit')),
  amount                NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  posted_by             UUID NOT NULL REFERENCES rta.users(id),
  posted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  export_batch_ref      TEXT,
  exported_at           TIMESTAMPTZ,
  PRIMARY KEY (id, posted_at),
  FOREIGN KEY (ledger_entry_id, ledger_entry_date) REFERENCES rta.ledger_entries (id, entry_date)
) PARTITION BY RANGE (posted_at);

CREATE TABLE rta.gl_transactions_2026_07 PARTITION OF rta.gl_transactions
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE rta.gl_transactions_default PARTITION OF rta.gl_transactions DEFAULT;

CREATE INDEX ON rta.gl_transactions (ledger_entry_id, ledger_entry_date);
CREATE INDEX ON rta.gl_transactions (export_batch_ref) WHERE export_batch_ref IS NOT NULL;
CREATE INDEX ON rta.gl_transactions (gl_account_id, posted_at) WHERE exported_at IS NULL;

-- =============================================================================
-- 38. AUDIT LOG ENRICHMENT
-- =============================================================================
-- Adding columns to a partitioned parent (audit.event_log, Volume 1)
-- propagates to every existing and future partition automatically —
-- verified, this is standard Postgres behavior, not something this
-- migration has to do per-partition.
ALTER TABLE audit.event_log ADD COLUMN changed_columns TEXT[];
ALTER TABLE audit.event_log ADD COLUMN device        TEXT;
ALTER TABLE audit.event_log ADD COLUMN browser        TEXT;
ALTER TABLE audit.event_log ADD COLUMN api_source     TEXT;
ALTER TABLE audit.event_log ADD COLUMN workflow_step  TEXT;
ALTER TABLE audit.event_log ADD COLUMN approval_level TEXT;

-- HONEST LIMITATION: `device` and `browser` cannot be reliably derived
-- from a raw User-Agent string in plain SQL — that needs a real UA-parser
-- library (ua-parser, etc.) at the application layer. What this migration
-- CAN do is capture whatever the app already resolved, via session
-- variables the app sets per request (app.device_type, app.browser_name),
-- and — new in this version — automatically diff OLD vs NEW to populate
-- changed_columns, which is a real SQL-computable fact, not a proxy.
CREATE OR REPLACE FUNCTION audit.fn_capture_change() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor UUID   := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
  v_role  rta.user_role := NULLIF(current_setting('app.current_user_role', TRUE), '')::rta.user_role;
  v_sess  UUID   := NULLIF(current_setting('app.session_id', TRUE), '')::UUID;
  v_req   UUID   := NULLIF(current_setting('app.request_id', TRUE), '')::UUID;
  v_ip    INET   := NULLIF(current_setting('app.client_ip', TRUE), '')::INET;
  v_device TEXT  := NULLIF(current_setting('app.device_type', TRUE), '');
  v_browser TEXT := NULLIF(current_setting('app.browser_name', TRUE), '');
  v_api    TEXT  := NULLIF(current_setting('app.api_source', TRUE), '');
  v_wstep  TEXT  := NULLIF(current_setting('app.workflow_step', TRUE), '');
  v_approval TEXT := NULLIF(current_setting('app.approval_level', TRUE), '');
  v_pk    TEXT;
  v_row   JSONB := to_jsonb(COALESCE(NEW, OLD));
  v_changed TEXT[];
BEGIN
  SELECT string_agg(v_row ->> a.attname, '|' ORDER BY k.ord)
    INTO v_pk
  FROM pg_index i
  JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
  WHERE i.indrelid = TG_RELID AND i.indisprimary;
  v_pk := COALESCE(v_pk, v_row ->> 'id', 'unknown');

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key) INTO v_changed
    FROM jsonb_each(to_jsonb(NEW)) n(key, value)
    JOIN jsonb_each(to_jsonb(OLD)) o(key, value) USING (key)
    WHERE n.value IS DISTINCT FROM o.value;
  END IF;

  INSERT INTO audit.event_log
    (actor_user_id, actor_role, session_id, ip_address, action_kind,
     entity_schema, entity_table, entity_pk, before_value, after_value, request_id,
     changed_columns, device, browser, api_source, workflow_step, approval_level)
  VALUES
    (v_actor, v_role, v_sess, v_ip,
     CASE TG_OP WHEN 'INSERT' THEN 'insert'
                WHEN 'UPDATE' THEN 'update'
                WHEN 'DELETE' THEN 'delete' END::audit.action_kind,
     TG_TABLE_SCHEMA, TG_TABLE_NAME, v_pk,
     CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
     CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
     v_req, v_changed, v_device, v_browser, v_api, v_wstep, v_approval);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- 39. PERFORMANCE FOLLOW-UP
-- =============================================================================
-- Re-verified via catalog query after building everything above: every FK
-- introduced in this file is covered by the generic auto-indexer from
-- Volume 2 §25a (re-run below). What that loop does NOT catch is
-- non-FK columns that are still searched constantly — bank reference
-- lookups across the three payable tables and payment_batch_items, which
-- aren't FKs (a bank reference is an external string, not a link to
-- another table in this schema) but are exactly what a reconciliation
-- clerk searches by.
CREATE INDEX ON rta.dividend_payable   (bank_txn_ref) WHERE bank_txn_ref IS NOT NULL;
CREATE INDEX ON rta.interest_payable   (bank_txn_ref) WHERE bank_txn_ref IS NOT NULL;
CREATE INDEX ON rta.redemption_payable (bank_txn_ref) WHERE bank_txn_ref IS NOT NULL;
CREATE INDEX ON rta.payment_batch_items (bank_txn_ref) WHERE bank_txn_ref IS NOT NULL;

DO $$
DECLARE
  r RECORD;
  v_idx_name TEXT;
BEGIN
  FOR r IN
    SELECT
      con.conrelid::regclass::text AS tbl_qualified,
      con.conrelid AS relid,
      a.attname AS col,
      c.relname AS tbl_bare
    FROM pg_constraint con
    JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
    JOIN pg_class c ON c.oid = con.conrelid
    WHERE con.contype = 'f'
      AND con.connamespace = 'rta'::regnamespace
      AND k.ord = 1
      AND c.relkind IN ('r','p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = con.conrelid AND i.indkey[0] = a.attnum
      )
  LOOP
    v_idx_name := left('idx_fk_' || r.tbl_bare || '_' || r.col, 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%I)', v_idx_name, r.tbl_qualified, r.col);
  END LOOP;
END $$;

-- =============================================================================
-- 40. SECURITY: SOFT DELETE, updated_at, RLS, AUDIT WIRING FOR NEW TABLES
-- =============================================================================

ALTER TABLE rta.payment_lots      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE rta.tds_rules         ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE rta.holder_categories ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['payment_lots','tds_rules','holder_categories'] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON rta.%1$I
         FOR EACH ROW EXECUTE FUNCTION rta.fn_touch_updated_at();', t);
  END LOOP;
END $$;

ALTER TABLE rta.tds_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rta.tds_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY tds_rules_company_scope ON rta.tds_rules
  USING (company_id IS NULL OR rta.fn_current_user_has_company(company_id));

ALTER TABLE rta.payment_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rta.payment_lots FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_lots_company_scope ON rta.payment_lots
  USING (rta.fn_current_user_has_company(company_id));

ALTER TABLE rta.gl_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE rta.gl_mapping FORCE ROW LEVEL SECURITY;
CREATE POLICY gl_mapping_company_scope ON rta.gl_mapping
  USING (company_id IS NULL OR rta.fn_current_user_has_company(company_id));

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'holder_categories','holder_category_mapping',
    'tds_rules','tds_rule_history',
    'payment_lots','payment_batch_summary',
    'reconciliation_items','bank_response_files',
    'calculation_runs','calculation_details',
    'formula_versions',
    'aging_rules','aging_summary',
    'gl_accounts','gl_mapping','gl_transactions'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON rta.%1$s
         FOR EACH ROW EXECUTE FUNCTION audit.fn_capture_change();', t);
  END LOOP;
END $$;

-- =============================================================================
-- SEED DATA FOR LOOKUP TABLES
-- =============================================================================

INSERT INTO rta.holder_categories (code, display_name, is_tax_exempt_default, created_by) VALUES
  ('individual',       'Individual',         FALSE, '00000000-0000-0000-0000-000000000001'),
  ('institution',      'Institution',        FALSE, '00000000-0000-0000-0000-000000000001'),
  ('mutual_fund',      'Mutual Fund',        FALSE, '00000000-0000-0000-0000-000000000001'),
  ('retirement_fund',  'Retirement Fund',    TRUE,  '00000000-0000-0000-0000-000000000001'),
  ('government',       'Government',         TRUE,  '00000000-0000-0000-0000-000000000001'),
  ('insurance',        'Insurance',          FALSE, '00000000-0000-0000-0000-000000000001'),
  ('bank',             'Bank',               FALSE, '00000000-0000-0000-0000-000000000001'),
  ('corporate',        'Corporate',          FALSE, '00000000-0000-0000-0000-000000000001'),
  ('tax_exempt',       'Tax Exempt',         TRUE,  '00000000-0000-0000-0000-000000000001'),
  ('foreign_investor', 'Foreign Investor',   FALSE, '00000000-0000-0000-0000-000000000001'),
  ('employee',         'Employee',           FALSE, '00000000-0000-0000-0000-000000000001'),
  ('promoter',         'Promoter',           FALSE, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;
-- NOTE: seed rows reference a fixed system-user UUID
-- ('00000000-...0001') as a placeholder for "run by the migration user" —
-- swap for your actual seeded system-administrator id, or run this INSERT
-- from the application after Volume 1's first admin user exists.

INSERT INTO rta.aging_rules (bucket_code, display_name, min_days, max_days, sort_order) VALUES
  ('0_30',    '0-30 Days',    0,   30,   1),
  ('31_90',   '31-90 Days',   31,  90,   2),
  ('91_180',  '91-180 Days',  91,  180,  3),
  ('181_365', '181-365 Days', 181, 365,  4),
  ('1_3y',    '1-3 Years',    366, 1095, 5),
  ('3y_plus', '3+ Years',     1096, NULL, 6)
ON CONFLICT (bucket_code) DO NOTHING;

INSERT INTO rta.formula_versions (formula_name, version, description, effective_date, status, created_by) VALUES
  ('dividend_gross_calc',   1, 'gross = units_snapshot * paid_up_value * cash_rate_pct', '2026-01-01', 'active', '00000000-0000-0000-0000-000000000001'),
  ('interest_accrual_calc', 1, 'gross = face_value * coupon_rate * holding_days / day_count_denominator', '2026-01-01', 'active', '00000000-0000-0000-0000-000000000001'),
  ('tds_calc',              1, 'tds = gross * (tax_pct + surcharge_pct), unless is_exempt', '2026-01-01', 'active', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (formula_name, version) DO NOTHING;

INSERT INTO rta.gl_accounts (account_code, account_name, account_type) VALUES
  ('2100', 'Dividend Payable',   'liability'),
  ('2110', 'Interest Payable',   'liability'),
  ('2120', 'Redemption Payable', 'liability'),
  ('2200', 'TDS Payable',        'liability'),
  ('1000', 'Bank - Disbursement Account', 'asset'),
  ('5100', 'Unclaimed Dividend', 'liability'),
  ('5110', 'Unclaimed Interest', 'liability')
ON CONFLICT (account_code) DO NOTHING;

-- Sample TDS rules matching the SRS example (Public 5% / Institution 15% /
-- Tax Exempt 0% on dividend) — replace/extend per actual Finance Act rates.
INSERT INTO rta.tds_rules (action_type, holder_category_id, tax_pct, effective_from, created_by)
SELECT 'cash_dividend'::rta.action_type, id, 5.0, '2026-01-01'::DATE, '00000000-0000-0000-0000-000000000001'::UUID
FROM rta.holder_categories WHERE code = 'individual'
UNION ALL
SELECT 'cash_dividend'::rta.action_type, id, 15.0, '2026-01-01'::DATE, '00000000-0000-0000-0000-000000000001'::UUID
FROM rta.holder_categories WHERE code = 'institution'
UNION ALL
SELECT 'cash_dividend'::rta.action_type, id, 0.0, '2026-01-01'::DATE, '00000000-0000-0000-0000-000000000001'::UUID
FROM rta.holder_categories WHERE code = 'tax_exempt';
-- =============================================================================
-- 41. CRITICAL FIX — DEFAULT PARTITIONS
-- =============================================================================
-- Reproduced during review: inserting a row outside the pre-created
-- monthly partition raised "no partition of relation found for row" on
-- BOTH audit.event_log and rta.api_logs. Because almost every table in
-- this schema has an audit trigger, a missed "create next month's
-- partition" scheduler run would have hard-failed every write in the
-- system the moment the calendar rolled over — not a cosmetic gap.
-- ledger_entries / notification_queue / notification_logs / calculation_
-- details / gl_transactions / reconciliation_items already had a DEFAULT
-- partition as a safety net; these two didn't. Fixed by giving them one
-- too. The DEFAULT partition is a safety net, not a substitute for
-- cutting real monthly partitions — rows that land in DEFAULT should be
-- migrated into a proper dated partition by the scheduled job seeded in
-- §45, since DEFAULT partitions can't be split without moving data out
-- first.

CREATE TABLE audit.event_log_default PARTITION OF audit.event_log DEFAULT;
CREATE TABLE rta.api_logs_default PARTITION OF rta.api_logs DEFAULT;

-- =============================================================================
-- 42a. FIX: fn_capture_version (Volume 2) silently required app.current_
-- user_id to be set for EVERY update to rta.holders/rta.companies, and
-- failed with a bare "null value in column changed_by" constraint error
-- when it wasn't — reproduced during testing. Same fix pattern as
-- fn_touch_and_lock above: fail loudly and specifically instead of
-- cryptically.
-- =============================================================================

CREATE OR REPLACE FUNCTION rta.fn_capture_version() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  v_table   TEXT := TG_ARGV[0];
  v_fk_col  TEXT := TG_ARGV[1];
  v_next    INT;
  v_actor   UUID;
BEGIN
  v_actor := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION
      'app.current_user_id session variable must be set before updating rta.%I (run SET LOCAL app.current_user_id = ''<uuid>'' at the start of the transaction)',
      TG_TABLE_NAME
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  EXECUTE format(
    'SELECT COALESCE(MAX(version_no),0)+1 FROM rta.%I WHERE %I = $1',
    v_table, v_fk_col) INTO v_next USING OLD.id;
  EXECUTE format(
    'INSERT INTO rta.%I (%I, version_no, data_snapshot, changed_by, change_reason)
     VALUES ($1,$2,$3,$4,current_setting(''app.change_reason'', TRUE))',
    v_table, v_fk_col)
    USING OLD.id, v_next, to_jsonb(OLD), v_actor;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 42. OPTIMISTIC LOCKING + FULL AUDIT COLUMNS ON MUTABLE ENTITIES
-- =============================================================================

-- version bump happens on every UPDATE alongside updated_at/updated_by;
-- callers do `UPDATE ... SET ... WHERE id = $1 AND version = $2` and treat
-- 0 rows affected as a lost-update conflict.
CREATE OR REPLACE FUNCTION rta.fn_touch_and_lock() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
  NEW.version    := OLD.version + 1;
  RETURN NEW;
END;
$$;

-- Helper so the ALTER/TRIGGER wiring below doesn't repeat five lines per
-- table. Adds any of the 8 columns that are genuinely missing (some
-- tables already have some of them from Volume 2/3) and wires the
-- version trigger, skipping tables that already have one.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'holders','companies','folios','instruments',
    'holder_bank_accounts','holder_nominees',
    'corporate_actions','service_requests','debenture_issues',
    'documents','document_types',
    'payment_batches','payment_lots',
    'workflow_instances','workflow_definitions',
    'tds_rules','tds_configuration','holder_categories',
    'sla_rules','scheduled_jobs','api_clients',
    'report_templates','dashboard_widgets',
    'notification_templates',
    'holdings','share_certificates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- created_by: several already have it (drafted_by/started_by/etc. is
    -- NOT the same thing and is left as-is); add a generic created_by
    -- only where genuinely absent.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='rta' AND table_name=t AND column_name='created_by') THEN
      EXECUTE format('ALTER TABLE rta.%I ADD COLUMN created_by UUID REFERENCES rta.users(id)', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='rta' AND table_name=t AND column_name='updated_at') THEN
      EXECUTE format('ALTER TABLE rta.%I ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='rta' AND table_name=t AND column_name='updated_by') THEN
      EXECUTE format('ALTER TABLE rta.%I ADD COLUMN updated_by UUID REFERENCES rta.users(id)', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='rta' AND table_name=t AND column_name='is_deleted') THEN
      EXECUTE format('ALTER TABLE rta.%I ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='rta' AND table_name=t AND column_name='deleted_by') THEN
      EXECUTE format('ALTER TABLE rta.%I ADD COLUMN deleted_by UUID REFERENCES rta.users(id)', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='rta' AND table_name=t AND column_name='deleted_at') THEN
      EXECUTE format('ALTER TABLE rta.%I ADD COLUMN deleted_at TIMESTAMPTZ', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='rta' AND table_name=t AND column_name='version') THEN
      EXECUTE format('ALTER TABLE rta.%I ADD COLUMN version INT NOT NULL DEFAULT 1', t);
    END IF;
    -- Replace any pre-existing plain fn_touch_updated_at trigger with the
    -- version-aware one so we don't double-fire two BEFORE UPDATE triggers.
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON rta.%I', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_and_lock ON rta.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_touch_and_lock BEFORE UPDATE ON rta.%I
         FOR EACH ROW EXECUTE FUNCTION rta.fn_touch_and_lock()', t);
    -- Partial index so "list active X" stays cheap on every retrofitted
    -- table. Uses the table's actual primary key column rather than
    -- assuming "id" (rta.holdings, for example, is keyed on folio_id).
    DECLARE
      v_pk_col TEXT;
    BEGIN
      SELECT a.attname INTO v_pk_col
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = format('rta.%I', t)::regclass AND i.indisprimary
      LIMIT 1;
      IF v_pk_col IS NOT NULL THEN
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS idx_%1$s_active ON rta.%1$I (%2$I) WHERE NOT is_deleted', t, v_pk_col);
      END IF;
    END;
  END LOOP;
END $$;

-- NOT retrofitted, on purpose (append-only by design — see the note at
-- the top of this file): rta.dividend_payable, rta.interest_payable,
-- rta.redemption_payable, rta.ledger_entries, rta.workflow_history,
-- rta.approval_history, rta.notification_logs, rta.notification_queue,
-- rta.api_logs, rta.calculation_details, rta.calculation_runs,
-- rta.gl_transactions, rta.sla_events, rta.document_access_logs,
-- rta.import_rows, rta.import_errors, rta.system_events,
-- rta.job_history, rta.holding_movements, rta.action_snapshots,
-- rta.archived_records, audit.event_log. Adding version/updated_at to
-- these would invite exactly the in-place edits immutability exists to
-- prevent.

-- =============================================================================
-- 43. IMMUTABILITY ENFORCEMENT ON FINANCIAL PAYABLE TABLES
-- =============================================================================
-- Volume 1 already models corrections as a new row pointing back via
-- reversed_by_id rather than editing the original — but nothing stopped
-- someone from UPDATEing gross_amount/tds_amount/net_amount directly.
-- This trigger makes that a hard error: only the bank-status/response
-- columns (the legitimate lifecycle of a payment) may change after a
-- payable row is inserted. Any correction to the money itself must be a
-- new row + a reversal link, so audit.event_log's history is always the
-- complete story, never a value silently overwritten.

CREATE OR REPLACE FUNCTION rta.fn_enforce_payable_amount_immutability() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.gross_amount IS DISTINCT FROM OLD.gross_amount
     OR NEW.tds_amount IS DISTINCT FROM OLD.tds_amount
     OR NEW.net_amount IS DISTINCT FROM OLD.net_amount
     OR NEW.units IS DISTINCT FROM OLD.units
  THEN
    RAISE EXCEPTION
      'Financial amount columns on % are immutable once posted (id=%). Post a reversal row via reversed_by_id instead of editing amounts in place.',
      TG_TABLE_NAME, OLD.id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_immutable_amounts_dividend BEFORE UPDATE ON rta.dividend_payable
  FOR EACH ROW EXECUTE FUNCTION rta.fn_enforce_payable_amount_immutability();
CREATE TRIGGER trg_immutable_amounts_interest BEFORE UPDATE ON rta.interest_payable
  FOR EACH ROW EXECUTE FUNCTION rta.fn_enforce_payable_amount_immutability();
CREATE TRIGGER trg_immutable_amounts_redemption BEFORE UPDATE ON rta.redemption_payable
  FOR EACH ROW EXECUTE FUNCTION rta.fn_enforce_payable_amount_immutability();

-- ledger_entries needs the same guarantee but has no bank-status column
-- to except — nothing on a posted ledger row should ever change.
CREATE OR REPLACE FUNCTION rta.fn_enforce_ledger_immutability() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'rta.ledger_entries is append-only (id=%). Post a reversing entry via reversal_of_id instead of updating.', OLD.id
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
CREATE TRIGGER trg_immutable_ledger BEFORE UPDATE ON rta.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION rta.fn_enforce_ledger_immutability();

-- =============================================================================
-- 44. BUSINESS CALENDAR — WORKING DAYS ON TOP OF holiday_calendar
-- =============================================================================
-- rta.holiday_calendar (Volume 2) already holds the non-working dates;
-- rta.financial_year (Volume 2) already IS the financial_calendar this
-- point asks for. What was missing is the actual "is this a working day /
-- what's N working days from here" logic every payment-date, interest-
-- accrual, and SLA-due-date calculation needs — added here as functions
-- rather than a materialised "working_days" table, since a table would
-- just be every calendar date minus holidays minus weekends: derivable,
-- not a fact to store and risk drifting out of sync with holiday_calendar.

CREATE OR REPLACE FUNCTION rta.fn_is_working_day(p_date DATE, p_calendar TEXT DEFAULT 'all')
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  -- Nepal's weekend is Saturday; adjust if a different market calendar is added.
  SELECT EXTRACT(ISODOW FROM p_date) <> 6
     AND NOT EXISTS (
       SELECT 1 FROM rta.holiday_calendar h
       WHERE h.holiday_date = p_date AND h.applies_to IN ('all', p_calendar)
     );
$$;

CREATE OR REPLACE FUNCTION rta.fn_add_working_days(p_start DATE, p_days INT, p_calendar TEXT DEFAULT 'all')
RETURNS DATE LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_date DATE := p_start;
  v_remaining INT := p_days;
BEGIN
  IF p_days = 0 THEN RETURN p_start; END IF;
  WHILE v_remaining > 0 LOOP
    v_date := v_date + 1;
    IF rta.fn_is_working_day(v_date, p_calendar) THEN
      v_remaining := v_remaining - 1;
    END IF;
  END LOOP;
  RETURN v_date;
END;
$$;

-- Used by SLA due-date calc (§17) instead of naively adding sla_hours/24
-- calendar days, so a 3-day SLA declared on a Friday doesn't quietly
-- become "counts Saturday".
CREATE OR REPLACE FUNCTION rta.fn_sla_due_at(p_started_at TIMESTAMPTZ, p_sla_hours INT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_days  INT := p_sla_hours / 24;
  v_hours INT := p_sla_hours % 24;
  v_due_date DATE;
BEGIN
  v_due_date := rta.fn_add_working_days(p_started_at::DATE, v_days);
  RETURN v_due_date + p_started_at::TIME + (v_hours || ' hours')::INTERVAL;
END;
$$;

-- =============================================================================
-- 45. NUMBERING SEQUENCE SEED DATA
-- =============================================================================
-- rta.numbering_sequences + fn_next_sequence() (Volume 2) were defined but
-- never actually seeded with the sequences the SRS names — an empty
-- config table that every module needs a row in before its first
-- reference number can be generated. Seeded here; each module calls
-- rta.fn_next_sequence('folio_no'), etc.

INSERT INTO rta.numbering_sequences (sequence_key, prefix, padding, reset_frequency) VALUES
  ('folio_no',              'FOL',  6, 'never'),
  ('certificate_no',        'CERT', 6, 'never'),
  ('dividend_cycle_no',     'DIV',  4, 'yearly'),
  ('interest_cycle_no',     'INT',  4, 'yearly'),
  ('payment_batch_no',      'PAY',  6, 'monthly'),
  ('service_request_no',    'SR',   6, 'yearly'),
  ('corporate_action_no',   'CA',   4, 'yearly')
ON CONFLICT (sequence_key) DO NOTHING;

-- fn_next_sequence() bumps current_value but never resets it — add the
-- reset step the reset_frequency column already declared but nothing
-- enforced. Called by the same scheduled job that cuts new partitions.
CREATE OR REPLACE FUNCTION rta.fn_reset_due_sequences() RETURNS void
  LANGUAGE plpgsql AS $$
BEGIN
  UPDATE rta.numbering_sequences
     SET current_value = 0, last_reset_at = CURRENT_DATE
   WHERE reset_frequency = 'yearly'
     AND (last_reset_at IS NULL OR date_trunc('year', last_reset_at) <> date_trunc('year', CURRENT_DATE));
  UPDATE rta.numbering_sequences
     SET current_value = 0, last_reset_at = CURRENT_DATE
   WHERE reset_frequency = 'monthly'
     AND (last_reset_at IS NULL OR date_trunc('month', last_reset_at) <> date_trunc('month', CURRENT_DATE));
END;
$$;

INSERT INTO rta.scheduled_jobs (job_key, description, cron_expression) VALUES
  ('reset_due_numbering_sequences', 'Resets yearly/monthly numbering sequences (calls rta.fn_reset_due_sequences)', '5 0 1 * *'),
  ('create_next_month_partitions', 'Creates next month''s partition on every RANGE-partitioned table before the current one runs out; migrates any rows that landed in a DEFAULT partition into a proper dated one', '0 0 25 * *')
ON CONFLICT (job_key) DO NOTHING;

-- =============================================================================
-- 46. EXCHANGE RATES (multi-currency future-proofing)
-- =============================================================================
-- rta.ledger_entries already carries a `currency` column (Volume 2) with
-- no rate table behind it — a latent inconsistency this closes. Simple
-- daily rate-to-base-currency table; a foreign-investor dividend or a
-- USD-denominated debenture converts through this rather than a
-- hardcoded rate in application code.

CREATE TABLE rta.exchange_rates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code     CHAR(3) NOT NULL REFERENCES rta.currencies(code),
  rate_date         DATE NOT NULL,
  rate_to_base      NUMERIC(18,8) NOT NULL CHECK (rate_to_base > 0),
  base_currency     CHAR(3) NOT NULL DEFAULT 'NPR' REFERENCES rta.currencies(code),
  source            TEXT NOT NULL DEFAULT 'NRB',    -- Nepal Rastra Bank reference rate, or manual
  created_by        UUID NOT NULL REFERENCES rta.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (currency_code, base_currency, rate_date)
);
CREATE INDEX ON rta.exchange_rates (currency_code, rate_date DESC);

CREATE TRIGGER trg_audit_exchange_rates AFTER INSERT OR UPDATE OR DELETE ON rta.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION audit.fn_capture_change();

-- =============================================================================
-- 47. CORE CALCULATION / POSTING / RECONCILIATION FUNCTIONS
-- =============================================================================

-- --- 47a. Snapshot generation --------------------------------------------
-- Freezes the holder register for a corporate action as of its record
-- date. Idempotent (ON CONFLICT DO NOTHING against the existing
-- (corporate_action_id, folio_id) UNIQUE constraint) so re-running after
-- a partial failure doesn't double-freeze. Only 'active' folios with a
-- positive balance are snapshotted, matching the SRS rule that the
-- register freezes exactly once, at Record Date, never off live holdings.
CREATE OR REPLACE FUNCTION rta.fn_generate_holder_snapshot(p_corporate_action_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_count INT;
  v_instrument_id UUID;
BEGIN
  SELECT instrument_id INTO v_instrument_id
  FROM rta.corporate_actions WHERE id = p_corporate_action_id;

  IF v_instrument_id IS NULL THEN
    RAISE EXCEPTION 'Corporate action % not found', p_corporate_action_id;
  END IF;

  INSERT INTO rta.action_snapshots
    (corporate_action_id, folio_id, primary_holder_id, units_snapshot,
     units_lockin_snapshot, units_frozen_snapshot, bank_account_id, kyc_status_snapshot)
  SELECT
    p_corporate_action_id,
    f.id,
    f.primary_holder_id,
    h.units_total,
    h.units_locked_in,
    h.units_frozen,
    ba.id,
    hd.kyc_status
  FROM rta.folios f
  JOIN rta.holdings h ON h.folio_id = f.id
  JOIN rta.holders hd ON hd.id = f.primary_holder_id
  LEFT JOIN LATERAL (
    SELECT id FROM rta.holder_bank_accounts
    WHERE holder_id = f.primary_holder_id AND is_primary AND is_active AND NOT is_deleted
    LIMIT 1
  ) ba ON TRUE
  WHERE f.instrument_id = v_instrument_id
    AND f.status = 'active'
    AND h.units_total > 0
  ON CONFLICT (corporate_action_id, folio_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO rta.system_events (event_type, severity, payload)
  VALUES ('background_job', 'info',
          jsonb_build_object('job','fn_generate_holder_snapshot',
                              'corporate_action_id', p_corporate_action_id,
                              'folios_snapshotted', v_count));
  RETURN v_count;
END;
$$;

-- --- 47b. Dividend computation --------------------------------------------
-- Reads the frozen snapshot + the dividend_cycles rate/bonus parameters +
-- rta.fn_resolve_tds_rate (Volume 3) for the per-holder TDS rate, and
-- posts one dividend_payable row per snapshotted folio. Does not touch
-- bank disbursement (that's the payment engine, §13) or ledger posting
-- (kept separate — see fn_post_ledger_entry below — so a recompute before
-- approval doesn't also duplicate GL postings).
-- Flags any dividend_payable row on this corporate action whose holder
-- category had no matching row in tds_rules or the legacy tds_configuration
-- fallback — those rows were defaulted to 0% TDS in fn_compute_dividend,
-- which is a compliance risk if left unnoticed, not a legitimate exemption.
CREATE OR REPLACE FUNCTION rta.fn_flag_unresolved_tds_rates(p_corporate_action_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_action rta.corporate_actions%ROWTYPE;
  v_unresolved INT;
BEGIN
  SELECT * INTO v_action FROM rta.corporate_actions WHERE id = p_corporate_action_id;

  SELECT count(*) INTO v_unresolved
  FROM rta.dividend_payable dp
  JOIN rta.instruments i ON i.id = v_action.instrument_id
  LEFT JOIN rta.holder_category_mapping m
    ON m.holder_id = dp.holder_id AND m.effective_to IS NULL
  WHERE dp.corporate_action_id = p_corporate_action_id
    AND dp.tds_rate = 0
    AND dp.gross_amount > 0
    AND NOT EXISTS (
      SELECT 1 FROM rta.fn_resolve_tds_rate(
        v_action.company_id, i.instrument_type, v_action.action_type,
        m.holder_category_id, v_action.record_date) r
      WHERE r.is_exempt   -- 0% is only legitimate if it came from an explicit exemption
    );

  IF v_unresolved > 0 THEN
    INSERT INTO rta.system_events (event_type, severity, payload)
    VALUES ('background_job', 'warning',
            jsonb_build_object('job','fn_compute_dividend',
                                'corporate_action_id', p_corporate_action_id,
                                'issue','tds_rate_defaulted_to_zero_no_matching_rule',
                                'affected_rows', v_unresolved));
  END IF;
  RETURN v_unresolved;
END;
$$;

CREATE OR REPLACE FUNCTION rta.fn_compute_dividend(p_corporate_action_id UUID, p_computed_by UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_count INT;
  v_cycle rta.dividend_cycles%ROWTYPE;
  v_action rta.corporate_actions%ROWTYPE;
BEGIN
  SELECT * INTO v_action FROM rta.corporate_actions WHERE id = p_corporate_action_id;
  SELECT * INTO v_cycle FROM rta.dividend_cycles WHERE corporate_action_id = p_corporate_action_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No dividend_cycles row for corporate action %', p_corporate_action_id;
  END IF;

  INSERT INTO rta.dividend_payable
    (corporate_action_id, snapshot_id, holder_id, folio_id, units, gross_amount,
     tds_rate, tds_amount, net_amount, bonus_units_issued, bank_account_id)
  SELECT
    p_corporate_action_id,
    s.id,
    s.primary_holder_id,
    s.folio_id,
    s.units_snapshot,
    ROUND(s.units_snapshot * v_cycle.cash_rate_pct / 100.0, 4)                          AS gross_amount,
    COALESCE(v_rate.effective_rate_pct, 0)                                              AS tds_rate,
    ROUND(ROUND(s.units_snapshot * v_cycle.cash_rate_pct / 100.0, 4)
          * COALESCE(v_rate.effective_rate_pct, 0) / 100.0, 4)                          AS tds_amount,
    ROUND(s.units_snapshot * v_cycle.cash_rate_pct / 100.0, 4)
      - ROUND(ROUND(s.units_snapshot * v_cycle.cash_rate_pct / 100.0, 4)
              * COALESCE(v_rate.effective_rate_pct, 0) / 100.0, 4)                       AS net_amount,
    CASE WHEN v_cycle.bonus_ratio_num IS NOT NULL
         THEN FLOOR(s.units_snapshot * v_cycle.bonus_ratio_num / v_cycle.bonus_ratio_den)
         ELSE 0 END                                                                     AS bonus_units_issued,
    s.bank_account_id
  FROM rta.action_snapshots s
  JOIN rta.instruments i ON i.id = v_action.instrument_id
  LEFT JOIN rta.holder_category_mapping m
    ON m.holder_id = s.primary_holder_id AND m.effective_to IS NULL
  LEFT JOIN LATERAL (
    SELECT CASE WHEN r.is_exempt THEN 0 ELSE COALESCE(r.tax_pct,0) + COALESCE(r.surcharge_pct,0) END
           AS effective_rate_pct
    FROM rta.fn_resolve_tds_rate(v_action.company_id, i.instrument_type,
                                  v_action.action_type, m.holder_category_id,
                                  v_action.record_date) r
    LIMIT 1
  ) v_rate ON TRUE
  WHERE s.corporate_action_id = p_corporate_action_id
  ON CONFLICT (corporate_action_id, folio_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Defaulting an unconfigured holder category to 0% TDS is a silent
  -- understatement of tax withheld, not a safe fallback — surface it as
  -- a warning event so Finance adds the missing tds_rules row instead of
  -- an incorrect dividend cycle quietly going to disbursement.
  PERFORM rta.fn_flag_unresolved_tds_rates(p_corporate_action_id);

  UPDATE rta.dividend_cycles dc SET
    gross_computed = (SELECT COALESCE(SUM(gross_amount),0) FROM rta.dividend_payable WHERE corporate_action_id = p_corporate_action_id),
    tds_total       = (SELECT COALESCE(SUM(tds_amount),0)   FROM rta.dividend_payable WHERE corporate_action_id = p_corporate_action_id),
    net_disbursed   = (SELECT COALESCE(SUM(net_amount),0)   FROM rta.dividend_payable WHERE corporate_action_id = p_corporate_action_id)
  WHERE dc.corporate_action_id = p_corporate_action_id;

  UPDATE rta.corporate_actions
     SET status = 'computed', computed_by = p_computed_by, computed_at = now()
   WHERE id = p_corporate_action_id;

  RETURN v_count;
END;
$$;

-- --- 47c. Ledger posting --------------------------------------------------
-- Generic double-entry-flavoured posting helper every module calls
-- instead of INSERTing into ledger_entries directly, so the debit/credit
-- discipline (§19's CHECK constraints) is enforced through one code path.
CREATE OR REPLACE FUNCTION rta.fn_post_ledger_entry(
  p_entry_date      DATE,
  p_company_id      UUID,
  p_holder_id       UUID,
  p_folio_id        UUID,
  p_source_module   rta.payable_source_module,
  p_source_table    TEXT,
  p_source_id       TEXT,
  p_debit_amount    NUMERIC,
  p_credit_amount   NUMERIC,
  p_narration       TEXT,
  p_posted_by       UUID
) RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO rta.ledger_entries
    (entry_date, company_id, holder_id, folio_id, source_module, source_table,
     source_id, debit_amount, credit_amount, narration, posted_by)
  VALUES
    (p_entry_date, p_company_id, p_holder_id, p_folio_id, p_source_module, p_source_table,
     p_source_id, COALESCE(p_debit_amount,0), COALESCE(p_credit_amount,0), p_narration, p_posted_by)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- --- 47d. Bank reconciliation matching -------------------------------------
-- Matches a bank_responses.raw_payload (expected shape: a JSON array of
-- {source_id, status, bank_txn_ref, response_code} objects, one per line
-- in the bank's response file) against payment_batch_items, updates each
-- item's status, and writes the batch-level bank_reconciliation summary.
CREATE OR REPLACE FUNCTION rta.fn_reconcile_bank_response(p_bank_response_id UUID, p_reconciled_by UUID)
RETURNS TABLE(matched_count INT, unmatched_count INT) LANGUAGE plpgsql AS $$
DECLARE
  v_batch_id UUID;
  v_matched INT := 0;
  v_unmatched INT := 0;
  v_rec RECORD;
  v_reconciled_amount NUMERIC(20,4) := 0;
  v_total_amount NUMERIC(20,4);
BEGIN
  SELECT payment_batch_id INTO v_batch_id FROM rta.bank_responses WHERE id = p_bank_response_id;
  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION 'bank_response % not found', p_bank_response_id;
  END IF;

  FOR v_rec IN
    SELECT (line->>'source_id')::TEXT AS source_id,
           (line->>'status')::TEXT AS bank_status,
           (line->>'bank_txn_ref')::TEXT AS bank_txn_ref,
           (line->>'response_code')::TEXT AS response_code
    FROM rta.bank_responses, jsonb_array_elements(raw_payload) AS line
    WHERE id = p_bank_response_id
  LOOP
    UPDATE rta.payment_batch_items
       SET status = CASE WHEN v_rec.bank_status = 'success' THEN 'paid'::rta.payable_bank_status
                          ELSE 'returned'::rta.payable_bank_status END,
           bank_txn_ref = v_rec.bank_txn_ref,
           bank_response_code = v_rec.response_code,
           bank_response_at = now()
     WHERE payment_batch_id = v_batch_id AND source_id = v_rec.source_id;
    IF FOUND THEN
      v_matched := v_matched + 1;
      IF v_rec.bank_status = 'success' THEN
        SELECT amount INTO v_total_amount FROM rta.payment_batch_items
         WHERE payment_batch_id = v_batch_id AND source_id = v_rec.source_id;
        v_reconciled_amount := v_reconciled_amount + COALESCE(v_total_amount, 0);
      ELSE
        INSERT INTO rta.payment_returns (payment_batch_item_id, return_reason)
        SELECT id, COALESCE(v_rec.response_code, 'bank_returned')
        FROM rta.payment_batch_items
        WHERE payment_batch_id = v_batch_id AND source_id = v_rec.source_id;
      END IF;
    ELSE
      v_unmatched := v_unmatched + 1;
    END IF;
  END LOOP;

  UPDATE rta.bank_responses SET processed_at = now(), processed_by = p_reconciled_by
   WHERE id = p_bank_response_id;

  INSERT INTO rta.bank_reconciliation
    (payment_batch_id, reconciled_amount, unreconciled_amount, reconciled_by, notes)
  SELECT
    v_batch_id,
    v_reconciled_amount,
    pb.total_amount - v_reconciled_amount,
    p_reconciled_by,
    format('%s matched, %s unmatched line(s) from bank_response %s', v_matched, v_unmatched, p_bank_response_id)
  FROM rta.payment_batches pb WHERE pb.id = v_batch_id;

  UPDATE rta.payment_batches
     SET status = CASE WHEN v_unmatched = 0 THEN 'reconciled'::rta.payment_batch_status
                        ELSE 'part_paid'::rta.payment_batch_status END
   WHERE id = v_batch_id;

  RETURN QUERY SELECT v_matched, v_unmatched;
END;
$$;

-- =============================================================================
-- END OF VOLUME 4 PATCH
--
-- Explicitly NOT done here, and why:
--   * fn_compute_interest — deliberately deferred: interest accrual needs
--     debenture_issues.day_count_method / coupon schedule fields this
--     patch didn't re-inspect; writing it against a guessed column list
--     risks a silently wrong day-count. Same shape as fn_compute_dividend
--     above once those columns are confirmed.
--   * "no duplicate business logic" (point 3) — no DDL change: this was
--     already true as of Volume 2's generic workflow engine. Re-confirmed
--     by inspection here, not re-implemented.
--   * system/event log (point 7) — already rta.system_events (Volume 2),
--     re-confirmed to already cover CDSC sync / bank upload / email /
--     scheduler / API failures; no change needed.
-- =============================================================================

-- =============================================================================
-- END OF VOLUME 3 ENTERPRISE EXTENSION SCHEMA (includes Volume 4 patches)
-- =============================================================================
