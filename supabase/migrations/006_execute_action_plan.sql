-- ActionPlan 트랜잭션 실행 함수
-- Supabase SQL Editor에서 실행하세요
-- BEGIN → actions[] 순차 실행 → COMMIT / 실패 시 자동 ROLLBACK

-- 0. email_queue 테이블 (groupware.send_email → DB insert only, 실제 발송은 별도 worker)
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  to_address TEXT NOT NULL,
  cc_address TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email queue" ON email_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email queue" ON email_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 1. 컬럼 data_type → 명시적 캐스트 접미사
CREATE OR REPLACE FUNCTION _pg_cast_suffix(p_data_type TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_data_type
    WHEN 'uuid'                        THEN '::uuid'
    WHEN 'boolean'                     THEN '::boolean'
    WHEN 'timestamp with time zone'    THEN '::timestamptz'
    WHEN 'timestamp without time zone' THEN '::timestamp'
    WHEN 'date'                        THEN '::date'
    WHEN 'time without time zone'      THEN '::time'
    WHEN 'time with time zone'         THEN '::timetz'
    WHEN 'integer'                     THEN '::integer'
    WHEN 'bigint'                      THEN '::bigint'
    WHEN 'smallint'                    THEN '::smallint'
    WHEN 'numeric'                     THEN '::numeric'
    WHEN 'real'                        THEN '::real'
    WHEN 'double precision'            THEN '::double precision'
    WHEN 'jsonb'                       THEN '::jsonb'
    WHEN 'json'                        THEN '::json'
    ELSE ''
  END;
$$;

-- 2. 메인 실행 함수
CREATE OR REPLACE FUNCTION execute_action_plan(
  p_actions     JSONB,
  p_user_id     UUID,
  p_client_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action       JSONB;
  v_type         TEXT;
  v_table        TEXT;
  v_values       JSONB;
  v_where        JSONB;
  v_col_types    JSONB;
  v_client_id    UUID;
  v_step         INT := 0;
  v_skipped      INT := 0;
  v_new_id       UUID;
  v_cols         TEXT;
  v_vals         TEXT;
  v_sets         TEXT;
  v_wheres       TEXT;
  v_sql          TEXT;
  v_step_results JSONB := '[]'::JSONB;

  v_allowed      TEXT[] := ARRAY[
    'clients','contacts','activity_logs',
    'schedules','reminders','proposals','email_queue'
  ];
  v_uid_tables   TEXT[] := ARRAY[
    'clients','activity_logs','schedules','reminders','proposals','email_queue'
  ];
  v_cid_tables   TEXT[] := ARRAY[
    'contacts','activity_logs','schedules','email_queue'
  ];
BEGIN
  IF p_client_name IS NOT NULL AND p_client_name != '' THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE user_id = p_user_id
      AND company_name ILIKE '%' || p_client_name || '%'
    LIMIT 1;
  END IF;

  FOR v_action IN SELECT elem FROM jsonb_array_elements(p_actions) AS elem
  LOOP
    v_type   := v_action->>'type';
    v_table  := v_action->>'table';
    v_values := COALESCE(v_action->'values', '{}'::JSONB);
    v_where  := COALESCE(v_action->'where', '{}'::JSONB);

    -- groupware.send_email → email_queue INSERT (트랜잭션 내 외부 API 호출 금지)
    IF v_type = 'groupware.send_email' THEN
      v_type  := 'supabase.insert';
      v_table := 'email_queue';
      IF NOT (v_values ? 'status') THEN
        v_values := v_values || '{"status": "pending"}'::JSONB;
      END IF;
    END IF;

    IF NOT (v_table = ANY(v_allowed)) THEN
      RAISE EXCEPTION '허용되지 않은 테이블: %', v_table;
    END IF;

    SELECT COALESCE(jsonb_object_agg(column_name, data_type), '{}'::JSONB)
    INTO v_col_types
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = v_table;

    SELECT COALESCE(jsonb_object_agg(key, value), '{}'::JSONB)
    INTO v_values
    FROM jsonb_each(v_values)
    WHERE value IS DISTINCT FROM 'null'::JSONB
      AND value IS DISTINCT FROM '""'::JSONB;

    -- ── INSERT ─────────────────────────────────────────────
    IF v_type = 'supabase.insert' THEN

      IF v_table = ANY(v_uid_tables) AND NOT (v_values ? 'user_id') THEN
        v_values := v_values || jsonb_build_object('user_id', p_user_id::TEXT);
      END IF;
      IF v_table = ANY(v_cid_tables) AND NOT (v_values ? 'client_id') AND v_client_id IS NOT NULL THEN
        v_values := v_values || jsonb_build_object('client_id', v_client_id::TEXT);
      END IF;

      IF (SELECT count(*) FROM jsonb_each_text(v_values)
          WHERE key NOT IN ('user_id','client_id')) = 0
      THEN
        v_step_results := v_step_results || jsonb_build_object(
          'step', v_step, 'status', 'skipped', 'table', v_table);
        v_skipped := v_skipped + 1;
        v_step := v_step + 1;
        CONTINUE;
      END IF;

      SELECT
        string_agg(format('%I', j.key), ', ' ORDER BY j.key),
        string_agg(
          format('%L', j.value)
            || COALESCE(_pg_cast_suffix(v_col_types->>j.key), ''),
          ', ' ORDER BY j.key)
      INTO v_cols, v_vals
      FROM jsonb_each_text(v_values) j;

      v_sql := format(
        'INSERT INTO %I (%s) VALUES (%s) RETURNING id',
        v_table, v_cols, v_vals);
      EXECUTE v_sql INTO v_new_id;

      IF v_table = 'clients' AND v_new_id IS NOT NULL THEN
        v_client_id := v_new_id;
      END IF;

      v_step_results := v_step_results || jsonb_build_object(
        'step', v_step, 'status', 'success',
        'table', v_table, 'id', v_new_id);

    -- ── UPDATE ─────────────────────────────────────────────
    ELSIF v_type = 'supabase.update' THEN

      IF (SELECT count(*) FROM jsonb_each(v_values)) = 0 THEN
        v_step_results := v_step_results || jsonb_build_object(
          'step', v_step, 'status', 'skipped', 'table', v_table);
        v_skipped := v_skipped + 1;
        v_step := v_step + 1;
        CONTINUE;
      END IF;

      SELECT string_agg(
        format('%I = ', j.key)
          || format('%L', j.value)
          || COALESCE(_pg_cast_suffix(v_col_types->>j.key), ''),
        ', ' ORDER BY j.key)
      INTO v_sets
      FROM jsonb_each_text(v_values) j;

      v_wheres := NULL;
      IF (SELECT count(*) FROM jsonb_each(v_where)) > 0 THEN
        SELECT string_agg(
          format('%I = ', j.key)
            || format('%L', j.value)
            || COALESCE(_pg_cast_suffix(v_col_types->>j.key), ''),
          ' AND ' ORDER BY j.key)
        INTO v_wheres
        FROM jsonb_each_text(v_where) j;
      ELSIF v_table = 'clients' AND v_client_id IS NOT NULL THEN
        v_wheres := format('id = %L::uuid', v_client_id::TEXT);
      ELSIF v_table = ANY(v_cid_tables) AND v_client_id IS NOT NULL THEN
        v_wheres := format('client_id = %L::uuid', v_client_id::TEXT);
      ELSE
        RAISE EXCEPTION '업데이트 대상을 특정할 수 없습니다: %', v_table;
      END IF;

      v_sql := format('UPDATE %I SET %s WHERE %s', v_table, v_sets, v_wheres);
      EXECUTE v_sql;

      v_step_results := v_step_results || jsonb_build_object(
        'step', v_step, 'status', 'success', 'table', v_table);

    -- ── DELETE ─────────────────────────────────────────────
    ELSIF v_type = 'supabase.delete' THEN

      v_wheres := NULL;
      IF (SELECT count(*) FROM jsonb_each(v_where)) > 0 THEN
        SELECT string_agg(
          format('%I = ', j.key)
            || format('%L', j.value)
            || COALESCE(_pg_cast_suffix(v_col_types->>j.key), ''),
          ' AND ' ORDER BY j.key)
        INTO v_wheres
        FROM jsonb_each_text(v_where) j;
      ELSIF v_table = 'clients' AND v_client_id IS NOT NULL THEN
        v_wheres := format('id = %L::uuid', v_client_id::TEXT);
      ELSE
        RAISE EXCEPTION '삭제 대상을 특정할 수 없습니다: %', v_table;
      END IF;

      v_sql := format('DELETE FROM %I WHERE %s', v_table, v_wheres);
      EXECUTE v_sql;

      v_step_results := v_step_results || jsonb_build_object(
        'step', v_step, 'status', 'success', 'table', v_table);

    ELSE
      RAISE EXCEPTION '지원하지 않는 액션: %', v_type;
    END IF;

    v_step := v_step + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',      TRUE,
    'rolled_back',  FALSE,
    'failed_step',  NULL,
    'step_results', v_step_results,
    'client_id',    v_client_id
  );

EXCEPTION WHEN OTHERS THEN
  -- PL/pgSQL EXCEPTION: DB 변경사항 자동 ROLLBACK, 변수는 유지
  RETURN jsonb_build_object(
    'success',      FALSE,
    'rolled_back',  TRUE,
    'failed_step',  v_step,
    'message',      SQLERRM,
    'step_results', v_step_results,
    'client_id',    v_client_id
  );
END;
$$;
