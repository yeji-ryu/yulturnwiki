'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bold,
  Image as ImageIcon,
  Lock,
  Palette,
  Pencil,
  Plus,
  Save,
  Search,
  Share2,
  Shield,
  Strikethrough,
  Type,
  User,
  Users,
} from 'lucide-react';

type TeamKey =
  | '회계팀'
  | '빌링팀'
  | '컬처팀'
  | '피플팀'
  | '업무지원팀'
  | '전략마케팅팀'
  | '인재개발팀'
  | '급여팀'
  | '인프라보안팀'
  | '경영인프라팀'
  | '법무지원팀'
  | '고객지원팀'
  | '전략기획실'
  | '리서치팀';

type PageCategory =
  | '대문'
  | '기수 문서'
  | '팀 문서'
  | '사람 문서'
  | '운영 정책'
  | '사내 생활'
  | '업무 정보'
  | '경험 공유'
  | '관리자';

type UserAccount = {
  id: string;
  loginId: string;
  password: string;
  name: string;
  role: string;
  team: TeamKey | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type WikiPage = {
  id: string;
  title: string;
  summary: string;
  content: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName?: string;
  revision: number;
  category?: PageCategory | string;
  icon?: string;
  team?: TeamKey | null;
  isSystemFixed?: boolean;
};

type AuditChange = {
  field: 'title' | 'summary' | 'content' | 'team' | 'role' | 'name';
  before: string;
  after: string;
};

type AuditLog = {
  id: string;
  pageId: string;
  pageTitle: string;
  action: 'seed' | 'update' | 'create' | 'member_add' | 'member_update';
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  summary: string;
  changes?: AuditChange[];
};

type WikiData = {
  people: WikiPage[];
  sections: WikiPage[];
  auditLogs: AuditLog[];
};

type TeamDefinition = {
  key: TeamKey;
  pageId: string;
  title: string;
  summary: string;
  intro: string;
  mood: string[];
  tips: string[];
};

const SESSION_KEY = 'yulturn-wiki-session-hardcoded';
const STORAGE_KEY = 'yulturn-wiki-hardcoded-db';
const HOME_PAGE_ID = 'main';
const INTERN_INDEX_PAGE_ID = 'interns-2026h1';
const ADMIN_PAGE_ID = 'admin-dashboard';

const nowIso = () => new Date().toISOString();

const TEAM_DEFINITIONS: TeamDefinition[] = [
  {
    key: '회계팀',
    pageId: 'team-accounting',
    title: '회계팀',
    summary: '2026 상반기 회계팀 소개 문서',
    intro: '회계팀은 재무 관리 및 회계 처리를 담당합니다.',
    mood: ['꼼꼼함과 책임감 중요', '숫자 정확성 필수'],
    tips: ['엑셀 활용 능력 중요', '검토 과정 필수'],
  },
  {
    key: '빌링팀',
    pageId: 'team-billing',
    title: '빌링팀',
    summary: '2026 상반기 빌링팀 소개 문서',
    intro: '빌링팀은 청구 및 비용 정산 업무를 담당합니다.',
    mood: ['정확성과 속도 중요', '반복 업무 많음'],
    tips: ['자동화 활용 추천', '기록 정리 습관화'],
  },
  {
    key: '컬처팀',
    pageId: 'team-culture',
    title: '컬처팀',
    summary: '2026 상반기 컬처팀 소개 문서',
    intro: '컬처팀은 사내 문화와 프로그램 운영을 담당합니다.',
    mood: ['소통 중요', '기획력 요구됨'],
    tips: ['일정 관리 필수', '피드백 적극 반영'],
  },
  {
    key: '피플팀',
    pageId: 'team-people',
    title: '피플팀',
    summary: '2026 상반기 피플팀 소개 문서',
    intro: '피플팀은 인사 및 조직 관리를 담당합니다.',
    mood: ['커뮤니케이션 중요', '조직 이해 필요'],
    tips: ['기록 관리 필수', '사람 중심 사고'],
  },
  {
    key: '업무지원팀',
    pageId: 'team-support',
    title: '업무지원팀',
    summary: '2026 상반기 업무지원팀 소개 문서',
    intro: '업무지원팀은 운영 보조 및 실무 지원을 담당합니다.',
    mood: ['정확성과 응대 중요', '빠른 대응 필요'],
    tips: ['체크리스트 활용', '진행상황 공유'],
  },
  {
    key: '전략마케팅팀',
    pageId: 'team-marketing',
    title: '전략마케팅팀',
    summary: '2026 상반기 전략마케팅팀 소개 문서',
    intro: '전략마케팅팀은 마케팅 전략 및 기획을 담당합니다.',
    mood: ['창의성 중요', '빠른 트렌드 반영'],
    tips: ['데이터 분석 필수', '아이디어 공유'],
  },
  {
    key: '인재개발팀',
    pageId: 'team-hr-development',
    title: '인재개발팀',
    summary: '2026 상반기 인재개발팀 소개 문서',
    intro: '인재개발팀은 인재 육성과 교육을 담당합니다.',
    mood: ['성장 중심', '피드백 활발'],
    tips: ['교육 설계 중요', '참여 유도 필요'],
  },
  {
    key: '급여팀',
    pageId: 'team-payroll',
    title: '급여팀',
    summary: '2026 상반기 급여팀 소개 문서',
    intro: '급여팀은 급여 및 보상 처리를 담당합니다.',
    mood: ['정확성 필수', '민감 정보 많음'],
    tips: ['데이터 검증 중요', '보안 신경쓰기'],
  },
  {
    key: '인프라보안팀',
    pageId: 'team-infosec',
    title: '인프라보안팀',
    summary: '2026 상반기 인프라보안팀 소개 문서',
    intro: '인프라보안팀은 시스템 및 네트워크 보안을 담당합니다.',
    mood: ['문제 해결 중심', '기술 학습 중요'],
    tips: ['로그 분석 습관화', '보안 이슈 공유'],
  },
  {
    key: '경영인프라팀',
    pageId: 'team-management-infra',
    title: '경영인프라팀',
    summary: '2026 상반기 경영인프라팀 소개 문서',
    intro: '경영인프라팀은 경영 인프라 운영과 협업 기반 정비를 담당합니다.',
    mood: ['협업 중요', '다양한 업무 경험'],
    tips: ['커뮤니케이션 필수', '업무 흐름 이해'],
  },
  {
    key: '법무지원팀',
    pageId: 'team-legal-support',
    title: '법무지원팀',
    summary: '2026 상반기 법무지원팀 소개 문서',
    intro: '법무지원팀은 법률 지원 업무를 담당합니다.',
    mood: ['정확성 중요', '문서 중심'],
    tips: ['기록 관리 필수', '검토 습관화'],
  },
  {
    key: '고객지원팀',
    pageId: 'team-customer-support',
    title: '고객지원팀',
    summary: '2026 상반기 고객지원팀 소개 문서',
    intro: '고객지원팀은 고객 응대 및 지원을 담당합니다.',
    mood: ['친절 중요', '빠른 대응 필요'],
    tips: ['응대 매뉴얼 숙지', '기록 남기기'],
  },
  {
    key: '전략기획실',
    pageId: 'team-strategy',
    title: '전략기획실',
    summary: '2026 상반기 전략기획실 소개 문서',
    intro: '전략기획실은 조직 전략 및 기획을 담당합니다.',
    mood: ['분석 중심', '큰 그림 중요'],
    tips: ['자료 조사 필수', '구조적 사고'],
  },
  {
    key: '리서치팀',
    pageId: 'team-research',
    title: '리서치팀',
    summary: '2026 상반기 리서치팀 소개 문서',
    intro: '리서치팀은 조사 및 분석 업무를 담당합니다.',
    mood: ['데이터 중심', '분석력 중요'],
    tips: ['자료 정리 습관화', '인사이트 도출'],
  },
];

const TEAM_ORDER = TEAM_DEFINITIONS.map((team) => team.key);
const TEAM_PAGE_MAP: Record<TeamKey, string> = Object.fromEntries(
  TEAM_DEFINITIONS.map((team) => [team.key, team.pageId]),
) as Record<TeamKey, string>;

const INITIAL_USERS: Omit<UserAccount, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { loginId: '강민희', password: '1038', name: '강민희', role: '인턴', team: '회계팀', isAdmin: false, isActive: true },
  { loginId: '김민지', password: '2102', name: '김민지', role: '인턴', team: '빌링팀', isAdmin: false, isActive: true },
  { loginId: '김서진', password: '3071', name: '김서진', role: '인턴', team: '빌링팀', isAdmin: false, isActive: true },
  { loginId: '김재연', password: '3091', name: '김재연', role: '인턴', team: '전략기획실', isAdmin: false, isActive: true },
  { loginId: '김지현', password: '2164', name: '김지현', role: '인턴', team: '컬처팀', isAdmin: false, isActive: true },
  { loginId: '김태희', password: '0043', name: '김태희', role: '인턴', team: '피플팀', isAdmin: false, isActive: true },
  { loginId: '박세민', password: '0109', name: '박세민', role: '인턴', team: '업무지원팀', isAdmin: false, isActive: true },
  { loginId: '박주희', password: '2175', name: '박주희', role: '인턴', team: '피플팀', isAdmin: false, isActive: true },
  { loginId: '신나영', password: '9053', name: '신나영', role: '인턴', team: '전략마케팅팀', isAdmin: false, isActive: true },
  { loginId: '엄선우', password: '2126', name: '엄선우', role: '인턴', team: '인재개발팀', isAdmin: false, isActive: true },
  { loginId: '연제민', password: '1043', name: '연제민', role: '인턴', team: '급여팀', isAdmin: false, isActive: true },
  { loginId: '유예지', password: '4217', name: '유예지', role: '인턴', team: '인프라보안팀', isAdmin: false, isActive: true },
  { loginId: '이수하', password: '1075', name: '이수하', role: '인턴', team: '인재개발팀', isAdmin: false, isActive: true },
  { loginId: '이예원', password: '3054', name: '이예원', role: '인턴', team: '경영인프라팀', isAdmin: false, isActive: true },
  { loginId: '이재희', password: '1104', name: '이재희', role: '인턴', team: '법무지원팀', isAdmin: false, isActive: true },
  { loginId: '이채영', password: '0117', name: '이채영', role: '인턴', team: '업무지원팀', isAdmin: false, isActive: true },
  { loginId: '이초원', password: '2159', name: '이초원', role: '인턴', team: '고객지원팀', isAdmin: false, isActive: true },
  { loginId: '장서현', password: '2113', name: '장서현', role: '인턴', team: '전략기획실', isAdmin: false, isActive: true },
  { loginId: '정도연', password: '1050', name: '정도연', role: '인턴', team: '업무지원팀', isAdmin: false, isActive: true },
  { loginId: '정성태', password: '0015', name: '정성태', role: '인턴', team: '리서치팀', isAdmin: false, isActive: true },
  { loginId: '조민정', password: '1092', name: '조민정', role: '인턴', team: '업무지원팀', isAdmin: false, isActive: true },
  { loginId: '원혁진', password: '2060', name: '원혁진', role: '인턴', team: '회계팀', isAdmin: false, isActive: true },
  { loginId: 'admin', password: '123', name: '운영자', role: '관리자', team: null, isAdmin: true, isActive: true },
];

