-- ============================================================
-- execute_action_plan() 단독 테스트
-- Supabase SQL Editor에서 실행하세요
-- 006_execute_action_plan.sql 을 먼저 실행한 후 이 파일을 실행합니다.
-- ============================================================

-- 테스트용 user_id (본인 auth.users id로 교체하세요)
-- SELECT id FROM auth.users LIMIT 1;
DO $$
DECLARE
  v_user_id UUID;
  v_result  JSONB;
  v_client_id UUID;
BEGIN
  -- 테스트할 user_id 가져오기
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '테스트할 사용자가 없습니다. auth.users에 최소 1명 필요';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test user_id: %', v_user_id;
  RAISE NOTICE '========================================';

  -- ──────────────────────────────────────────────────────────
  -- TEST 1: 단일 INSERT (고객 등록)
  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '▶ TEST 1: 단일 INSERT (고객 등록)';

  SELECT execute_action_plan(
    p_actions := '[
      {
        "type": "supabase.insert",
        "table": "clients",
        "values": {
          "company_name": "__TEST_회사_001",
          "brand_name": "테스트브랜드",
          "pipeline_stage": "inquiry",
          "notes": "RPC 단독 테스트"
        }
      }
    ]'::JSONB,
    p_user_id := v_user_id,
    p_client_name := NULL::TEXT
  ) INTO v_result;

  RAISE NOTICE 'Result: %', v_result;
  ASSERT (v_result->>'success')::BOOLEAN = TRUE,
    'TEST 1 FAILED: success should be true';
  ASSERT (v_result->>'rolled_back')::BOOLEAN = FALSE,
    'TEST 1 FAILED: rolled_back should be false';
  ASSERT v_result->>'failed_step' IS NULL OR v_result->>'failed_step' = 'null',
    'TEST 1 FAILED: failed_step should be null';
  ASSERT jsonb_array_length(v_result->'step_results') = 1,
    'TEST 1 FAILED: should have 1 step_result';
  ASSERT v_result->>'client_id' IS NOT NULL,
    'TEST 1 FAILED: client_id should be returned';

  v_client_id := (v_result->>'client_id')::UUID;
  RAISE NOTICE '✅ TEST 1 PASSED — client_id: %', v_client_id;

  -- cleanup
  DELETE FROM clients WHERE id = v_client_id;

  -- ──────────────────────────────────────────────────────────
  -- TEST 2: Multi-step (고객 + 연락처 + 활동기록)
  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '▶ TEST 2: Multi-step (고객 + 연락처 + 활동기록)';

  SELECT execute_action_plan(
    p_actions := '[
      {
        "type": "supabase.insert",
        "table": "clients",
        "values": {
          "company_name": "__TEST_회사_002",
          "pipeline_stage": "meeting"
        }
      },
      {
        "type": "supabase.insert",
        "table": "contacts",
        "values": {
          "name": "홍길동",
          "phone": "010-1234-5678",
          "position": "대표"
        }
      },
      {
        "type": "supabase.insert",
        "table": "activity_logs",
        "values": {
          "activity_type": "call",
          "description": "초기 상담 전화"
        }
      }
    ]'::JSONB,
    p_user_id := v_user_id,
    p_client_name := NULL::TEXT
  ) INTO v_result;

  RAISE NOTICE 'Result: %', v_result;
  ASSERT (v_result->>'success')::BOOLEAN = TRUE,
    'TEST 2 FAILED: success should be true';
  ASSERT jsonb_array_length(v_result->'step_results') = 3,
    'TEST 2 FAILED: should have 3 step_results';

  v_client_id := (v_result->>'client_id')::UUID;

  -- step 0: clients, step 1: contacts (should auto-inject client_id), step 2: activity_logs
  ASSERT (v_result->'step_results'->0->>'table') = 'clients',
    'TEST 2 FAILED: step 0 should be clients';
  ASSERT (v_result->'step_results'->1->>'table') = 'contacts',
    'TEST 2 FAILED: step 1 should be contacts';
  ASSERT (v_result->'step_results'->2->>'table') = 'activity_logs',
    'TEST 2 FAILED: step 2 should be activity_logs';

  -- verify auto-injection: contact should have client_id
  ASSERT EXISTS (
    SELECT 1 FROM contacts WHERE client_id = v_client_id AND name = '홍길동'
  ), 'TEST 2 FAILED: contact should have auto-injected client_id';

  RAISE NOTICE '✅ TEST 2 PASSED — client_id: %, 3 steps all success', v_client_id;

  -- cleanup
  DELETE FROM activity_logs WHERE client_id = v_client_id;
  DELETE FROM contacts WHERE client_id = v_client_id;
  DELETE FROM clients WHERE id = v_client_id;

  -- ──────────────────────────────────────────────────────────
  -- TEST 3: Rollback (허용되지 않은 테이블로 에러 유발)
  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '▶ TEST 3: Rollback (허용되지 않은 테이블)';

  SELECT execute_action_plan(
    p_actions := '[
      {
        "type": "supabase.insert",
        "table": "clients",
        "values": {
          "company_name": "__TEST_회사_003_ROLLBACK",
          "pipeline_stage": "inquiry"
        }
      },
      {
        "type": "supabase.insert",
        "table": "forbidden_table",
        "values": {
          "name": "should_not_exist"
        }
      }
    ]'::JSONB,
    p_user_id := v_user_id,
    p_client_name := NULL::TEXT
  ) INTO v_result;

  RAISE NOTICE 'Result: %', v_result;
  ASSERT (v_result->>'success')::BOOLEAN = FALSE,
    'TEST 3 FAILED: success should be false';
  ASSERT (v_result->>'rolled_back')::BOOLEAN = TRUE,
    'TEST 3 FAILED: rolled_back should be true';
  ASSERT (v_result->>'failed_step')::INT = 1,
    'TEST 3 FAILED: failed_step should be 1';

  -- verify rollback: __TEST_회사_003_ROLLBACK should NOT exist
  ASSERT NOT EXISTS (
    SELECT 1 FROM clients WHERE company_name = '__TEST_회사_003_ROLLBACK'
  ), 'TEST 3 FAILED: client should have been rolled back';

  RAISE NOTICE '✅ TEST 3 PASSED — rolled back, no orphan data';

  -- ──────────────────────────────────────────────────────────
  -- TEST 4: 명시적 캐스팅 (boolean, date, time)
  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '▶ TEST 4: 명시적 캐스팅 (schedules — date, time, boolean)';

  -- first create a client for the schedule
  SELECT execute_action_plan(
    p_actions := '[
      {
        "type": "supabase.insert",
        "table": "clients",
        "values": {
          "company_name": "__TEST_회사_004_CAST",
          "pipeline_stage": "inquiry"
        }
      },
      {
        "type": "supabase.insert",
        "table": "schedules",
        "values": {
          "title": "캐스팅 테스트 미팅",
          "schedule_type": "meeting",
          "start_date": "2025-03-15T14:00:00+09:00",
          "end_date": "2025-03-15T15:30:00+09:00",
          "all_day": false
        }
      }
    ]'::JSONB,
    p_user_id := v_user_id,
    p_client_name := NULL::TEXT
  ) INTO v_result;

  RAISE NOTICE 'Result: %', v_result;
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'TEST 4 FAILED: success=false, message=%, failed_step=%, step_results=%',
      v_result->>'message', v_result->>'failed_step', v_result->'step_results';
  END IF;
  ASSERT jsonb_array_length(v_result->'step_results') = 2,
    'TEST 4 FAILED: should have 2 step_results';

  v_client_id := (v_result->>'client_id')::UUID;

  -- verify the schedule was created with correct types
  ASSERT EXISTS (
    SELECT 1 FROM schedules
    WHERE user_id = v_user_id
      AND title = '캐스팅 테스트 미팅'
      AND start_date = '2025-03-15T14:00:00+09:00'::TIMESTAMPTZ
      AND all_day = FALSE
  ), 'TEST 4 FAILED: schedule should exist with correct typed values';

  RAISE NOTICE '✅ TEST 4 PASSED — explicit casting for date, time, boolean works';

  -- cleanup
  DELETE FROM schedules WHERE user_id = v_user_id AND title = '캐스팅 테스트 미팅';
  DELETE FROM clients WHERE id = v_client_id;

  -- ──────────────────────────────────────────────────────────
  -- TEST 5: email_queue INSERT (groupware.send_email → email_queue)
  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '▶ TEST 5: groupware.send_email → email_queue INSERT';

  SELECT execute_action_plan(
    p_actions := '[
      {
        "type": "supabase.insert",
        "table": "clients",
        "values": {
          "company_name": "__TEST_회사_005_EMAIL",
          "pipeline_stage": "email_sent"
        }
      },
      {
        "type": "groupware.send_email",
        "table": "email_queue",
        "values": {
          "to_address": "test@example.com",
          "subject": "테스트 이메일",
          "body": "이메일 발송 테스트입니다."
        }
      }
    ]'::JSONB,
    p_user_id := v_user_id,
    p_client_name := NULL::TEXT
  ) INTO v_result;

  RAISE NOTICE 'Result: %', v_result;
  ASSERT (v_result->>'success')::BOOLEAN = TRUE,
    'TEST 5 FAILED: success should be true';

  v_client_id := (v_result->>'client_id')::UUID;

  -- verify email_queue entry
  ASSERT EXISTS (
    SELECT 1 FROM email_queue
    WHERE user_id = v_user_id
      AND to_address = 'test@example.com'
      AND status = 'pending'
  ), 'TEST 5 FAILED: email_queue should have pending entry';

  RAISE NOTICE '✅ TEST 5 PASSED — email queued with status=pending';

  -- cleanup
  DELETE FROM email_queue WHERE user_id = v_user_id AND to_address = 'test@example.com';
  DELETE FROM clients WHERE id = v_client_id;

  -- ──────────────────────────────────────────────────────────
  -- TEST 6: skip empty values (빈 값 step은 스킵)
  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '▶ TEST 6: 빈 값 step 스킵';

  SELECT execute_action_plan(
    p_actions := '[
      {
        "type": "supabase.insert",
        "table": "clients",
        "values": {
          "company_name": "__TEST_회사_006_SKIP",
          "pipeline_stage": "inquiry"
        }
      },
      {
        "type": "supabase.insert",
        "table": "contacts",
        "values": {}
      }
    ]'::JSONB,
    p_user_id := v_user_id,
    p_client_name := NULL::TEXT
  ) INTO v_result;

  RAISE NOTICE 'Result: %', v_result;
  ASSERT (v_result->>'success')::BOOLEAN = TRUE,
    'TEST 6 FAILED: success should be true';
  ASSERT (v_result->'step_results'->1->>'status') = 'skipped',
    'TEST 6 FAILED: empty contact step should be skipped';

  v_client_id := (v_result->>'client_id')::UUID;
  RAISE NOTICE '✅ TEST 6 PASSED — empty step correctly skipped';

  -- cleanup
  DELETE FROM clients WHERE id = v_client_id;

  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL 6 TESTS PASSED';
  RAISE NOTICE '========================================';
END;
$$;
