# 📋 프로젝트 결정사항

> **프로젝트명**: B2B 영업 AI 에이전트
> **최종 수정일**: 2025-02-02

---

## 1. 기술 스택 결정

### 1.1 Core Stack

| 영역 | 결정 | 대안 (미채택) | 결정 이유 |
|------|------|---------------|-----------|
| **Framework** | Next.js 14 (App Router) | - | Server Actions, 풀스택 통합 |
| **Language** | TypeScript | - | 타입 안정성 |
| **Styling** | Tailwind CSS + shadcn/ui | - | 빠른 개발, 일관된 디자인 |
| **Database** | PostgreSQL (Supabase) | - | 관계형 데이터, RLS 지원 |

### 1.2 선택이 필요했던 항목

| 항목 | 결정 | 대안 (미채택) | 결정 이유 |
|------|------|---------------|-----------|
| **Backend API** | Next.js API Routes | Supabase Edge Functions | 익숙함 + 유연성 |
| **인증** | Supabase Auth | NextAuth.js | Supabase 통합 시 간편 |
| **파일 저장** | Supabase Storage | AWS S3 | 인프라 통일 |
| **차트** | Recharts | Chart.js | React 친화적 |

### 1.3 보류된 결정

| 항목 | 상태 | 결정 예정 시점 | 비고 |
|------|------|----------------|------|
| **PDF 생성** | ⏳ 보류 | Phase 6 (제안서) | React-PDF vs Puppeteer 검토 필요 |

---

## 2. 프로젝트 구조 결정

### 2.1 Repository 구조
- **결정**: Single repo
- **이유**: 프로젝트 규모 고려, 초기 복잡도 최소화

### 2.2 폴더 구조
```
sales-ai-agent/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 라우트 그룹
│   ├── (dashboard)/       # 대시보드 라우트 그룹
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── layout/           # 레이아웃 컴포넌트
│   ├── dashboard/        # 대시보드 컴포넌트
│   ├── clients/          # 고객 관리 컴포넌트
│   ├── email/            # 이메일 컴포넌트
│   ├── proposal/         # 제안서 컴포넌트
│   └── common/           # 공통 컴포넌트
├── lib/                   # 유틸리티, 헬퍼
│   ├── supabase/         # Supabase 클라이언트
│   ├── ai/               # OpenAI 관련
│   └── utils.ts
├── types/                 # TypeScript 타입 정의
├── hooks/                 # Custom React Hooks
├── docs/                  # 프로젝트 문서
└── public/               # 정적 파일
```

---

## 3. 배포 결정

### 3.1 배포 전략
| 단계 | 환경 | 상태 |
|------|------|------|
| 개발 | 로컬 (localhost:3000) | ✅ 현재 |
| 스테이징 | - | ⏳ 미정 |
| 프로덕션 | 도메인 배포 (Vercel 예정) | ⏳ 테스트 완료 후 |

---

## 4. 외부 API 연동

| API | 용도 | 연동 시점 | 상태 |
|-----|------|----------|------|
| Supabase | DB + Auth + Storage | Phase 1 | 🔜 예정 |
| OpenAI GPT-4 | AI 기능 | Phase 5 | ⏳ 대기 |
| 네이버 웍스 | 이메일 발송 | Phase 4 | ⏳ 대기 |
| 글로싸인 | 전자계약 | Phase 6 | ⏳ 대기 |

---

## 5. 변경 이력

| 날짜 | 변경 내용 | 결정자 |
|------|----------|--------|
| 2025-02-02 | 초기 기술 스택 결정 | - |
| 2025-02-02 | PDF 생성 방식 보류 결정 | - |
| 2025-02-02 | 배포 전략 결정 (로컬 우선) | - |

---

## 6. 추후 결정 필요 항목

- [ ] PDF 생성 라이브러리 (React-PDF vs Puppeteer)
- [ ] 프로덕션 도메인
- [ ] 카카오 알림톡 연동 여부
- [ ] Google Calendar 연동 여부