function uuid() {
  return crypto.randomUUID();
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function loadSession(): UserAccount | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserAccount) : null;
  } catch {
    return null;
  }
}

function saveSession(user: UserAccount | null) {
  if (!isBrowser()) return;
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function teamContent(def: TeamDefinition) {
  return [
    '[팀 소개]',
    def.intro,
    '',
    '[분위기]',
    ...def.mood.map((item) => `- ${item}`),
    '',
    '[업무 팁]',
    ...def.tips.map((item) => `- ${item}`),
    '',
    '[관련 문서]',
    `- [[${INTERN_INDEX_PAGE_ID}|2026 상반기 인턴]]`,
  ].join('\n');
}

function buildPersonPage(user: UserAccount): WikiPage {
  return {
    id: user.id,
    title: user.name,
    summary: `${user.team ?? '미배정'} ${user.role}. 개인 소개 문서입니다.`,
    team: user.team,
    content: `[인물 정보]
- 이름: ${user.name}
- 소속: ${user.team ?? '미배정'}
- 직무: ${user.role}

[업무 스타일]
- 추후 작성

[메모]
- 자유롭게 작성`,
    updatedAt: user.updatedAt,
    updatedBy: user.id,
    updatedByName: user.name,
    icon: 'people',
    category: '사람 문서',
    revision: 1,
  };
}

function buildInternIndexContent(users: UserAccount[]) {
  const members = users
    .filter((user) => !user.isAdmin)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return `[2026 상반기 인턴]
2026 상반기 인턴 전체 문서입니다.

[팀별 이동]
${TEAM_DEFINITIONS.map((team) => `- [[${team.pageId}|${team.key}]]`).join('\n')}

[구성원]
${members.map((user) => `- [[${user.id}|${user.name}]]`).join('\n')}

[안내]
- 팀 이름을 누르면 팀 소개 화면으로 이동합니다.
- 팀 소개 문서에서 구성원 이름을 눌러 개인 문서로 이동할 수 있습니다.
- 구성원 추가/수정은 관리자 페이지에서 가능합니다.`;
}

function buildBaseSections(): WikiPage[] {
  const baseTime = nowIso();

  const fixedSections: WikiPage[] = [
    {
      id: HOME_PAGE_ID,
      category: '대문',
      icon: 'file',
      title: '대문',
      summary: '율턴위키의 메인 문서입니다.',
      content: `[위키 소개]
율턴위키는 2026 상반기 율촌 인턴들이 프로필, 업무 적응, 생활 팁, 인수인계 메모를 정리하는 내부 위키입니다.

[위키 사용 방법]
- 상단 검색창으로 문서를 찾을 수 있습니다.
- 문서 우측 상단의 편집 버튼으로 내용을 수정할 수 있습니다.
- 공유 버튼으로 현재 문서명을 복사할 수 있습니다.

[2026 상반기 인턴 구성원]
- [[${INTERN_INDEX_PAGE_ID}|2026 상반기 인턴 문서로 이동]]
- 아래 문서에서 팀 소개와 구성원을 확인할 수 있습니다.

[사내 생활 문서]
- [[cafe-tips|여율 이용 팁]]
- [[meal-tips|식대 / 식당 팁]]
- [[team-cautions|팀마다 조심해야 할 부분..?]]
- [[stories|겪은 썰 / 인수인계 메모]]

[운영 규칙]
- [[operating-rules|운영 규칙]]`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
      isSystemFixed: true,
    },
    {
      id: INTERN_INDEX_PAGE_ID,
      category: '기수 문서',
      icon: 'people',
      title: '2026 상반기 인턴',
      summary: '2026 상반기 인턴 전체 구성원과 팀별 링크',
      content: `[2026 상반기 인턴]
2026 상반기 인턴 전체 문서입니다.

[팀별 이동]
${TEAM_DEFINITIONS.map((team) => `- [[${team.pageId}|${team.key}]]`).join('\n')}

[안내]
- 팀 이름을 누르면 팀 소개 화면으로 이동합니다.
- 팀 소개 문서에서 구성원 이름을 눌러 개인 문서로 이동할 수 있습니다.
- 구성원 추가/수정은 관리자 페이지에서 가능합니다.`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
      isSystemFixed: true,
    },
    ...TEAM_DEFINITIONS.map((team) => ({
      id: team.pageId,
      category: '팀 문서' as const,
      icon: 'people',
      title: team.title,
      summary: team.summary,
      content: teamContent(team),
      team: team.key,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
      isSystemFixed: true,
    })),
    {
      id: 'operating-rules',
      category: '운영 정책',
      icon: 'shield',
      title: '운영 규칙',
      summary: '위키 작성 시 반드시 따라야 하는 기본 규칙과 금지사항',
      content: `[기본 원칙]
- 이 위키는 인턴 간 업무 적응과 정보 공유를 위한 내부 참고용 문서입니다.
- 사실 기반으로 작성하고 감정적인 표현은 지양합니다.
- 개인정보, 민감정보, 외부 유출 위험 정보는 기록하지 않습니다.
- 누군가 특정되는 글이 있을 시, 통보 없이 삭제합니다.
- 논란이 될 말은 서로 조심합니다.

[작성 권장 사항]
- 상황 / 배경 / 주의 포인트 / 추천 대응 방식 순으로 정리
- 실무에 도움이 되는 팁, 절차, 위치, 연락 방식을 중심으로 기록

[관리 원칙]
- 모든 수정은 기록될 수 있습니다.
- 부적절한 문서는 관리자에 의해 수정될 수 있습니다.`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
      isSystemFixed: true,
    },
    {
      id: 'cafe-tips',
      category: '사내 생활',
      icon: 'coffee',
      title: '여율 이용 팁',
      summary: '혼잡 시간, 인기 메뉴, 결제 팁 등을 정리하는 문서',
      content: `[기본 정보]
- 어쩌구
- 저쩌구

[팁]
- 어쩌구
- 어쩌구`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
    },
    {
      id: 'meal-tips',
      category: '사내 생활',
      icon: 'food',
      title: '식대 / 식당 팁',
      summary: '근처 식당, 웨이팅, 추천 메뉴, 정산 팁 등을 기록',
      content: `[점심 팁]
- 대충 사이트 이름

[작성 예시]
- 식당명 / 웨이팅 / 가격대 / 추천 메뉴 / 비고`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
    },
    {
      id: 'team-cautions',
      category: '업무 정보',
      icon: 'shield',
      title: '팀마다 조심해야 할 부분',
      summary: '팀별 업무 방식, 커뮤니케이션 팁, 주의 포인트 정리',
      content: `[예시]
- 팀 A: 긴급 요청이 많아 메신저 확인이 중요함
- 팀 B: 문서 양식 통일을 중요하게 봄`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
    },
    {
      id: 'stories',
      category: '경험 공유',
      icon: 'file',
      title: '겪은 썰 / 인수인계 메모',
      summary: '실무 팁, 실수 방지 포인트, 인수인계성 정보 공유',
      content: `[예시]
- 특정 요청은 오후보다 오전 처리 시 응답이 빠름
- 백업 위치는 사전에 꼭 확인`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
    },
    {
      id: ADMIN_PAGE_ID,
      category: '관리자',
      icon: 'shield',
      title: '관리자 페이지',
      summary: '관리자 전용 운영 페이지',
      content: `[관리자 안내]
이 페이지는 관리자만 접근할 수 있습니다.

[확인 가능 항목]
- 전체 문서
- 전체 구성원
- 전체 수정 기록
- 팀/구성원 추가 및 수정`,
      updatedAt: baseTime,
      updatedBy: 'system',
      updatedByName: 'system',
      revision: 1,
      isSystemFixed: true,
    },
  ];

  return fixedSections;
}

function createInitialState(): { wikiData: WikiData; users: UserAccount[] } {
  const timestamp = nowIso();

  const users: UserAccount[] = INITIAL_USERS.map((user) => ({
  ...user,
  id: uuid(),
  createdAt: timestamp,
  updatedAt: timestamp,
}));

const people = users.filter((user) => !user.isAdmin).map(buildPersonPage);
const sections = buildBaseSections().map((section) =>
  section.id === INTERN_INDEX_PAGE_ID
    ? { ...section, content: buildInternIndexContent(users) }
    : section,
);

  const auditLogs: AuditLog[] = [
    {
      id: uuid(),
      pageId: HOME_PAGE_ID,
      pageTitle: '대문',
      action: 'seed',
      actorId: 'system',
      actorName: 'system',
      actorRole: 'system',
      timestamp,
      summary: '초기 데이터 생성',
      changes: [],
    },
  ];

  return {
    wikiData: { people, sections, auditLogs },
    users,
  };
}

function loadStorage(): { wikiData: WikiData; users: UserAccount[] } {
  if (!isBrowser()) return createInitialState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw) as { wikiData: WikiData; users: UserAccount[] };
    return parsed;
  } catch {
    const initial = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveStorage(payload: { wikiData: WikiData; users: UserAccount[] }) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildToc(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\[.+\]$/.test(line))
    .map((line, index) => ({
      id: `section-${index}`,
      label: line.replace(/^\[(.+)\]$/, '$1'),
    }));
}

