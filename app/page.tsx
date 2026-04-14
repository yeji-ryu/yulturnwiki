'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Lock,
  User,
  Save,
  Share2,
  Pencil,
  Image as ImageIcon,
  ArrowLeft,
  Type,
  Bold,
  Palette,
  Shield,
  Strikethrough,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type UserAccount = {
  id: string;
  password: string;
  name: string;
  role: string;
  isAdmin: boolean;
};

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
  | 'BD인프라팀'
  | '법무지원팀'
  | '고객지원팀'
  | '전략기획실'
  | '리서치팀';

type WikiPage = {
  id: string;
  title: string;
  summary: string;
  content: string;
  updatedAt: string;
  updatedBy: string;
  category?: string;
  icon?: string;
  group?: string;
  team?: TeamKey;
};

type AuditChange = {
  field: 'title' | 'summary' | 'content';
  before: string;
  after: string;
};

type AuditLog = {
  id: string;
  pageId: string;
  pageTitle: string;
  action: 'seed' | 'update';
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

type WikiPageRow = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  category: string | null;
  icon: string | null;
  group: string | null;
  team: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

type AuditLogRow = {
  id: string;
  page_id: string;
  page_title: string | null;
  action: 'seed' | 'update';
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  timestamp: string | null;
  summary: string | null;
};

type AuditChangeRow = {
  id: number;
  log_id: string;
  field: 'title' | 'summary' | 'content';
  before: string | null;
  after: string | null;
};

const HARD_CODED_USERS: UserAccount[] = [
  { id: '강민희', password: '1038', name: '강민희', role: '인턴', isAdmin: false },
  { id: '김민지', password: '2102', name: '김민지', role: '인턴', isAdmin: false },
  { id: '김서진', password: '3071', name: '김서진', role: '인턴', isAdmin: false },
  { id: '김재연', password: '3091', name: '김재연', role: '인턴', isAdmin: false },
  { id: '김지현', password: '2164', name: '김지현', role: '인턴', isAdmin: false },
  { id: '김태희', password: '0043', name: '김태희', role: '인턴', isAdmin: false },
  { id: '박세민', password: '0109', name: '박세민', role: '인턴', isAdmin: false },
  { id: '박주희', password: '2175', name: '박주희', role: '인턴', isAdmin: false },
  { id: '신나영', password: '9053', name: '신나영', role: '인턴', isAdmin: false },
  { id: '엄선우', password: '2126', name: '엄선우', role: '인턴', isAdmin: false },
  { id: '연제민', password: '1043', name: '연제민', role: '인턴', isAdmin: false },
  { id: '유예지', password: '4217', name: '유예지', role: '인턴', isAdmin: false },
  { id: '이수하', password: '1075', name: '이수하', role: '인턴', isAdmin: false },
  { id: '이예원', password: '3054', name: '이예원', role: '인턴', isAdmin: false },
  { id: '이재희', password: '1104', name: '이재희', role: '인턴', isAdmin: false },
  { id: '이채영', password: '0117', name: '이채영', role: '인턴', isAdmin: false },
  { id: '이초원', password: '2159', name: '이초원', role: '인턴', isAdmin: false },
  { id: '장서현', password: '2113', name: '장서현', role: '인턴', isAdmin: false },
  { id: '정도연', password: '1050', name: '정도연', role: '인턴', isAdmin: false },
  { id: '정성태', password: '0015', name: '정성태', role: '인턴', isAdmin: false },
  { id: '조민정', password: '1092', name: '조민정', role: '인턴', isAdmin: false },
  { id: '원혁진', password: '2060', name: '원혁진', role: '인턴', isAdmin: false },
  { id: 'admin', password: '123', name: '운영자', role: '관리자', isAdmin: true },
];

const SESSION_KEY = 'yulturn-wiki-session-v1';
const ADMIN_PAGE_ID = 'admin-dashboard';
const nowIso = new Date().toISOString();

const TEAM_ORDER: TeamKey[] = [
  '회계팀',
  '빌링팀',
  '컬처팀',
  '피플팀',
  '업무지원팀',
  '전략마케팅팀',
  '인재개발팀',
  '급여팀',
  '인프라보안팀',
  'BD인프라팀',
  '법무지원팀',
  '고객지원팀',
  '전략기획실',
  '리서치팀',
];

const TEAM_PAGE_MAP: Record<TeamKey, string> = {
  회계팀: 'team-accounting',
  빌링팀: 'team-billing',
  컬처팀: 'team-education',
  피플팀: 'team-people',
  업무지원팀: 'team-support',
  전략마케팅팀: 'team-marketing',
  인재개발팀: 'team-hr-development',
  급여팀: 'team-payroll',
  인프라보안팀: 'team-infosec',
  BD인프라팀: 'team-bd-infra',
  법무지원팀: 'team-legal-support',
  고객지원팀: 'team-customer-support',
  전략기획실: 'team-strategy',
  리서치팀: 'team-research',
};

const TEAM_ID_TO_KEY: Record<string, TeamKey> = {
  'team-accounting': '회계팀',
  'team-billing': '빌링팀',
  'team-education': '컬처팀',
  'team-people': '피플팀',
  'team-support': '업무지원팀',
  'team-marketing': '전략마케팅팀',
  'team-hr-development': '인재개발팀',
  'team-payroll': '급여팀',
  'team-infosec': '인프라보안팀',
  'team-bd-infra': 'BD인프라팀',
  'team-legal-support': '법무지원팀',
  'team-customer-support': '고객지원팀',
  'team-strategy': '전략기획실',
  'team-research': '리서치팀',
};

const USER_TEAM_MAP: Partial<Record<string, TeamKey>> = {
  강민희: '회계팀',
  김민지: '빌링팀',
  김서진: '빌링팀',
  김재연: '전략기획실',
  김지현: '컬처팀',
  김태희: '피플팀',
  박세민: '업무지원팀',
  박주희: '피플팀',
  신나영: '전략마케팅팀',
  엄선우: '인재개발팀',
  연제민: '급여팀',
  유예지: '인프라보안팀',
  이수하: '인재개발팀',
  이예원: 'BD인프라팀',
  이재희: '법무지원팀',
  이채영: '업무지원팀',
  이초원: '고객지원팀',
  장서현: '전략기획실',
  정도연: '업무지원팀',
  정성태: '리서치팀',
  조민정: '업무지원팀',
  원혁진: '회계팀'
};

function buildPersonPages(): WikiPage[] {
  return HARD_CODED_USERS.filter((user) => !user.isAdmin).map((user) => {
    const team = USER_TEAM_MAP[user.name];

    return {
      id: user.name,
      title: user.name,
      summary: `${team ?? '미배정'} ${user.role}. 개인 소개 문서입니다.`,
      team,
      content: `[인물 정보]
- 이름: ${user.name}
- 소속: ${team ?? '미배정'}
- 직무: ${user.role}

[업무 스타일]
- 추후 작성

[메모]
- 자유롭게 작성`,
      updatedAt: nowIso,
      updatedBy: 'system',
      icon: 'people',
      category: '사람 문서',
    };
  });
}

const seedData: WikiData = {
  people: buildPersonPages(),
  sections: [
    {
      id: 'main',
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
- [[interns-2026h1|2026 상반기 인턴 문서로 이동]]
- 아래 문서에서 팀 소개와 구성원을 확인할 수 있습니다.

[사내 생활 문서]
- [[cafe-tips|여율 이용 팁]]
- [[meal-tips|식대 / 식당 팁]]
- [[team-cautions|팀마다 조심해야 할 부분..?]]
- [[stories|겪은 썰 / 인수인계 메모]]

[운영 규칙]
- [[operating-rules|운영 규칙]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'interns-2026h1',
      category: '기수 문서',
      icon: 'people',
      title: '2026 상반기 인턴',
      summary: '2026 상반기 인턴 전체 구성원과 팀별 링크',
      content: `[2026 상반기 인턴]
2026 상반기 인턴 전체 문서입니다.

[팀별 이동]
- [[team-accounting|회계팀]]
- [[team-billing|빌링팀]]
- [[team-education|컬처팀]]
- [[team-people|피플팀]]
- [[team-support|업무지원팀]]
- [[team-marketing|전략마케팅팀]]
- [[team-hr-development|인재개발팀]]
- [[team-payroll|급여팀]]
- [[team-infosec|인프라보안팀]]
- [[team-bd-infra|BD인프라팀]]
- [[team-legal-support|법무지원팀]]
- [[team-customer-support|고객지원팀]]
- [[team-strategy|전략기획실]]
- [[team-research|리서치팀]]

[구성원]
- [[강민희|강민희]]
- [[김민지|김민지]]
- [[김서진|김서진]]
- [[김재연|김재연]]
- [[김지현|김지현]]
- [[김태희|김태희]]
- [[박세민|박세민]]
- [[박주희|박주희]]
- [[신나영|신나영]]
- [[엄선우|엄선우]]
- [[연제민|연제민]]
- [[유예지|유예지]]
- [[이수하|이수하]]
- [[이예원|이예원]]
- [[이재희|이재희]]
- [[이채영|이채영]]
- [[이초원|이초원]]
- [[장서현|장서현]]
- [[정도연|정도연]]
- [[정성태|정성태]]
- [[조민정|조민정]]
- [[원혁진|원혁진]]

[안내]
- 팀 이름을 누르면 팀 소개 화면으로 이동합니다.
- 팀 소개 문서에서 구성원 이름을 눌러 개인 문서로 이동할 수 있습니다.
- 팀과 구성원 추가는 화면에서 하지 않고 코드에서 직접 하드코딩합니다.`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-accounting',
      category: '팀 문서',
      icon: 'people',
      title: '회계팀',
      summary: '2026 상반기 회계팀 소개 문서',
      content: `[팀 소개]
회계팀은 재무 관리 및 회계 처리를 담당합니다.

[분위기]
- 꼼꼼함과 책임감 중요
- 숫자 정확성 필수

[업무 팁]
- 엑셀 활용 능력 중요
- 검토 과정 필수

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-billing',
      category: '팀 문서',
      icon: 'people',
      title: '빌링팀',
      summary: '2026 상반기 빌링팀 소개 문서',
      content: `[팀 소개]
빌링팀은 청구 및 비용 정산 업무를 담당합니다.

[분위기]
- 정확성과 속도 중요
- 반복 업무 많음

[업무 팁]
- 자동화 활용 추천
- 기록 정리 습관화

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-education',
      title: '컬처팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 컬처팀 소개 문서',
      content: `[팀 소개]
컬처팀은 사내 교육 및 프로그램 운영을 담당합니다.

[분위기]
- 소통 중요
- 기획력 요구됨

[업무 팁]
- 일정 관리 필수
- 피드백 적극 반영

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-people',
      title: '피플팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 피플팀 소개 문서',
      content: `[팀 소개]
피플팀은 인사 및 조직 관리를 담당합니다.

[분위기]
- 커뮤니케이션 중요
- 조직 이해 필요

[업무 팁]
- 기록 관리 필수
- 사람 중심 사고

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-support',
      title: '업무지원팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 업무지원팀 소개 문서',
      content: `[팀 소개]
업무지원팀은 운영 보조 및 실무 지원을 담당합니다.

[분위기]
- 정확성과 응대 중요
- 빠른 대응 필요

[업무 팁]
- 체크리스트 활용
- 진행상황 공유

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-marketing',
      title: '전략마케팅팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 전략마케팅팀 소개 문서',
      content: `[팀 소개]
전략마케팅팀은 마케팅 전략 및 기획을 담당합니다.

[분위기]
- 창의성 중요
- 빠른 트렌드 반영

[업무 팁]
- 데이터 분석 필수
- 아이디어 공유

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-hr-development',
      title: '인재개발팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 인재개발팀 소개 문서',
      content: `[팀 소개]
인재개발팀은 인재 육성과 교육을 담당합니다.

[분위기]
- 성장 중심
- 피드백 활발

[업무 팁]
- 교육 설계 중요
- 참여 유도 필요

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-payroll',
      title: '급여팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 급여팀 소개 문서',
      content: `[팀 소개]
급여팀은 급여 및 보상 처리를 담당합니다.

[분위기]
- 정확성 필수
- 민감 정보 많음

[업무 팁]
- 데이터 검증 중요
- 보안 신경쓰기

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-infosec',
      title: '인프라보안팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 인프라보안팀 소개 문서',
      content: `[팀 소개]
인프라보안팀은 시스템 및 네트워크 보안을 담당합니다.

[분위기]
- 문제 해결 중심
- 기술 학습 중요

[업무 팁]
- 로그 분석 습관화
- 보안 이슈 공유

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-bd-infra',
      title: 'BD인프라팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 BD인프라팀 소개 문서',
      content: `[팀 소개]
BD인프라팀은 비즈니스 인프라 구축을 담당합니다.

[분위기]
- 협업 중요
- 다양한 업무 경험

[업무 팁]
- 커뮤니케이션 필수
- 업무 흐름 이해

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-legal-support',
      title: '법무지원팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 법무지원팀 소개 문서',
      content: `[팀 소개]
법무지원팀은 법률 지원 업무를 담당합니다.

[분위기]
- 정확성 중요
- 문서 중심

[업무 팁]
- 기록 관리 필수
- 검토 습관화

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-customer-support',
      title: '고객지원팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 고객지원팀 소개 문서',
      content: `[팀 소개]
고객지원팀은 고객 응대 및 지원을 담당합니다.

[분위기]
- 친절 중요
- 빠른 대응 필요

[업무 팁]
- 응대 매뉴얼 숙지
- 기록 남기기

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-strategy',
      title: '전략기획실',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 전략기획실 소개 문서',
      content: `[팀 소개]
전략기획실은 조직 전략 및 기획을 담당합니다.

[분위기]
- 분석 중심
- 큰 그림 중요

[업무 팁]
- 자료 조사 필수
- 구조적 사고

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: 'team-research',
      title: '리서치팀',
      category: '팀 문서',
      icon: 'people',
      summary: '2026 상반기 리서치팀 소개 문서',
      content: `[팀 소개]
리서치팀은 조사 및 분석 업무를 담당합니다.

[분위기]
- 데이터 중심
- 분석력 중요

[업무 팁]
- 자료 정리 습관화
- 인사이트 도출

[관련 문서]
- [[interns-2026h1|2026 상반기 인턴]]`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
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
      updatedAt: nowIso,
      updatedBy: 'system',
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
      updatedAt: nowIso,
      updatedBy: 'system',
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
      updatedAt: nowIso,
      updatedBy: 'system',
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
      updatedAt: nowIso,
      updatedBy: 'system',
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
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    {
      id: ADMIN_PAGE_ID,
      category: '관리자',
      icon: 'shield',
      title: '관리자 페이지',
      summary: '관리자 전용 수정 기록 확인 페이지',
      content: `[관리자 안내]
이 페이지는 관리자만 접근할 수 있습니다.

[확인 가능 항목]
- 누가 수정했는지
- 언제 수정했는지
- 어떤 문서를 수정했는지
- 무엇이 어떻게 바뀌었는지`,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
  ],
  auditLogs: [
    {
      id: 'log-seed-1',
      pageId: 'main',
      pageTitle: '대문',
      action: 'seed',
      actorId: 'system',
      actorName: 'system',
      actorRole: 'system',
      timestamp: nowIso,
      summary: '초기 데이터 생성',
      changes: [],
    },
  ],
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function mapRowToWikiPage(row: WikiPageRow): WikiPage {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? '',
    content: row.content ?? '',
    category: row.category ?? undefined,
    icon: row.icon ?? undefined,
    group: row.group ?? undefined,
    team: (row.team as TeamKey | null) ?? undefined,
    updatedAt: row.updated_at ?? new Date().toISOString(),
    updatedBy: row.updated_by ?? 'system',
  };
}

function mapAuditRows(logs: AuditLogRow[], changes: AuditChangeRow[]): AuditLog[] {
  return logs.map((log) => ({
    id: log.id,
    pageId: log.page_id,
    pageTitle: log.page_title ?? '',
    action: log.action,
    actorId: log.actor_id ?? '',
    actorName: log.actor_name ?? '',
    actorRole: log.actor_role ?? '',
    timestamp: log.timestamp ?? new Date().toISOString(),
    summary: log.summary ?? '',
    changes: changes
      .filter((change) => change.log_id === log.id)
      .map((change) => ({
        field: change.field,
        before: change.before ?? '',
        after: change.after ?? '',
      })),
  }));
}

async function seedSupabaseIfEmpty() {
  const { count, error } = await supabase
    .from('wiki_pages')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const seedPages = [...seedData.sections, ...seedData.people].map((page) => ({
    id: page.id,
    title: page.title,
    summary: page.summary,
    content: page.content,
    category: page.category ?? null,
    icon: page.icon ?? null,
    group: page.group ?? null,
    team: page.team ?? null,
    updated_at: page.updatedAt,
    updated_by: page.updatedBy,
  }));

  const { error: insertPagesError } = await supabase
    .from('wiki_pages')
    .insert(seedPages);

  if (insertPagesError) throw insertPagesError;

  const seedLogs = seedData.auditLogs.map((log) => ({
    id: log.id,
    page_id: log.pageId,
    page_title: log.pageTitle,
    action: log.action,
    actor_id: log.actorId,
    actor_name: log.actorName,
    actor_role: log.actorRole,
    timestamp: log.timestamp,
    summary: log.summary,
  }));

  const { error: insertLogsError } = await supabase
    .from('audit_logs')
    .insert(seedLogs);

  if (insertLogsError) throw insertLogsError;
}

async function syncFixedPagesToSupabase() {
  const fixedPageIds = new Set([
    'main',
    'interns-2026h1',
    'team-accounting',
    'team-billing',
    'team-knowledge',
    'team-education',
    'team-people',
    'team-support',
    'team-marketing',
    'team-hr-development',
    'team-payroll',
    'team-infosec',
    'team-bd-infra',
    'team-legal-support',
    'team-customer-support',
    'team-strategy',
    'team-research',
    'operating-rules',
    ADMIN_PAGE_ID,
  ]);

  const fixedPages = [...seedData.sections, ...seedData.people]
    .filter((page) => fixedPageIds.has(page.id))
    .map((page) => ({
      id: page.id,
      title: page.title,
      summary: page.summary,
      content: page.content,
      category: page.category ?? null,
      icon: page.icon ?? null,
      group: page.group ?? null,
      team: page.team ?? null,
      updated_at: page.updatedAt,
      updated_by: page.updatedBy,
    }));

  const { error } = await supabase.from('wiki_pages').upsert(fixedPages, {
    onConflict: 'id',
  });

  if (error) throw error;
}

async function loadDataFromSupabase(): Promise<WikiData> {
  await seedSupabaseIfEmpty();
  await syncFixedPagesToSupabase();

  const [
    { data: pageRows, error: pageError },
    { data: logRows, error: logError },
    { data: changeRows, error: changeError },
  ] = await Promise.all([
    supabase.from('wiki_pages').select('*').order('id'),
    supabase.from('audit_logs').select('*').order('timestamp', { ascending: true }),
    supabase.from('audit_changes').select('*').order('id', { ascending: true }),
  ]);

  if (pageError) throw pageError;
  if (logError) throw logError;
  if (changeError) throw changeError;

  const pages = ((pageRows ?? []) as WikiPageRow[]).map(mapRowToWikiPage);

  return {
    people: pages.filter((page) => page.category === '사람 문서'),
    sections: pages.filter((page) => page.category !== '사람 문서'),
    auditLogs: mapAuditRows(
      (logRows ?? []) as AuditLogRow[],
      (changeRows ?? []) as AuditChangeRow[],
    ),
  };
}

async function savePageToSupabase(page: WikiPage) {
  const { error } = await supabase.from('wiki_pages').upsert({
    id: page.id,
    title: page.title,
    summary: page.summary,
    content: page.content,
    category: page.category ?? null,
    icon: page.icon ?? null,
    group: page.group ?? null,
    team: page.team ?? null,
    updated_at: page.updatedAt,
    updated_by: page.updatedBy,
  });

  if (error) throw error;
}

async function saveAuditLogToSupabase(log: AuditLog) {
  const { changes = [], ...rest } = log;

  const { error: logError } = await supabase.from('audit_logs').insert({
    id: rest.id,
    page_id: rest.pageId,
    page_title: rest.pageTitle,
    action: rest.action,
    actor_id: rest.actorId,
    actor_name: rest.actorName,
    actor_role: rest.actorRole,
    timestamp: rest.timestamp,
    summary: rest.summary,
  });

  if (logError) throw logError;

  if (changes.length > 0) {
    const { error: changesError } = await supabase.from('audit_changes').insert(
      changes.map((change) => ({
        log_id: rest.id,
        field: change.field,
        before: change.before,
        after: change.after,
      })),
    );

    if (changesError) throw changesError;
  }
}

async function uploadImageToSupabase(file: File) {
  const safeName = file.name
  .replace(/\s+/g, '-')           // 공백 → -
  .replace(/[^a-zA-Z0-9.\-_]/g, ''); // 한글/특수문자 제거
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('wiki-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('uploadError full:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from('wiki-images').getPublicUrl(filePath);

  return {
    filePath: uploadData?.path ?? filePath,
    fileName: file.name,
    publicUrl: data.publicUrl,
  };
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

function loadSession(): UserAccount | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UserAccount;
    const matched = HARD_CODED_USERS.find(
      (user) => user.id === parsed.id && user.password === parsed.password,
    );

    return matched ?? null;
  } catch (error) {
    console.error('loadSession error:', error);
    return null;
  }
}

function saveSession(user: UserAccount | null) {
  if (!isBrowser()) return;

  try {
    if (!user) {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('saveSession error:', error);
  }
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

const STYLE_TAGS = ['red', 'green', 'blue', 'bold', 'big', 'huge', 'strike'] as const;
type StyleTag = (typeof STYLE_TAGS)[number];

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

function parseStyledInline(
  text: string,
  onNavigate: (pageId: string) => void,
): React.ReactNode[] {
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
      nodes.push(
        <React.Fragment key={`text-${keyIndex++}`}>
          {text.slice(cursor)}
        </React.Fragment>,
      );
      break;
    }

    if (nextIndex > cursor) {
      nodes.push(
        <React.Fragment key={`text-${keyIndex++}`}>
          {text.slice(cursor, nextIndex)}
        </React.Fragment>,
      );
      cursor = nextIndex;
      continue;
    }

    if (wikiIndex === cursor) {
      const wikiClose = text.indexOf(']]', cursor);
      if (wikiClose === -1) {
        nodes.push(
          <React.Fragment key={`text-${keyIndex++}`}>
            {text.slice(cursor)}
          </React.Fragment>,
        );
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
        nodes.push(
          <React.Fragment key={`text-${keyIndex++}`}>
            {openToken}
          </React.Fragment>,
        );
        cursor = contentStart;
        continue;
      }

      const innerText = text.slice(contentStart, closeIndex);

      nodes.push(
        <span
          key={`style-${keyIndex++}`}
          className={getStyledClasses(nearestStyleTag)}
        >
          {parseStyledInline(innerText, onNavigate)}
        </span>,
      );

      cursor = closeIndex + closeToken.length;
      continue;
    }

    nodes.push(
      <React.Fragment key={`text-${keyIndex++}`}>
        {text[cursor]}
      </React.Fragment>,
    );
    cursor += 1;
  }

  return nodes;
}

function parseImageToken(value: string) {
  const match = value.match(/^\{\{image:([^|}]+)\|([^}]+)\}\}$/);
  if (!match) return null;

  return {
    path: match[1],
    name: match[2],
  };
}

function renderWikiText(
  text: string,
  onNavigate: (pageId: string) => void,
): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let sectionIndex = -1;

  const flushList = () => {
    if (listItems.length === 0) return;

    elements.push(
      <ul
        key={`list-${elements.length}`}
        className="my-2 ml-6 list-disc space-y-1 text-[15px] leading-8 text-[#444]"
      >
        {listItems.map((item, idx) => {
          const imageToken = parseImageToken(item);

            if (imageToken) {
              const { data } = supabase.storage.from('wiki-images').getPublicUrl(imageToken.path);

              return (
                <li key={`${item}-${idx}`} className="ml-[-24px] list-none">
                  <figure>
                    <img
                      src={data.publicUrl}
                      alt={imageToken.name}
                      className="max-h-[420px] max-w-full rounded border border-[#ddd]"
                    />
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
        <h2
          key={`heading-${index}`}
          id={`section-${sectionIndex}`}
          className="mt-10 mb-3 border-b border-[#e5e5e5] pb-2 text-[20px] font-normal text-[#243b53]"
        >
          {label}
        </h2>,
      );
      return;
    }

        const imageToken = parseImageToken(trimmed);
    if (imageToken) {
      flushList();

      const { data } = supabase.storage.from('wiki-images').getPublicUrl(imageToken.path);

      elements.push(
        <figure key={`image-${index}`} className="my-4">
          <img
            src={data.publicUrl}
            alt={imageToken.name}
            className="max-h-[520px] max-w-full rounded border border-[#ddd]"
          />
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

function YulturnLogo({ white = true }: { white?: boolean }) {
  return (
    <div className="flex items-center">
      <div
        className={`text-[36px] font-extrabold tracking-[-0.04em] ${
          white ? 'text-white' : 'text-[#0b3f79]'
        }`}
      >
        율턴위키
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: UserAccount) => void }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const found = HARD_CODED_USERS.find(
      (u) => u.id === id.trim() && u.password === password,
    );

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
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-8">
              <div className="text-5xl font-extrabold tracking-[-0.04em] text-white">
                율턴위키
              </div>
              <div className="mt-2 text-sm text-white/75">율촌 인턴 내부 위키</div>
            </div>

            <div className="max-w-2xl rounded-[28px] border border-white/10 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-md">
              <h1 className="text-3xl font-bold">YulturnWiki</h1>
              <p className="mt-4 text-base leading-7 text-white/85">
                율촌 인턴끼리만 공유하는 내부 위키입니다.
                <br />
                비밀 유지 해주세요.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-center px-6 py-10 lg:px-10">
          <motion.form
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            onSubmit={submit}
            className="w-full max-w-md rounded-[30px] bg-white p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-[#0b3f79] p-3 text-white">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">로그인</h2>
                <p className="text-sm text-slate-500">허용된 계정만 접근 가능합니다.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  아이디
                </label>
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0b3f79]"
                  placeholder="아이디 입력"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0b3f79]"
                  placeholder="비밀번호 입력"
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="mt-6 w-full rounded-2xl bg-[#0b3f79] px-4 py-3 font-semibold text-white transition hover:opacity-95"
            >
              입장하기
            </button>
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

        <button
          type="button"
          onClick={() => {
            if (results[0]) {
              onSelect(results[0].id);
              setOpen(false);
            }
          }}
          className="border-l border-[#ddd] px-4 py-3 text-[#555]"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {open && search.trim() ? (
        <div className="absolute left-0 right-0 top-[46px] z-30 max-h-80 overflow-y-auto rounded-b border border-t-0 border-[#d8d8d8] bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#777]">검색 결과가 없습니다.</div>
          ) : (
            results.slice(0, 8).map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => {
                  onSelect(page.id);
                  setOpen(false);
                }}
                className="block w-full border-b border-[#f0f0f0] px-4 py-3 text-left hover:bg-[#f8fbfe] last:border-b-0"
              >
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
          <SearchBox
            search={search}
            setSearch={setSearch}
            results={searchResults}
            onSelect={onSelectSearch}
          />

          {user.isAdmin ? (
            <button
              type="button"
              onClick={onGoAdmin}
              className="hidden items-center gap-2 rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10 lg:flex"
            >
              <Shield className="h-4 w-4" />
              관리자 페이지
            </button>
          ) : null}

          <div className="hidden items-center gap-2 rounded border border-white/15 bg-white/10 px-3 py-2 lg:flex">
            <User className="h-4 w-4" />
            <div className="text-sm">
              {user.name} {user.isAdmin ? '(관리자)' : ''}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

function ActionButtons({
  editing,
  onEdit,
  onSave,
  onShare,
}: {
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0 overflow-hidden rounded border border-[#d5d5d5] bg-white text-[14px] text-[#555] shadow-sm">
      <button
        type="button"
        onClick={editing ? onSave : onEdit}
        className="flex items-center gap-1 border-r border-[#e5e5e5] px-4 py-2 hover:bg-[#f7f7f7]"
      >
        {editing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        {editing ? '저장' : '편집'}
      </button>

      <button
        type="button"
        onClick={onShare}
        className="flex items-center gap-1 px-4 py-2 hover:bg-[#f7f7f7]"
      >
        <Share2 className="h-4 w-4" />
        공유
      </button>
    </div>
  );
}

function TocBox({ toc }: { toc: { id: string; label: string }[] }) {
  return (
    <div className="mb-6 w-full max-w-[260px] rounded border border-[#ddd] bg-[#f8f9fa]">
      <div className="border-b border-[#ddd] px-5 py-3 text-[18px] font-bold text-[#333]">
        목차
      </div>
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

function RecentChanges({
  logs,
  onNavigate,
}: {
  logs: AuditLog[];
  onNavigate: (id: string) => void;
}) {
  const recent = logs.slice().reverse().slice(0, 10);

  return (
    <aside className="rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#ddd] bg-[#f5f5f5] px-4 py-3 text-[15px] font-semibold text-[#444]">
        최근 바뀜
      </div>

      <div>
        {recent.map((log) => (
          <button
            key={log.id}
            type="button"
            onClick={() => onNavigate(log.pageId)}
            className="block w-full border-b border-[#eee] px-3 py-2 text-left text-[14px] text-[#555] last:border-b-0 hover:bg-[#fafafa]"
          >
            <div className="truncate text-[#0b4f9b]">
              [{formatDate(log.timestamp)}] {log.pageTitle}
            </div>
            <div className="mt-1 text-xs text-[#777]">
              {log.actorName} · {log.summary}
            </div>
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
  const members = people.filter((person) => person.team === team);

  return (
    <div className="mt-10">
      <h2 className="mb-3 border-b border-[#e5e5e5] pb-2 text-[20px] font-normal text-[#243b53]">
        구성원
      </h2>

      <div className="flex flex-wrap gap-x-3 gap-y-2 text-[15px] leading-8 text-[#444]">
        {members.length === 0 ? (
          <div className="text-[#777]">등록된 멤버가 없습니다.</div>
        ) : (
          members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onNavigate(member.id)}
              className="rounded border border-[#d9e4ef] bg-[#f8fbfe] px-3 py-1.5 text-[#0b4f9b] hover:bg-[#eef5fb]"
            >
              {member.title}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function EditorImageTools({
  onAppendImage,
}: {
  onAppendImage: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"
      >
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

          try {
            await onAppendImage(file);
          } catch (error: any) {
            console.error('image upload error:', error);
            window.alert(
              `이미지 업로드 실패: ${
                error?.message || error?.error_description || JSON.stringify(error)
              }`
            );
          }
        }}
      />

      <div className="text-xs text-[#777]">업로드한 사진은 본문에 파일명 형태로 삽입됩니다.</div>
    </div>
  );
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const nextValue =
    textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);

  return {
    value: nextValue,
    selectionStart: start + before.length,
    selectionEnd: end + before.length,
  };
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

    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, content: result.value };
    });

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => applyTag('bold')}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"
      >
        <Bold className="h-4 w-4" />
        굵게
      </button>

      <button
        type="button"
        onClick={() => applyTag('red')}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-red-600 hover:bg-[#f8f8f8]"
      >
        <Palette className="h-4 w-4" />
        빨강
      </button>

      <button
        type="button"
        onClick={() => applyTag('green')}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-green-600 hover:bg-[#f8f8f8]"
      >
        <Palette className="h-4 w-4" />
        초록
      </button>

      <button
        type="button"
        onClick={() => applyTag('blue')}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-blue-600 hover:bg-[#f8f8f8]"
      >
        <Palette className="h-4 w-4" />
        파랑
      </button>

      <button
        type="button"
        onClick={() => applyTag('big')}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"
      >
        <Type className="h-4 w-4" />
        큰글씨
      </button>

      <button
        type="button"
        onClick={() => applyTag('huge')}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"
      >
        <Type className="h-4 w-4" />
        아주큰글씨
      </button>

      <button
        type="button"
        onClick={() => applyTag('strike')}
        className="inline-flex items-center gap-2 rounded border border-[#ccd6df] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f8f8f8]"
      >
        <Strikethrough className="h-4 w-4" />
        취소선
      </button>
    </div>
  );
}

function getChangePreview(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '(비어 있음)';
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

function buildAuditChanges(before: WikiPage, after: WikiPage): AuditChange[] {
  const changes: AuditChange[] = [];

  if (before.title !== after.title) {
    changes.push({ field: 'title', before: before.title, after: after.title });
  }
  if (before.summary !== after.summary) {
    changes.push({ field: 'summary', before: before.summary, after: after.summary });
  }
  if (before.content !== after.content) {
    changes.push({ field: 'content', before: before.content, after: after.content });
  }

  return changes;
}

function fieldLabel(field: AuditChange['field']) {
  switch (field) {
    case 'title':
      return '제목';
    case 'summary':
      return '요약';
    case 'content':
      return '본문';
    default:
      return field;
  }
}

function AdminAuditPanel({
  logs,
  onNavigate,
}: {
  logs: AuditLog[];
  onNavigate: (pageId: string) => void;
}) {
  const filtered = logs.slice().reverse();

  return (
    <div className="mt-10 rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-4">
        <h2 className="text-[22px] font-bold text-[#243b53]">수정 기록</h2>
        <p className="mt-1 text-sm text-[#66788a]">
          누가 어떤 문서를 어떻게 수정했는지 확인할 수 있습니다.
        </p>
      </div>

      <div className="divide-y divide-[#eee]">
        {filtered.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#777]">기록이 없습니다.</div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#66788a]">
                <span>{formatDate(log.timestamp)}</span>
                <span>·</span>
                <span>{log.actorName}</span>
                <span>·</span>
                <span>{log.actorRole}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate(log.pageId)}
                  className="text-left text-[18px] font-semibold text-[#0b4f9b] hover:underline"
                >
                  {log.pageTitle}
                </button>
                <span className="rounded bg-[#eef5fb] px-2 py-1 text-xs text-[#355b82]">
                  {log.summary}
                </span>
              </div>

              {log.changes && log.changes.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {log.changes.map((change, idx) => (
                    <div
                      key={`${log.id}-${change.field}-${idx}`}
                      className="rounded border border-[#e6edf5] bg-[#fafcff] p-4"
                    >
                      <div className="mb-2 text-sm font-semibold text-[#243b53]">
                        {fieldLabel(change.field)}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-[#999]">수정 전</div>
                          <div className="rounded border border-[#eee] bg-white px-3 py-2 text-sm text-[#555]">
                            {getChangePreview(change.before)}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-semibold text-[#999]">수정 후</div>
                          <div className="rounded border border-[#eee] bg-white px-3 py-2 text-sm text-[#555]">
                            {getChangePreview(change.after)}
                          </div>
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
}) {
  const toc = useMemo(
    () => buildToc(editing && draft ? draft.content : page.content),
    [editing, draft, page.content],
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (!draft && editing) return null;

  const teamKey = TEAM_ID_TO_KEY[page.id];
  const canEditThisPage = !(page.id === ADMIN_PAGE_ID && !isAdmin);

  return (
    <div className="rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canGoBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm text-[#444] hover:bg-[#f7f7f7]"
              >
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </button>
            ) : null}
          </div>

          <ActionButtons
            editing={editing}
            onEdit={onEdit}
            onSave={onSave}
            onShare={onShare}
          />
        </div>

        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[#111]">
            {editing && draft ? draft.title : page.title}
          </h1>
          <div className="mt-1 text-[14px] text-[#5a7ca2]">
            ({page.category || '문서'}에서 넘어옴)
          </div>
        </div>
      </div>

      <div className="px-5 py-8 md:px-6">
        {page.id === ADMIN_PAGE_ID && !isAdmin ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            관리자만 접근할 수 있는 페이지입니다.
          </div>
        ) : !editing || !draft ? (
          <>
            <TocBox toc={toc} />
            <div className="text-[15px] leading-8 text-[#444]">
              {renderWikiText(page.content, onNavigate)}
            </div>
            {teamKey ? (
              <TeamMembersBlock people={people} team={teamKey} onNavigate={onNavigate} />
            ) : null}
          </>
        ) : (
          <div className="space-y-4">
            {!canEditThisPage ? (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                이 문서는 수정할 수 없습니다.
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-[#444]">제목</label>
              <input
                value={draft.title}
                onChange={(e) =>
                  setDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
                className="w-full rounded border border-[#ccc] px-3 py-2 outline-none focus:border-[#0b3f79]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#444]">요약</label>
              <textarea
                value={draft.summary}
                onChange={(e) =>
                  setDraft((prev) => (prev ? { ...prev, summary: e.target.value } : prev))
                }
                rows={3}
                className="w-full rounded border border-[#ccc] px-3 py-2 outline-none focus:border-[#0b3f79]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#444]">본문</label>

              <EditorStyleToolbar textareaRef={textareaRef} setDraft={setDraft} />

              <EditorImageTools
                onAppendImage={async (file) => {
                  const uploaded = await uploadImageToSupabase(file);

                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          content: `${prev.content}\n\n{{image:${uploaded.filePath}|${uploaded.fileName}}}`,
                        }
                      : prev,
                  );
                }}
              />

              <textarea
                ref={textareaRef}
                value={draft.content}
                onChange={(e) =>
                  setDraft((prev) => (prev ? { ...prev, content: e.target.value } : prev))
                }
                rows={22}
                className="w-full rounded border border-[#ccc] px-3 py-2 font-mono text-sm outline-none focus:border-[#0b3f79]"
              />

              <p className="mt-2 text-xs text-[#777]">
                문서 링크는 [[page-id|보이는이름]] 형식, 스타일 버튼은 선택한 텍스트를
                [red][/red], [big][/big], [strike][/strike] 같은 태그로 감쌉니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function YulturnWikiPrototype() {
  const [sessionUser, setSessionUser] = useState<UserAccount | null>(null);
  const [data, setData] = useState<WikiData>(seedData);
  const [selectedId, setSelectedId] = useState<string>('main');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WikiPage | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const loadedData = await loadDataFromSupabase();
        if (mounted) setData(loadedData);
      } catch (error) {
        console.error('Supabase load error:', error);
        window.alert(`Supabase load error: ${JSON.stringify(error)}`);
        if (mounted) setData(seedData);
      } finally {
        const loadedSession = loadSession();
        if (mounted && loadedSession) setSessionUser(loadedSession);
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const allPages = useMemo<WikiPage[]>(() => {
    const peoplePages = data.people.map((item) => ({
      ...item,
      category: item.category || '사람 문서',
      group: '인물',
      icon: 'people',
    }));

    const sectionPages = data.sections.map((item) => ({
      ...item,
      group: item.category || '문서',
    }));

    return [...sectionPages, ...peoplePages];
  }, [data]);

  useEffect(() => {
  if (!sessionUser) return;

  const channel = supabase
    .channel('wiki-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wiki_pages' },
      async () => {
        try {
          const latest = await loadDataFromSupabase();
          setData(latest);
        } catch (error) {
          console.error('realtime reload error:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_logs' },
      async () => {
        try {
          const latest = await loadDataFromSupabase();
          setData(latest);
        } catch (error) {
          console.error('realtime reload error:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_changes' },
      async () => {
        try {
          const latest = await loadDataFromSupabase();
          setData(latest);
        } catch (error) {
          console.error('realtime reload error:', error);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [sessionUser]);

  const visiblePages = useMemo(() => {
    if (sessionUser?.isAdmin) return allPages;
    return allPages.filter((page) => page.id !== ADMIN_PAGE_ID);
  }, [allPages, sessionUser]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visiblePages;

    return visiblePages.filter((page) => {
      const title = (page.title || '').toLowerCase();
      const summary = (page.summary || '').toLowerCase();
      const content = (page.content || '').toLowerCase();

      return title.includes(q) || summary.includes(q) || content.includes(q);
    });
  }, [visiblePages, search]);

  const selectedPage = useMemo(
    () => allPages.find((page) => page.id === selectedId) ?? null,
    [allPages, selectedId],
  );

  useEffect(() => {
    if (!allPages.length) return;
    const exists = allPages.some((page) => page.id === selectedId);
    if (!exists) setSelectedId('main');
  }, [allPages, selectedId]);

  useEffect(() => {
    if (!selectedPage) return;
    setDraft({ ...selectedPage });
    setEditing(false);
  }, [selectedPage]);

  const navigateTo = (pageId: string) => {
    if (pageId === ADMIN_PAGE_ID && !sessionUser?.isAdmin) return;

    const exists = allPages.some((page) => page.id === pageId);
    if (!exists) return;

    setHistory((prev) => {
      if (selectedId === pageId) return prev;
      return [...prev, selectedId];
    });

    setSelectedId(pageId);
    setEditing(false);
    setSearch('');
  };

  const goBack = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;

      const nextHistory = [...prev];
      const previousId = nextHistory.pop();

      if (previousId) {
        setSelectedId(previousId);
        setEditing(false);
        setSearch('');
      }

      return nextHistory;
    });
  };

  const pushLog = (
    pageId: string,
    pageTitle: string,
    action: AuditLog['action'],
    summary: string,
    changes: AuditChange[] = [],
  ): AuditLog | null => {
    if (!sessionUser) return null;

    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pageId,
      pageTitle,
      action,
      actorId: sessionUser.id,
      actorName: sessionUser.name,
      actorRole: sessionUser.isAdmin ? '관리자' : '일반',
      timestamp: new Date().toISOString(),
      summary,
      changes,
    };
  };

  const handleLogin = (user: UserAccount) => {
    setSessionUser(user);
    saveSession(user);
  };

  const handleLogout = () => {
    setSessionUser(null);
    saveSession(null);
    setEditing(false);
    setHistory([]);
    setSelectedId('main');
  };

  const handleSave = async () => {
  if (!draft || !sessionUser || !selectedPage) return;
  if (draft.id === ADMIN_PAGE_ID && !sessionUser.isAdmin) return;

  const original =
    data.people.find((item) => item.id === draft.id) ||
    data.sections.find((item) => item.id === draft.id);

  if (!original) return;

  const next: WikiPage = {
    ...draft,
    updatedAt: new Date().toISOString(),
    updatedBy: sessionUser.name,
  };

  const changes = buildAuditChanges(original, next);

  const log = pushLog(
    next.id,
    next.title,
    'update',
    changes.length > 0 ? '문서 내용 수정' : '저장',
    changes,
  );

  try {
    await savePageToSupabase(next);
    if (log) {
      await saveAuditLogToSupabase(log);
    }

    const isPerson = data.people.some((item) => item.id === next.id);

    const updated: WikiData = isPerson
      ? {
          ...data,
          people: data.people.map((item) => (item.id === next.id ? next : item)),
          auditLogs: log ? [...data.auditLogs, log] : data.auditLogs,
        }
      : {
          ...data,
          sections: data.sections.map((item) => (item.id === next.id ? next : item)),
          auditLogs: log ? [...data.auditLogs, log] : data.auditLogs,
        };

    setData(updated);
    setEditing(false);
  } catch (error) {
    console.error('Supabase save error:', error);
    window.alert(`Supabase save error: ${JSON.stringify(error)}`);
  }
};

  const handleShare = async () => {
    if (!selectedPage) return;

    const text = `YulturnWiki / ${selectedPage.title}`;

    try {
      await navigator.clipboard.writeText(text);
      window.alert('문서명이 클립보드에 복사되었습니다.');
    } catch {
      window.alert(text);
    }
  };

  const canGoBack = history.length > 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#efefef] text-[#333]">
        불러오는 중...
      </div>
    );
  }

  if (!sessionUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#efefef] text-[#333]">
      <TopBar
        user={sessionUser}
        search={search}
        setSearch={setSearch}
        searchResults={searchResults}
        onLogout={handleLogout}
        onGoHome={() => navigateTo('main')}
        onSelectSearch={navigateTo}
        onGoAdmin={() => navigateTo(ADMIN_PAGE_ID)}
      />

      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[1fr_280px]">
        <div>
          {selectedPage ? (
            <>
              <WikiArticle
                page={selectedPage}
                editing={editing}
                draft={draft}
                setDraft={setDraft}
                onEdit={() => {
                  if (selectedPage.id === ADMIN_PAGE_ID && !sessionUser.isAdmin) return;
                  setEditing(true);
                  setDraft({ ...selectedPage });
                }}
                onSave={handleSave}
                onShare={handleShare}
                onNavigate={navigateTo}
                people={data.people}
                onBack={goBack}
                canGoBack={canGoBack}
                isAdmin={sessionUser.isAdmin}
              />

              {selectedPage.id === ADMIN_PAGE_ID && sessionUser.isAdmin ? (
                <AdminAuditPanel logs={data.auditLogs} onNavigate={navigateTo} />
              ) : null}
            </>
          ) : (
            <div className="rounded border border-[#ddd] bg-white p-8">문서를 선택하세요.</div>
          )}
        </div>

        <div>
          <RecentChanges logs={data.auditLogs} onNavigate={navigateTo} />
        </div>
      </main>
    </div>
  );
}