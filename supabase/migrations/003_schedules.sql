-- 일정 관리 테이블
-- Supabase SQL Editor에서 실행하세요

-- 1. 일정 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- 일정 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT,
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'meeting',
  -- meeting: 미팅, call: 전화, demo: 데모, contract: 계약, internal: 내부회의, other: 기타
  
  -- 일시
  start_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- 장소 정보
  location VARCHAR(500),
  address VARCHAR(500),
  
  -- 담당자 정보 (고객 연결 시 자동 입력, 수정 가능)
  contact_name VARCHAR(100),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(200),
  
  -- 미팅 내용 (완료 후 기록)
  meeting_notes TEXT,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'scheduled',
  -- scheduled: 예정, completed: 완료, cancelled: 취소
  
  -- 알림
  reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
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