const STYLE_TAGS = ['red', 'green', 'blue', 'bold', 'big', 'huge', 'strike'] as const;
type StyleTag = (typeof STYLE_TAGS)[number];

function getStyledClasses(styleTag: string) {
  switch (styleTag) {
    case 'red':
      return 'text-red-600';
    case 'green':
      return 'text-green-600';
    case 'blue':
      return 'text-blue-600';
    case 'bold':
      return 'font-bold';
    case 'big':
      return 'text-[28px] leading-[1.5] font-semibold';
    case 'huge':
      return 'text-[40px] leading-[1.4] font-bold';
    case 'strike':
      return 'line-through';
    default:
      return '';
  }
}

function findMatchingClosingTag(text: string, tag: StyleTag, fromIndex: number) {
  const openToken = `[${tag}]`;
  const closeToken = `[/${tag}]`;
  let depth = 1;
  let cursor = fromIndex;

  while (cursor < text.length) {
    const nextOpen = text.indexOf(openToken, cursor);
    const nextClose = text.indexOf(closeToken, cursor);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + openToken.length;
      continue;
    }
    depth -= 1;
    if (depth === 0) return nextClose;
    cursor = nextClose + closeToken.length;
  }
  return -1;
}

function parseStyledInline(text: string, onNavigate: (pageId: string) => void): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let keyIndex = 0;

  while (cursor < text.length) {
    const wikiIndex = text.indexOf('[[', cursor);
    let nearestStyleIndex = -1;
    let nearestStyleTag: StyleTag | null = null;

    for (const tag of STYLE_TAGS) {
      const idx = text.indexOf(`[${tag}]`, cursor);
      if (idx !== -1 && (nearestStyleIndex === -1 || idx < nearestStyleIndex)) {
        nearestStyleIndex = idx;
        nearestStyleTag = tag;
      }
    }

    const candidates = [wikiIndex, nearestStyleIndex].filter((v) => v !== -1);
    const nextIndex = candidates.length ? Math.min(...candidates) : -1;

    if (nextIndex === -1) {
      nodes.push(<React.Fragment key={`text-${keyIndex++}`}>{text.slice(cursor)}</React.Fragment>);
      break;
    }

    if (nextIndex > cursor) {
      nodes.push(<React.Fragment key={`text-${keyIndex++}`}>{text.slice(cursor, nextIndex)}</React.Fragment>);
      cursor = nextIndex;
      continue;
    }

    if (wikiIndex === cursor) {
      const wikiClose = text.indexOf(']]', cursor);
      if (wikiClose === -1) {
        nodes.push(<React.Fragment key={`text-${keyIndex++}`}>{text.slice(cursor)}</React.Fragment>);
        break;
      }
      const rawWiki = text.slice(cursor + 2, wikiClose);
      const [pageId, label] = rawWiki.split('|');
      nodes.push(
        <button
          key={`wiki-${keyIndex++}`}
          type="button"
          onClick={() => onNavigate(pageId)}
          className="inline text-left text-[#0b4f9b] hover:underline"
        >
          {label || pageId}
        </button>,
      );
      cursor = wikiClose + 2;
      continue;
    }

    if (nearestStyleIndex === cursor && nearestStyleTag) {
      const openToken = `[${nearestStyleTag}]`;
      const closeToken = `[/${nearestStyleTag}]`;
      const contentStart = cursor + openToken.length;
      const closeIndex = findMatchingClosingTag(text, nearestStyleTag, contentStart);

      if (closeIndex === -1) {
        nodes.push(<React.Fragment key={`text-${keyIndex++}`}>{openToken}</React.Fragment>);
        cursor = contentStart;
        continue;
      }

      const innerText = text.slice(contentStart, closeIndex);
      nodes.push(
        <span key={`style-${keyIndex++}`} className={getStyledClasses(nearestStyleTag)}>
          {parseStyledInline(innerText, onNavigate)}
        </span>,
      );
      cursor = closeIndex + closeToken.length;
      continue;
    }

    nodes.push(<React.Fragment key={`text-${keyIndex++}`}>{text[cursor]}</React.Fragment>);
    cursor += 1;
  }

  return nodes;
}

