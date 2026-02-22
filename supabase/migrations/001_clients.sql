-- 고객 관리 기본 테이블
-- Supabase SQL Editor에서 실행하세요 (001번 - 가장 먼저 실행)

-- 1. 고객(회사) 테이블
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 회사 정보
  company_name VARCHAR(200) NOT NULL,
  brand_name VARCHAR(200),
  industry VARCHAR(100),
  store_count INT,
  ceo_name VARCHAR(100),

  -- 영업 정보
  inquiry_source VARCHAR(50),
  -- website, phone, referral, exhibition, other
  interest_product VARCHAR(200),
  expected_date DATE,
  pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'inquiry',
  -- inquiry, called, email_sent, meeting, meeting_followup, reviewing, failed, on_hold, in_progress, completed

  -- 실패 관련
  failure_reason TEXT,
  failure_category VARCHAR(50),
  -- price, timing, competitor, internal, feature, other

  -- 메모
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_pipeline_stage ON clients(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- 3. RLS 정책
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- 4. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();
