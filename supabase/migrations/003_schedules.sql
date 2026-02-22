-- 일정 관리 테이블
-- Supabase SQL Editor에서 실행하세요 (003번 - 002_core_tables.sql 이후 실행)

-- 1. 일정 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT,
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'meeting',

  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,

  location VARCHAR(500),
  address VARCHAR(500),

  contact_name VARCHAR(100),
  contact_phone VARCHAR(50),

  meeting_notes TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::JSONB,

  status VARCHAR(20) DEFAULT 'scheduled',
  reminder_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 미팅 준비 체크리스트 테이블
CREATE TABLE IF NOT EXISTS schedule_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  item VARCHAR(200) NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_client_id ON schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON schedules(start_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedule_checklists_schedule_id ON schedule_checklists(schedule_id);

-- 4. RLS 정책
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_checklists ENABLE ROW LEVEL SECURITY;

-- schedules 정책
CREATE POLICY "Users can view own schedules" ON schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules" ON schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" ON schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" ON schedules
  FOR DELETE USING (auth.uid() = user_id);

-- schedule_checklists 정책
CREATE POLICY "Users can manage checklists for own schedules" ON schedule_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schedules 
      WHERE schedules.id = schedule_checklists.schedule_id 
      AND schedules.user_id = auth.uid()
    )
  );

-- 5. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedules_updated_at();

-- 6. clients 테이블에 address 컬럼 추가 (없는 경우)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address VARCHAR(500);