function parseImageToken(value: string) {
  const match = value.match(/^\{\{image:([^|}]+)\|([^}]+)\}\}$/);
  if (!match) return null;
  return { path: match[1], name: match[2] };
}

function renderWikiText(text: string, onNavigate: (pageId: string) => void): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let sectionIndex = -1;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="my-2 ml-6 list-disc space-y-1 text-[15px] leading-8 text-[#444]">
        {listItems.map((item, idx) => {
          const imageToken = parseImageToken(item);
          if (imageToken) {
            return (
              <li key={`${item}-${idx}`} className="ml-[-24px] list-none">
                <figure>
                  <img src={imageToken.path} alt={imageToken.name} className="max-h-[420px] max-w-full rounded border border-[#ddd]" />
                  <figcaption className="mt-2 text-xs text-[#777]">{imageToken.name}</figcaption>
                </figure>
              </li>
            );
          }
          return <li key={`${item}-${idx}`}>{parseStyledInline(item, onNavigate)}</li>;
        })}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={`spacer-${index}`} className="h-3" />);
      return;
    }

    if (/^\[.+\]$/.test(trimmed)) {
      flushList();
      sectionIndex += 1;
      const label = trimmed.replace(/^\[(.+)\]$/, '$1');
      elements.push(
        <h2 key={`heading-${index}`} id={`section-${sectionIndex}`} className="mt-10 mb-3 border-b border-[#e5e5e5] pb-2 text-[20px] font-normal text-[#243b53]">
          {label}
        </h2>,
      );
      return;
    }

    const imageToken = parseImageToken(trimmed);
    if (imageToken) {
      flushList();
      elements.push(
        <figure key={`image-${index}`} className="my-4">
          <img src={imageToken.path} alt={imageToken.name} className="max-h-[520px] max-w-full rounded border border-[#ddd]" />
          <figcaption className="mt-2 text-xs text-[#777]">{imageToken.name}</figcaption>
        </figure>,
      );
      return;
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();
    elements.push(
      <p key={`paragraph-${index}`} className="text-[15px] leading-8 text-[#444]">
        {parseStyledInline(trimmed, onNavigate)}
      </p>,
    );
  });

  flushList();
  return elements;
}

function getChangePreview(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '(비어 있음)';
  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

function buildAuditChanges(before: WikiPage, after: WikiPage): AuditChange[] {
  const changes: AuditChange[] = [];
  if (before.title !== after.title) changes.push({ field: 'title', before: before.title, after: after.title });
  if (before.summary !== after.summary) changes.push({ field: 'summary', before: before.summary, after: after.summary });
  if (before.content !== after.content) changes.push({ field: 'content', before: before.content, after: after.content });
  return changes;
}

function updatePersonPages(users: UserAccount[], currentPeople: WikiPage[]) {
  const personPages = users.filter((user) => !user.isAdmin).map((user) => {
    const existing = currentPeople.find((page) => page.id === user.id);
    const base = buildPersonPage(user);
    if (!existing) return base;
    return {
      ...existing,
      title: user.name,
      summary: `${user.team ?? '미배정'} ${user.role}. 개인 소개 문서입니다.`,
      team: user.team,
    };
  });

  return personPages;
}

function YulturnLogo({ white = true }: { white?: boolean }) {
  return (
    <div className={`text-[36px] font-extrabold tracking-[-0.04em] ${white ? 'text-white' : 'text-[#0b3f79]'}`}>
      율턴위키
    </div>
  );
}

function LoginScreen({ onLogin, users }: { onLogin: (user: UserAccount) => void; users: UserAccount[] }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find((user) => user.loginId === id.trim() && user.password === password && user.isActive);
    if (!found) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    setError('');
    onLogin(found);
  };

  return (
    <div className="min-h-screen bg-[#0b3f79]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center px-8 py-14 lg:px-16">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-8">
              <div className="text-5xl font-extrabold tracking-[-0.04em] text-white">율턴위키</div>
              <div className="mt-2 text-sm text-white/75">율촌 인턴 내부 위키</div>
            </div>
            <div className="max-w-2xl rounded-[28px] border border-white/10 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-md">
              <h1 className="text-3xl font-bold">YulturnWiki</h1>
              <p className="mt-4 text-base leading-7 text-white/85">
                율촌 인턴끼리만 공유하는 내부 위키입니다.
                <br />
                하드코딩 계정 기반으로 안정적으로 동작합니다.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-center px-6 py-10 lg:px-10">
          <motion.form initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} onSubmit={submit} className="w-full max-w-md rounded-[30px] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-[#0b3f79] p-3 text-white"><Lock className="h-5 w-5" /></div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">로그인</h2>
                <p className="text-sm text-slate-500">허용된 계정만 접근 가능합니다.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">아이디</label>
                <input value={id} onChange={(e) => setId(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0b3f79]" placeholder="아이디 입력" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">비밀번호</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0b3f79]" placeholder="비밀번호 입력" />
              </div>
            </div>

            {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
            <button type="submit" className="mt-6 w-full rounded-2xl bg-[#0b3f79] px-4 py-3 font-semibold text-white transition hover:opacity-95">입장하기</button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}

function SearchBox({
  search,
  setSearch,
  results,
  onSelect,
}: {
  search: string;
  setSearch: (v: string) => void;
  results: WikiPage[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative hidden w-full max-w-[560px] md:block">
      <div className="flex items-center overflow-hidden rounded border border-[#082f5d] bg-white">
        <input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault();
              onSelect(results[0].id);
              setOpen(false);
            }
          }}
          placeholder="율턴위키 검색"
          className="w-full px-4 py-2.5 text-sm text-[#333] outline-none"
        />
        <button type="button" onClick={() => { if (results[0]) { onSelect(results[0].id); setOpen(false); } }} className="border-l border-[#ddd] px-4 py-3 text-[#555]">
          <Search className="h-5 w-5" />
        </button>
      </div>

      {open && search.trim() ? (
        <div className="absolute left-0 right-0 top-[46px] z-30 max-h-80 overflow-y-auto rounded-b border border-t-0 border-[#d8d8d8] bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#777]">검색 결과가 없습니다.</div>
          ) : (
            results.slice(0, 8).map((page) => (
              <button key={page.id} type="button" onClick={() => { onSelect(page.id); setOpen(false); }} className="block w-full border-b border-[#f0f0f0] px-4 py-3 text-left hover:bg-[#f8fbfe] last:border-b-0">
                <div className="text-sm font-semibold text-[#243b53]">{page.title}</div>
                <div className="mt-1 text-xs text-[#66788a]">{page.summary}</div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function TopBar({
  user,
  search,
  setSearch,
  searchResults,
  onLogout,
  onGoHome,
  onSelectSearch,
  onGoAdmin,
}: {
  user: UserAccount;
  search: string;
  setSearch: (v: string) => void;
  searchResults: WikiPage[];
  onLogout: () => void;
  onGoHome: () => void;
  onSelectSearch: (id: string) => void;
  onGoAdmin: () => void;
}) {
  return (
    <header className="border-b border-[#082f5d] bg-[#0b3f79] text-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
        <button type="button" onClick={onGoHome} className="shrink-0">
          <YulturnLogo white />
        </button>

        <div className="flex flex-1 items-center justify-end gap-3">
          <SearchBox search={search} setSearch={setSearch} results={searchResults} onSelect={onSelectSearch} />
          {user.isAdmin ? (
            <button type="button" onClick={onGoAdmin} className="hidden items-center gap-2 rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10 lg:flex">
              <Shield className="h-4 w-4" />
              관리자 페이지
            </button>
          ) : null}
          <div className="hidden items-center gap-2 rounded border border-white/15 bg-white/10 px-3 py-2 lg:flex">
            <User className="h-4 w-4" />
            <div className="text-sm">{user.name} {user.isAdmin ? '(관리자)' : ''}</div>
          </div>
          <button type="button" onClick={onLogout} className="rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10">로그아웃</button>
        </div>
      </div>
    </header>
  );
}

function ActionButtons({
  editing,
  disabled,
  onEdit,
  onSave,
  onShare,
}: {
  editing: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0 overflow-hidden rounded border border-[#d5d5d5] bg-white text-[14px] text-[#555] shadow-sm">
      <button type="button" disabled={disabled} onClick={editing ? onSave : onEdit} className="flex items-center gap-1 border-r border-[#e5e5e5] px-4 py-2 hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-50">
        {editing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        {editing ? '저장' : '편집'}
      </button>
      <button type="button" onClick={onShare} className="flex items-center gap-1 px-4 py-2 hover:bg-[#f7f7f7]">
        <Share2 className="h-4 w-4" />
        공유
      </button>
    </div>
  );
}

function TocBox({ toc }: { toc: { id: string; label: string }[] }) {
  return (
    <div className="mb-6 w-full max-w-[260px] rounded border border-[#ddd] bg-[#f8f9fa]">
      <div className="border-b border-[#ddd] px-5 py-3 text-[18px] font-bold text-[#333]">목차</div>
      <div className="px-5 py-4 text-[15px] text-[#0b4f9b]">
        {toc.length === 0 ? (
          <div className="text-[#777]">표시할 목차가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {toc.map((item, idx) => (
              <a key={item.id} href={`#${item.id}`} className="block hover:underline">
                {idx + 1}. {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentChanges({ logs, onNavigate }: { logs: AuditLog[]; onNavigate: (id: string) => void }) {
  const recent = logs.slice().reverse().slice(0, 10);
  return (
    <aside className="rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#ddd] bg-[#f5f5f5] px-4 py-3 text-[15px] font-semibold text-[#444]">최근 바뀜</div>
      <div>
        {recent.map((log) => (
          <button key={log.id} type="button" onClick={() => onNavigate(log.pageId)} className="block w-full border-b border-[#eee] px-3 py-2 text-left text-[14px] text-[#555] last:border-b-0 hover:bg-[#fafafa]">
            <div className="truncate text-[#0b4f9b]">[{formatDate(log.timestamp)}] {log.pageTitle}</div>
            <div className="mt-1 text-xs text-[#777]">{log.actorName} · {log.summary}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function TeamMembersBlock({
  people,
  team,
  onNavigate,
}: {
  people: WikiPage[];
  team: TeamKey;
  onNavigate: (pageId: string) => void;
}) {
  const members = people.filter((person) => person.team === team).sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  return (
    <div className="mt-10">
      <h2 className="mb-3 border-b border-[#e5e5e5] pb-2 text-[20px] font-normal text-[#243b53]">구성원</h2>
      <div className="flex flex-wrap gap-x-3 gap-y-2 text-[15px] leading-8 text-[#444]">
        {members.length === 0 ? (
          <div className="text-[#777]">등록된 멤버가 없습니다.</div>
        ) : (
          members.map((member) => (
            <button key={member.id} type="button" onClick={() => onNavigate(member.id)} className="rounded border border-[#d9e4ef] bg-[#f8fbfe] px-3 py-1.5 text-[#0b4f9b] hover:bg-[#eef5fb]">
              {member.title}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function EditorImageTools({ onAppendImage }: { onAppendImage: (file: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="mb-3 flex items-center gap-2">
      <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]">
        <ImageIcon className="h-4 w-4" />
        사진 삽입
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = String(reader.result ?? '');
            await onAppendImage(new File([file], dataUrl));
          };
          reader.readAsDataURL(file);
          e.currentTarget.value = '';
        }}
      />
      <div className="text-xs text-[#777]">업로드한 사진은 본문에 파일명 형태로 삽입됩니다.</div>
    </div>
  );
}

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const value = textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
  return { value, selectionStart: start + before.length, selectionEnd: end + before.length };
}

function EditorStyleToolbar({
  textareaRef,
  setDraft,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setDraft: React.Dispatch<React.SetStateAction<WikiPage | null>>;
}) {
  const applyTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const result = wrapSelection(el, `[${tag}]`, `[/${tag}]`);
    setDraft((prev) => (prev ? { ...prev, content: result.value } : prev));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => applyTag('bold')} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"><Bold className="h-4 w-4" />굵게</button>
      <button type="button" onClick={() => applyTag('red')} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-red-600 hover:bg-[#f8f8f8]"><Palette className="h-4 w-4" />빨강</button>
      <button type="button" onClick={() => applyTag('green')} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-green-600 hover:bg-[#f8f8f8]"><Palette className="h-4 w-4" />초록</button>
      <button type="button" onClick={() => applyTag('blue')} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-blue-600 hover:bg-[#f8f8f8]"><Palette className="h-4 w-4" />파랑</button>
      <button type="button" onClick={() => applyTag('big')} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"><Type className="h-4 w-4" />큰글씨</button>
      <button type="button" onClick={() => applyTag('huge')} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"><Type className="h-4 w-4" />아주큰글씨</button>
      <button type="button" onClick={() => applyTag('strike')} className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"><Strikethrough className="h-4 w-4" />취소선</button>
    </div>
  );
}

function AdminAuditPanel({ logs, onNavigate }: { logs: AuditLog[]; onNavigate: (pageId: string) => void }) {
  const filtered = logs.slice().reverse();
  return (
    <div className="mt-10 rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-4">
        <h2 className="text-[22px] font-bold text-[#243b53]">수정 기록</h2>
        <p className="mt-1 text-sm text-[#66788a]">누가 어떤 문서를 어떻게 수정했는지 확인할 수 있습니다.</p>
      </div>
      <div className="divide-y divide-[#eee]">
        {filtered.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#777]">기록이 없습니다.</div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#66788a]"><span>{formatDate(log.timestamp)}</span><span>·</span><span>{log.actorName}</span><span>·</span><span>{log.actorRole}</span></div>
              <div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" onClick={() => onNavigate(log.pageId)} className="text-left text-[18px] font-semibold text-[#0b4f9b] hover:underline">{log.pageTitle}</button><span className="rounded bg-[#eef5fb] px-2 py-1 text-xs text-[#355b82]">{log.summary}</span></div>
              {log.changes && log.changes.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {log.changes.map((change, idx) => (
                    <div key={`${log.id}-${change.field}-${idx}`} className="rounded border border-[#e6edf5] bg-[#fafcff] p-4">
                      <div className="mb-2 text-sm font-semibold text-[#243b53]">{change.field}</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-[#999]">수정 전</div>
                          <div className="rounded border border-[#eee] bg-white px-3 py-2 text-sm text-[#555]">{getChangePreview(change.before)}</div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-semibold text-[#999]">수정 후</div>
                          <div className="rounded border border-[#eee] bg-white px-3 py-2 text-sm text-[#555]">{getChangePreview(change.after)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-[#888]">상세 변경 내역 없음</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminPeoplePanel({
  users,
  actor,
  onSaveUsers,
}: {
  users: UserAccount[];
  actor: UserAccount;
  onSaveUsers: (nextUsers: UserAccount[], log: AuditLog) => void;
}) {
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    loginId: '',
    password: '',
    name: '',
    role: '인턴',
    team: '' as TeamKey | '',
    isAdmin: false,
    isActive: true,
  });

  useEffect(() => {
    if (mode === 'update' && selectedId) {
      const target = users.find((user) => user.id === selectedId);
      if (target) {
        setForm({
          loginId: target.loginId,
          password: target.password,
          name: target.name,
          role: target.role,
          team: (target.team ?? '') as TeamKey | '',
          isAdmin: target.isAdmin,
          isActive: target.isActive,
        });
      }
    }

    if (mode === 'create') {
      setSelectedId('');
      setForm({
        loginId: '',
        password: '',
        name: '',
        role: '인턴',
        team: '' as TeamKey | '',
        isAdmin: false,
        isActive: true,
      });
    }
  }, [mode, selectedId, users]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.loginId.trim() || !form.password.trim() || !form.name.trim()) {
      alert('이름, 아이디, 비밀번호를 입력해주세요.');
      return;
    }

    const duplicateLogin = users.find((user) => user.loginId === form.loginId.trim() && user.id !== selectedId);
    if (duplicateLogin) {
      alert('이미 사용 중인 로그인 아이디예요.');
      return;
    }

    if (mode === 'create') {
      const newUser: UserAccount = {
        id: uuid(),
        loginId: form.loginId.trim(),
        password: form.password.trim(),
        name: form.name.trim(),
        role: form.role.trim() || '인턴',
        team: form.team || null,
        isAdmin: form.isAdmin,
        isActive: form.isActive,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      onSaveUsers(
        [...users, newUser],
        {
          id: uuid(),
          pageId: newUser.id,
          pageTitle: newUser.name,
          action: 'member_add',
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          timestamp: nowIso(),
          summary: '구성원 추가',
          changes: [],
        },
      );
      alert('구성원을 추가했어요.');
      setMode('create');
      return;
    }

    const nextUsers = users.map((user) =>
      user.id === selectedId
        ? {
            ...user,
            loginId: form.loginId.trim(),
            password: form.password.trim(),
            name: form.name.trim(),
            role: form.role.trim() || '인턴',
            team: form.team || null,
            isAdmin: form.isAdmin,
            isActive: form.isActive,
            updatedAt: nowIso(),
          }
        : user,
    );

    const updatedUser = nextUsers.find((user) => user.id === selectedId)!;

    onSaveUsers(
      nextUsers,
      {
        id: uuid(),
        pageId: updatedUser.id,
        pageTitle: updatedUser.name,
        action: 'member_update',
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        timestamp: nowIso(),
        summary: '구성원 수정',
        changes: [],
      },
    );
    alert('구성원을 수정했어요.');
    setMode('create');
  };

  return (
    <div className="rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-4">
        <h2 className="text-[22px] font-bold text-[#243b53]">구성원 관리</h2>
        <p className="mt-1 text-sm text-[#66788a]">하드코딩 기반 구성원 목록을 브라우저에 저장합니다.</p>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('create')} className={`rounded px-3 py-2 text-sm ${mode === 'create' ? 'bg-[#0b3f79] text-white' : 'border border-[#d9d9d9] bg-white text-[#444]'}`}>새 사람 추가</button>
            <button type="button" onClick={() => setMode('update')} className={`rounded px-3 py-2 text-sm ${mode === 'update' ? 'bg-[#0b3f79] text-white' : 'border border-[#d9d9d9] bg-white text-[#444]'}`}>기존 사람 수정</button>
          </div>

          {mode === 'update' ? (
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full rounded border border-[#ddd] px-3 py-3 text-sm outline-none">
              <option value="">수정할 사람 선택</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.team ?? '미배정'}
                </option>
              ))}
            </select>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="이름" />
            <input value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="직무" />
            <input value={form.loginId} onChange={(e) => setForm((prev) => ({ ...prev, loginId: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="로그인 아이디" />
            <input value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="비밀번호" />
            <select value={form.team} onChange={(e) => setForm((prev) => ({ ...prev, team: e.target.value as TeamKey | '' }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none">
              <option value="">팀 선택</option>
              {TEAM_ORDER.map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded border border-[#ddd] px-3 py-3 text-sm text-[#444]"><input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm((prev) => ({ ...prev, isAdmin: e.target.checked }))} />관리자 권한</label>
          </div>

          <button type="submit" className="inline-flex items-center gap-2 rounded bg-[#0b3f79] px-4 py-3 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            {mode === 'create' ? '구성원 추가하기' : '구성원 저장하기'}
          </button>
        </form>

        <div className="rounded border border-[#e5e5e5] bg-[#fcfcfd] p-4">
          <div className="mb-3 text-sm font-semibold text-[#243b53]">현재 전체 구성원</div>
          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {users.map((user) => (
              <div key={user.id} className="rounded border border-[#eee] bg-white px-3 py-3 text-sm">
                <div className="font-semibold text-[#243b53]">{user.name}{user.isAdmin ? ' (관리자)' : ''}</div>
                <div className="mt-1 text-[#66788a]">{user.team ?? '미배정'} · {user.role}</div>
                <div className="mt-1 text-xs text-[#999]">아이디: {user.loginId}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WikiArticle({
  page,
  editing,
  draft,
  setDraft,
  onEdit,
  onSave,
  onShare,
  onNavigate,
  people,
  onBack,
  canGoBack,
  isAdmin,
  conflictMessage,
}: {
  page: WikiPage;
  editing: boolean;
  draft: WikiPage | null;
  setDraft: React.Dispatch<React.SetStateAction<WikiPage | null>>;
  onEdit: () => void;
  onSave: () => void;
  onShare: () => void;
  onNavigate: (pageId: string) => void;
  people: WikiPage[];
  onBack: () => void;
  canGoBack: boolean;
  isAdmin: boolean;
  conflictMessage: string;
}) {
  const toc = useMemo(() => buildToc(editing && draft ? draft.content : page.content), [editing, draft, page.content]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  if (!draft && editing) return null;

  const canEditThisPage = !(page.id === ADMIN_PAGE_ID && !isAdmin);

  return (
    <div className="rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canGoBack ? (
              <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f7f7f7]">
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </button>
            ) : null}
          </div>
          <ActionButtons editing={editing} disabled={!canEditThisPage} onEdit={onEdit} onSave={onSave} onShare={onShare} />
        </div>

        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[#111]">{editing && draft ? draft.title : page.title}</h1>
          <div className="mt-1 text-[14px] text-[#5a7ca2]">({page.category || '문서'}에서 넘어옴) · rev.{page.revision}</div>
        </div>

        {conflictMessage ? <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{conflictMessage}</div> : null}
      </div>

      <div className="grid gap-8 px-5 py-8 md:grid-cols-[1fr_250px] md:px-6">
        <div>
          {page.id === ADMIN_PAGE_ID && !isAdmin ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">관리자만 접근할 수 있습니다.</div>
          ) : editing && canEditThisPage && draft ? (
            <div>
              <div className="space-y-3">
                <input value={draft.title} onChange={(e) => setDraft((prev) => prev ? ({ ...prev, title: e.target.value }) : prev)} className="w-full rounded border border-[#ddd] px-4 py-3 text-[22px] font-bold outline-none" />
                <input value={draft.summary} onChange={(e) => setDraft((prev) => prev ? ({ ...prev, summary: e.target.value }) : prev)} className="w-full rounded border border-[#ddd] px-4 py-3 text-sm outline-none" placeholder="요약" />
                <EditorImageTools
                  onAppendImage={async (file) => {
                    const fakePath = typeof file === 'object' && 'name' in file ? file.name : 'image';
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            content: `${prev.content}\n\n{{image:${fakePath}|${fakePath}}}`.trim(),
                          }
                        : prev,
                    );
                  }}
                />
                <EditorStyleToolbar textareaRef={textareaRef} setDraft={setDraft} />
                <textarea ref={textareaRef} value={draft.content} onChange={(e) => setDraft((prev) => prev ? ({ ...prev, content: e.target.value }) : prev)} className="min-h-[520px] w-full rounded border border-[#ddd] px-4 py-4 text-sm leading-7 outline-none" />
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 text-[15px] text-[#666]">최근 수정: {formatDate(page.updatedAt)} · {page.updatedByName ?? page.updatedBy}</div>
              <div className="prose max-w-none prose-p:my-0">{renderWikiText(page.content, onNavigate)}</div>
              {page.category === '팀 문서' && page.team ? (
                  <TeamMembersBlock people={people} team={page.team} onNavigate={onNavigate} />
                ) : null}
            </div>
          )}
        </div>

        <div><TocBox toc={toc} /></div>
      </div>
    </div>
  );
}

export default function YulturnWikiPage() {
  const [loading, setLoading] = useState(true);
  const [wikiData, setWikiData] = useState<WikiData>({ people: [], sections: [], auditLogs: [] });
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [session, setSession] = useState<UserAccount | null>(null);
  const [search, setSearch] = useState('');
  const [currentPageId, setCurrentPageId] = useState(HOME_PAGE_ID);
  const [history, setHistory] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WikiPage | null>(null);
  const [conflictMessage, setConflictMessage] = useState('');

  const allPages = useMemo(() => [...wikiData.sections, ...wikiData.people], [wikiData]);
  const currentPage = useMemo(() => allPages.find((page) => page.id === currentPageId) ?? wikiData.sections[0] ?? null, [allPages, currentPageId, wikiData.sections]);

  useEffect(() => {
    const init = () => {
      const loadedSession = loadSession();
      const stored = loadStorage();

      const people = updatePersonPages(stored.users, stored.wikiData.people);
      const next = {
        wikiData: {
          ...stored.wikiData,
          people,
        },
        users: stored.users,
      };

      setWikiData(next.wikiData);
      setUsers(next.users);

      if (loadedSession) {
        const matched = next.users.find((user) => user.id === loadedSession.id || user.loginId === loadedSession.loginId);
        if (matched) {
          setSession(matched);
          saveSession(matched);
        }
      }

      saveStorage(next);
      setLoading(false);
    };

    init();
  }, []);

  const persistAll = (nextWikiData: WikiData, nextUsers: UserAccount[]) => {
    const syncedPeople = updatePersonPages(nextUsers, nextWikiData.people);
    const payload = {
      wikiData: {
        ...nextWikiData,
        people: syncedPeople,
      },
      users: nextUsers,
    };
    setWikiData(payload.wikiData);
    setUsers(payload.users);
    saveStorage(payload);

    setSession((prev) => {
      if (!prev) return prev;
      const matched = nextUsers.find((user) => user.id === prev.id);
      if (matched) {
        saveSession(matched);
        return matched;
      }
      return prev;
    });
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allPages.filter((page) => [page.title, page.summary, page.content].join(' ').toLowerCase().includes(q)).slice(0, 20);
  }, [allPages, search]);

  const navigate = (pageId: string) => {
    if (currentPageId !== pageId) setHistory((prev) => [...prev, currentPageId]);
    setCurrentPageId(pageId);
    setEditing(false);
    setDraft(null);
    setConflictMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setHistory((prev) => {
      const next = [...prev];
      const last = next.pop();
      if (last) setCurrentPageId(last);
      return next;
    });
    setEditing(false);
    setDraft(null);
    setConflictMessage('');
  };

  const onLogin = (user: UserAccount) => {
    setSession(user);
    saveSession(user);
  };

  const onLogout = () => {
    setSession(null);
    saveSession(null);
    setEditing(false);
    setDraft(null);
    setCurrentPageId(HOME_PAGE_ID);
    setHistory([]);
  };

  const onEdit = () => {
    if (!currentPage || !session) return;
    setDraft({ ...currentPage });
    setEditing(true);
    setConflictMessage('');
  };

  const onSave = () => {
    if (!currentPage || !draft || !session) return;

    const updatedPage: WikiPage = {
      ...draft,
      revision: currentPage.revision + 1,
      updatedAt: nowIso(),
      updatedBy: session.id,
      updatedByName: session.name,
    };

    const changes = buildAuditChanges(currentPage, updatedPage);

    const nextSections = wikiData.sections.map((page) => (page.id === updatedPage.id ? updatedPage : page));
    const nextPeople = wikiData.people.map((page) => (page.id === updatedPage.id ? updatedPage : page));

    const nextWikiData: WikiData = {
      sections: nextSections,
      people: nextPeople,
      auditLogs: [
        ...wikiData.auditLogs,
        {
          id: uuid(),
          pageId: updatedPage.id,
          pageTitle: updatedPage.title,
          action: 'update',
          actorId: session.id,
          actorName: session.name,
          actorRole: session.role,
          timestamp: nowIso(),
          summary: '문서 수정',
          changes,
        },
      ],
    };

    persistAll(nextWikiData, users);
    setEditing(false);
    setDraft(null);
  };

  const onShare = async () => {
    if (!currentPage) return;
    const value = `${window.location.origin}${window.location.pathname}#${currentPage.id}`;
    try {
      await navigator.clipboard.writeText(value);
      alert('문서 링크를 복사했어요.');
    } catch {
      alert('링크 복사에 실패했어요.');
    }
  };

  const onSaveUsers = (nextUsers: UserAccount[], log: AuditLog) => {
    const nextWikiData: WikiData = {
      ...wikiData,
      people: updatePersonPages(nextUsers, wikiData.people),
      auditLogs: [...wikiData.auditLogs, log],
    };
    persistAll(nextWikiData, nextUsers);
  };

  useEffect(() => {
    if (!isBrowser()) return;
    const hash = window.location.hash.replace('#', '');
    if (hash) setCurrentPageId(hash);
  }, []);

  useEffect(() => {
    if (!isBrowser() || !currentPageId) return;
    window.history.replaceState(null, '', `#${currentPageId}`);
  }, [currentPageId]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#555]">불러오는 중...</div>;
  }

  if (!session) {
    return <LoginScreen onLogin={onLogin} users={users} />;
  }

  if (!currentPage) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#555]">문서를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <TopBar user={session} search={search} setSearch={setSearch} searchResults={searchResults} onLogout={onLogout} onGoHome={() => navigate(HOME_PAGE_ID)} onSelectSearch={navigate} onGoAdmin={() => navigate(ADMIN_PAGE_ID)} />
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <WikiArticle page={currentPage} editing={editing} draft={draft} setDraft={setDraft} onEdit={onEdit} onSave={onSave} onShare={onShare} onNavigate={navigate} people={wikiData.people} onBack={goBack} canGoBack={history.length > 0} isAdmin={session.isAdmin} conflictMessage={conflictMessage} />

          {currentPage.id === ADMIN_PAGE_ID && session.isAdmin ? (
            <>
              <AdminPeoplePanel users={users} actor={session} onSaveUsers={onSaveUsers} />
              <div className="rounded border border-[#ddd] bg-white">
                <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-4">
                  <h2 className="text-[22px] font-bold text-[#243b53]">전체 문서 현황</h2>
                  <p className="mt-1 text-sm text-[#66788a]">모든 문서를 한 번에 볼 수 있습니다.</p>
                </div>
                <div className="grid gap-3 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
                  {[...wikiData.sections, ...wikiData.people].map((page) => (
                    <button key={page.id} type="button" onClick={() => navigate(page.id)} className="rounded border border-[#e6edf5] bg-[#fafcff] p-4 text-left hover:bg-white">
                      <div className="text-sm font-semibold text-[#243b53]">{page.title}</div>
                      <div className="mt-1 text-xs text-[#66788a]">{page.category}</div>
                      <div className="mt-2 text-xs text-[#999]">rev.{page.revision} · {formatDate(page.updatedAt)}</div>
                    </button>
                  ))}
                </div>
              </div>
              <AdminAuditPanel logs={wikiData.auditLogs} onNavigate={navigate} />
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <RecentChanges logs={wikiData.auditLogs} onNavigate={navigate} />
          <div className="rounded border border-[#ddd] bg-white p-4 text-sm text-[#555]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#243b53]"><Users className="h-4 w-4" />하드코딩 버전 안내</div>
            <p>현재 버전은 팀/구성원/로그인 계정을 코드 + localStorage 기준으로 안정적으로 관리합니다.</p>
            <p className="mt-2">Supabase 스키마 문제 없이 바로 쓸 수 있는 단순 버전입니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}