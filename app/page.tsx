'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bold,
  Image as ImageIcon,
  Lock,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Share2,
  Shield,
  Strikethrough,
  Type,
  User,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type Team = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type UserAccount = {
  id: string;
  loginId: string;
  password: string;
  name: string;
  role: string;
  teamId: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type WikiPage = {
  id: string;
  pageType: 'home' | 'team' | 'person' | 'general' | 'policy' | 'admin';
  teamId: string | null;
  userId: string | null;
  title: string;
  summary: string;
  content: string;
  icon?: string | null;
  isSystemFixed: boolean;
  revision: number;
  updatedBy: string | null;
  updatedByName: string | null;
  updatedAt: string;
};

type AuditChange = {
  field: string;
  before: string;
  after: string;
};

type AuditLog = {
  id: string;
  pageId: string;
  pageTitle: string;
  action: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  summary: string;
  timestamp: string;
  changes: AuditChange[];
};

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type WikiUserRow = {
  id: string;
  login_id: string;
  password: string;
  name: string;
  role: string;
  team_id: string | null;
  is_admin: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type WikiPageRow = {
  id: string;
  page_type: WikiPage['pageType'];
  team_id: string | null;
  user_id: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  icon: string | null;
  is_system_fixed: boolean | null;
  revision: number | null;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: string | null;
};

type AuditLogRow = {
  id: string;
  page_id: string;
  page_title: string | null;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  summary: string | null;
  timestamp: string | null;
};

type AuditChangeRow = {
  id: number;
  log_id: string;
  field: string;
  before: string | null;
  after: string | null;
};

const SESSION_KEY = 'yulturn-wiki-session-v3';
const HOME_PAGE_ID = 'main';
const ADMIN_PAGE_ID = 'admin-dashboard';
const INTERN_PAGE_ID = 'intern-index';

function nowIso() {
  return new Date().toISOString();
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function uuid() {
  return crypto.randomUUID();
}

function loadSession(): UserAccount | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
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

function mapTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? nowIso(),
  };
}

function mapUserRow(row: WikiUserRow): UserAccount {
  return {
    id: row.id,
    loginId: row.login_id,
    password: row.password,
    name: row.name,
    role: row.role,
    teamId: row.team_id,
    isAdmin: !!row.is_admin,
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? nowIso(),
  };
}

function mapPageRow(row: WikiPageRow): WikiPage {
  return {
    id: row.id,
    pageType: row.page_type,
    teamId: row.team_id,
    userId: row.user_id,
    title: row.title,
    summary: row.summary ?? '',
    content: row.content ?? '',
    icon: row.icon,
    isSystemFixed: row.is_system_fixed ?? false,
    revision: row.revision ?? 1,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name,
    updatedAt: row.updated_at ?? nowIso(),
  };
}

function mapAuditRows(logs: AuditLogRow[], changes: AuditChangeRow[]): AuditLog[] {
  return logs.map((log) => ({
    id: log.id,
    pageId: log.page_id,
    pageTitle: log.page_title ?? '',
    action: log.action,
    actorId: log.actor_id,
    actorName: log.actor_name ?? '',
    actorRole: log.actor_role ?? '',
    summary: log.summary ?? '',
    timestamp: log.timestamp ?? nowIso(),
    changes: changes
      .filter((change) => change.log_id === log.id)
      .map((change) => ({
        field: change.field,
        before: change.before ?? '',
        after: change.after ?? '',
      })),
  }));
}

function getTeamName(teamId: string | null, teams: Team[]) {
  if (!teamId) return '미배정';
  return teams.find((team) => team.id === teamId)?.name ?? '미배정';
}

function buildPersonPage(user: UserAccount, teams: Team[]): Omit<WikiPageRow, 'updated_at'> {
  const teamName = getTeamName(user.teamId, teams);
  return {
    id: `person-${user.id}`,
    page_type: 'person',
    team_id: user.teamId,
    user_id: user.id,
    title: user.name,
    summary: `${teamName} ${user.role}. 개인 소개 문서입니다.`,
    content: `[인물 정보]
- 이름: ${user.name}
- 소속: ${teamName}
- 직무: ${user.role}

[업무 스타일]
- 추후 작성

[메모]
- 자유롭게 작성`,
    icon: 'people',
    is_system_fixed: false,
    revision: 1,
    updated_by: user.id,
    updated_by_name: user.name,
  };
}

function getHomeDefaultContent() {
  return `[위키 소개]
율턴위키는 인턴용 내부 위키입니다.

[안내]
- 상단 검색창으로 문서를 찾을 수 있습니다.
- 팀 문서에서 구성원을 볼 수 있습니다.
- 관리자만 팀 / 구성원 / 아이디를 추가하거나 수정할 수 있습니다.

[문서]
- [[intern-index|전체 인턴 목록]]
- [[admin-dashboard|관리자 페이지]]`;
}

function getInternDefaultContent() {
  return `[전체 인턴]
전체 인턴과 팀 문서를 모아보는 페이지입니다.

[안내]
- 아래 목록은 실시간으로 갱신됩니다.`;
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
      elements.push(<div key={`space-${index}`} className="h-3" />);
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

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const value = textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
  return { value, selectionStart: start + before.length, selectionEnd: end + before.length };
}

async function uploadImageToSupabase(file: File) {
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const { data: uploadData, error } = await supabase.storage.from('wiki-images').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('wiki-images').getPublicUrl(filePath);
  return { filePath: uploadData?.path ?? filePath, fileName: file.name, publicUrl: data.publicUrl };
}

async function ensureBasePages() {
  const pages: Array<Pick<WikiPageRow, 'id' | 'page_type' | 'title' | 'summary' | 'content' | 'is_system_fixed'>> = [
    {
      id: HOME_PAGE_ID,
      page_type: 'home',
      title: '대문',
      summary: '율턴위키 메인 문서',
      content: getHomeDefaultContent(),
      is_system_fixed: true,
    },
    {
      id: INTERN_PAGE_ID,
      page_type: 'general',
      title: '전체 인턴 목록',
      summary: '전체 인턴과 팀 문서를 모아보는 페이지',
      content: getInternDefaultContent(),
      is_system_fixed: true,
    },
    {
      id: ADMIN_PAGE_ID,
      page_type: 'admin',
      title: '관리자 페이지',
      summary: '관리자 전용 페이지',
      content: `[관리자 안내]
이 페이지는 관리자만 사용할 수 있습니다.

[가능한 작업]
- 팀 추가
- 구성원 추가 / 수정
- 계정 아이디 추가
- 전체 문서 확인
- 수정 기록 확인`,
      is_system_fixed: true,
    },
  ];

  for (const page of pages) {
    const { data } = await supabase.from('wiki_pages').select('id').eq('id', page.id).maybeSingle();
    if (!data) {
      await supabase.from('wiki_pages').insert({
        ...page,
        revision: 1,
        updated_at: nowIso(),
        updated_by_name: 'system',
      });
    }
  }
}

async function ensureTeamPages(teams: Team[]) {
  for (const team of teams) {
    const pageId = `team-${team.slug}`;
    const { data } = await supabase.from('wiki_pages').select('id').eq('id', pageId).maybeSingle();
    if (!data) {
      await supabase.from('wiki_pages').insert({
        id: pageId,
        page_type: 'team',
        team_id: team.id,
        title: team.name,
        summary: `${team.name} 소개 문서`,
        content: `[팀 소개]
${team.description || `${team.name} 소개를 입력해주세요.`}

[업무 팁]
- 자유롭게 작성`,
        is_system_fixed: true,
        revision: 1,
        updated_at: nowIso(),
        updated_by_name: 'system',
      });
    }
  }
}

async function ensurePersonPage(user: UserAccount, teams: Team[]) {
  const page = buildPersonPage(user, teams);
  const existing = await supabase
    .from('wiki_pages')
    .select('id, revision')
    .eq('user_id', user.id)
    .eq('page_type', 'person')
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (!existing.data) {
    const { error } = await supabase.from('wiki_pages').insert({
      ...page,
      updated_at: nowIso(),
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('wiki_pages')
    .update({
      title: page.title,
      summary: page.summary,
      content: page.content,
      team_id: page.team_id,
      updated_at: nowIso(),
      updated_by_name: page.updated_by_name,
    })
    .eq('id', existing.data.id);

  if (error) throw error;
}

async function loadTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('sort_order').order('name');
  if (error) throw error;
  return ((data ?? []) as TeamRow[]).map(mapTeamRow);
}

async function loadUsers(): Promise<UserAccount[]> {
  const { data, error } = await supabase.from('wiki_users').select('*').eq('is_active', true).order('name');
  if (error) throw error;
  return ((data ?? []) as WikiUserRow[]).map(mapUserRow);
}

async function loadPages(): Promise<WikiPage[]> {
  const { data, error } = await supabase.from('wiki_pages').select('*').order('title');
  if (error) throw error;
  return ((data ?? []) as WikiPageRow[]).map(mapPageRow);
}

async function loadAudit(): Promise<AuditLog[]> {
  const [logsRes, changesRes] = await Promise.all([
    supabase.from('audit_logs').select('*').order('timestamp', { ascending: true }),
    supabase.from('audit_changes').select('*').order('id', { ascending: true }),
  ]);
  if (logsRes.error) throw logsRes.error;
  if (changesRes.error) throw changesRes.error;
  return mapAuditRows(
    (logsRes.data ?? []) as AuditLogRow[],
    (changesRes.data ?? []) as AuditChangeRow[],
  );
}

async function saveAuditLog(log: Omit<AuditLog, 'changes'> & { changes?: AuditChange[] }) {
  const { changes = [], ...rest } = log;
  const { error: logError } = await supabase.from('audit_logs').insert({
    id: rest.id,
    page_id: rest.pageId,
    page_title: rest.pageTitle,
    action: rest.action,
    actor_id: rest.actorId,
    actor_name: rest.actorName,
    actor_role: rest.actorRole,
    summary: rest.summary,
    timestamp: rest.timestamp,
  });
  if (logError) throw logError;

  if (changes.length) {
    const { error: changeError } = await supabase.from('audit_changes').insert(
      changes.map((change) => ({
        log_id: rest.id,
        field: change.field,
        before: change.before,
        after: change.after,
      })),
    );
    if (changeError) throw changeError;
  }
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

async function validateUserUniqueness(params: {
  loginId: string;
  mode: 'create' | 'update';
  userId?: string;
}) {
  let query = supabase.from('wiki_users').select('id').eq('login_id', params.loginId).limit(1);

  if (params.mode === 'update' && params.userId) {
    query = query.neq('id', params.userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (data && data.length > 0) {
    throw new Error('이미 사용 중인 로그인 아이디예요.');
  }
}

async function addTeam(params: {
  actor: UserAccount;
  name: string;
  slug: string;
  description: string;
}) {
  const name = params.name.trim();
  const slug = params.slug.trim().toLowerCase();
  const description = params.description.trim();

  if (!name || !slug) throw new Error('팀명과 slug를 입력해주세요.');

  const { data: existsByName } = await supabase.from('teams').select('id').eq('name', name).maybeSingle();
  if (existsByName) throw new Error('이미 존재하는 팀명이에요.');

  const { data: existsBySlug } = await supabase.from('teams').select('id').eq('slug', slug).maybeSingle();
  if (existsBySlug) throw new Error('이미 존재하는 slug예요.');

  const { data: maxRow } = await supabase.from('teams').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      name,
      slug,
      description,
      sort_order: nextSortOrder,
    })
    .select('*')
    .single();

  if (error) throw error;

  const teamRow = mapTeamRow(team as TeamRow);

  const { error: pageError } = await supabase.from('wiki_pages').insert({
    id: `team-${teamRow.slug}`,
    page_type: 'team',
    team_id: teamRow.id,
    title: teamRow.name,
    summary: `${teamRow.name} 소개 문서`,
    content: `[팀 소개]
${teamRow.description || `${teamRow.name} 소개를 입력해주세요.`}

[업무 팁]
- 자유롭게 작성`,
    is_system_fixed: true,
    revision: 1,
    updated_at: nowIso(),
    updated_by: params.actor.id,
    updated_by_name: params.actor.name,
  });

  if (pageError) throw pageError;

  await saveAuditLog({
    id: uuid(),
    pageId: `team-${teamRow.slug}`,
    pageTitle: teamRow.name,
    action: 'team_create',
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    summary: '팀 추가',
    timestamp: nowIso(),
    changes: [],
  });
}

async function addOrUpdateUser(params: {
  mode: 'create' | 'update';
  actor: UserAccount;
  teams: Team[];
  user: {
    id?: string;
    loginId: string;
    password: string;
    name: string;
    role: string;
    teamId: string | null;
    isAdmin: boolean;
    isActive: boolean;
  };
}) {
  await validateUserUniqueness({
    loginId: params.user.loginId.trim(),
    mode: params.mode,
    userId: params.user.id,
  });

  const payload = {
    login_id: params.user.loginId.trim(),
    password: params.user.password.trim(),
    name: params.user.name.trim(),
    role: params.user.role.trim() || '인턴',
    team_id: params.user.teamId,
    is_admin: params.user.isAdmin,
    is_active: params.user.isActive,
    updated_at: nowIso(),
  };

  let row: WikiUserRow;

  if (params.mode === 'create') {
  const newUserId = crypto.randomUUID(); // ⭐ 핵심

  const { data, error } = await supabase
    .from('wiki_users')
    .insert({
      id: newUserId,
      ...payload,
    })
    .select('*')
    .single();

  if (error) throw error;
  row = data as WikiUserRow;

} else {
  const { data, error } = await supabase
    .from('wiki_users')
    .update(payload)
    .eq('id', params.user.id!)
    .select('*')
    .single();

  if (error) throw error;
  row = data as WikiUserRow;
}

  const savedUser = mapUserRow(row);
  await ensurePersonPage(savedUser, params.teams);

  await saveAuditLog({
    id: uuid(),
    pageId: `person-${savedUser.id}`,
    pageTitle: savedUser.name,
    action: params.mode === 'create' ? 'member_add' : 'member_update',
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    summary: params.mode === 'create' ? '구성원 추가' : '구성원 수정',
    timestamp: nowIso(),
    changes: [],
  });

  return savedUser;
}

async function savePageWithRevision(params: {
  page: WikiPage;
  actor: UserAccount;
  originalRevision: number;
}) {
  const nextRevision = params.originalRevision + 1;

  const { data, error } = await supabase
    .from('wiki_pages')
    .update({
      title: params.page.title,
      summary: params.page.summary,
      content: params.page.content,
      revision: nextRevision,
      updated_at: nowIso(),
      updated_by: params.actor.id,
      updated_by_name: params.actor.name,
    })
    .eq('id', params.page.id)
    .eq('revision', params.originalRevision)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('충돌이 발생했어요. 다른 사람이 먼저 저장해서 최신 내용으로 다시 불러와야 합니다.');
  }

  return mapPageRow(data as WikiPageRow);
}

function YulturnLogo({ white = true }: { white?: boolean }) {
  return (
    <div className={`text-[36px] font-extrabold tracking-[-0.04em] ${white ? 'text-white' : 'text-[#0b3f79]'}`}>
      율턴위키
    </div>
  );
}

function LoginScreen({
  onLogin,
  users,
}: {
  onLogin: (user: UserAccount) => void;
  users: UserAccount[];
}) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(
      (user) => user.loginId === id.trim() && user.password === password && user.isActive,
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
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-8">
              <div className="text-5xl font-extrabold tracking-[-0.04em] text-white">율턴위키</div>
              <div className="mt-2 text-sm text-white/75">율촌 인턴 내부 위키</div>
            </div>
            <div className="max-w-2xl rounded-[28px] border border-white/10 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-md">
              <h1 className="text-3xl font-bold">YulturnWiki</h1>
              <p className="mt-4 text-base leading-7 text-white/85">
                인턴 내부 전용 위키입니다.
                <br />
                관리자만 팀과 계정을 관리할 수 있습니다.
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
                <label className="mb-2 block text-sm font-medium text-slate-700">아이디</label>
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0b3f79]"
                  placeholder="아이디 입력"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0b3f79]"
                  placeholder="비밀번호 입력"
                />
              </div>
            </div>

            {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

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
  onRefresh,
  syncing,
}: {
  user: UserAccount;
  search: string;
  setSearch: (v: string) => void;
  searchResults: WikiPage[];
  onLogout: () => void;
  onGoHome: () => void;
  onSelectSearch: (id: string) => void;
  onGoAdmin: () => void;
  onRefresh: () => void;
  syncing: boolean;
}) {
  return (
    <header className="border-b border-[#082f5d] bg-[#0b3f79] text-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
        <button type="button" onClick={onGoHome} className="shrink-0">
          <YulturnLogo white />
        </button>

        <div className="flex flex-1 items-center justify-end gap-3">
          <SearchBox search={search} setSearch={setSearch} results={searchResults} onSelect={onSelectSearch} />
          <button
            type="button"
            onClick={onRefresh}
            className="hidden items-center gap-2 rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10 lg:flex"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
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
          <button type="button" onClick={onLogout} className="rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10">
            로그아웃
          </button>
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
      <button
        type="button"
        disabled={disabled}
        onClick={editing ? onSave : onEdit}
        className="flex items-center gap-1 border-r border-[#e5e5e5] px-4 py-2 hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-50"
      >
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
      <div className="border-b border-[#ddd] bg-[#f5f5f5] px-4 py-3 text-[15px] font-semibold text-[#444]">최근 바뀜</div>
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
  users,
  teamId,
  onNavigate,
}: {
  users: UserAccount[];
  teamId: string;
  onNavigate: (pageId: string) => void;
}) {
  const members = users
    .filter((user) => user.teamId === teamId && !user.isAdmin)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <div className="mt-10">
      <h2 className="mb-3 border-b border-[#e5e5e5] pb-2 text-[20px] font-normal text-[#243b53]">구성원</h2>
      <div className="flex flex-wrap gap-x-3 gap-y-2 text-[15px] leading-8 text-[#444]">
        {members.length === 0 ? (
          <div className="text-[#777]">등록된 멤버가 없습니다.</div>
        ) : (
          members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onNavigate(`person-${member.id}`)}
              className="rounded border border-[#d9e4ef] bg-[#f8fbfe] px-3 py-1.5 text-[#0b4f9b] hover:bg-[#eef5fb]"
            >
              {member.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function DynamicInternBlock({
  teams,
  users,
  onNavigate,
}: {
  teams: Team[];
  users: UserAccount[];
  onNavigate: (pageId: string) => void;
}) {
  return (
    <div className="mt-10 space-y-8">
      <div>
        <h2 className="mb-3 border-b border-[#e5e5e5] pb-2 text-[20px] font-normal text-[#243b53]">팀 문서</h2>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => onNavigate(`team-${team.slug}`)}
              className="rounded border border-[#d9e4ef] bg-[#f8fbfe] px-3 py-1.5 text-[#0b4f9b] hover:bg-[#eef5fb]"
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 border-b border-[#e5e5e5] pb-2 text-[20px] font-normal text-[#243b53]">전체 구성원</h2>
        <div className="flex flex-wrap gap-2">
          {users
            .filter((user) => !user.isAdmin)
            .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
            .map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => onNavigate(`person-${user.id}`)}
                className="rounded border border-[#d9e4ef] bg-[#f8fbfe] px-3 py-1.5 text-[#0b4f9b] hover:bg-[#eef5fb]"
              >
                {user.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function EditorImageTools({ onAppendImage }: { onAppendImage: (file: File) => Promise<void> }) {
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
          await onAppendImage(file);
          e.currentTarget.value = '';
        }}
      />
      <div className="text-xs text-[#777]">업로드한 사진은 파일명 형태로 본문에 삽입됩니다.</div>
    </div>
  );
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

function AdminTeamsPanel({
  actor,
  onSaved,
}: {
  actor: UserAccount;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addTeam({ actor, name, slug, description });
      await onSaved();
      setName('');
      setSlug('');
      setDescription('');
      alert('팀을 추가했어요.');
    } catch (error: any) {
      alert(error?.message ?? '팀 추가 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-4">
        <h2 className="text-[22px] font-bold text-[#243b53]">팀 관리</h2>
        <p className="mt-1 text-sm text-[#66788a]">팀 추가는 관리자만 가능합니다.</p>
      </div>
      <form onSubmit={submit} className="space-y-4 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="팀명" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="slug (예: management-infra)" />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px] w-full rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="팀 소개" />
        <button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded bg-[#0b3f79] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          <Plus className="h-4 w-4" />
          팀 추가하기
        </button>
      </form>
    </div>
  );
}

function AdminPeoplePanel({
  users,
  teams,
  actor,
  onSaved,
}: {
  users: UserAccount[];
  teams: Team[];
  actor: UserAccount;
  onSaved: () => Promise<void>;
}) {
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    loginId: '',
    password: '',
    name: '',
    role: '인턴',
    teamId: '',
    isAdmin: false,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'create') {
      setSelectedId('');
      setForm({
        loginId: '',
        password: '',
        name: '',
        role: '인턴',
        teamId: '',
        isAdmin: false,
        isActive: true,
      });
      return;
    }

    const target = users.find((user) => user.id === selectedId);
    if (target) {
      setForm({
        loginId: target.loginId,
        password: target.password,
        name: target.name,
        role: target.role,
        teamId: target.teamId ?? '',
        isAdmin: target.isAdmin,
        isActive: target.isActive,
      });
    }
  }, [mode, selectedId, users]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addOrUpdateUser({
        mode,
        actor,
        teams,
        user: {
          id: selectedId || undefined,
          loginId: form.loginId,
          password: form.password,
          name: form.name,
          role: form.role,
          teamId: form.teamId || null,
          isAdmin: form.isAdmin,
          isActive: form.isActive,
        },
      });
      await onSaved();
      alert(mode === 'create' ? '구성원을 추가했어요.' : '구성원을 수정했어요.');
      setMode('create');
    } catch (error: any) {
      alert(error?.message ?? '구성원 저장 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded border border-[#ddd] bg-white">
      <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-4">
        <h2 className="text-[22px] font-bold text-[#243b53]">구성원 관리</h2>
        <p className="mt-1 text-sm text-[#66788a]">팀/구성원/아이디 추가 및 수정은 관리자만 가능합니다.</p>
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
                  {user.name} · {user.loginId}
                </option>
              ))}
            </select>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="이름" />
            <input value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="직무" />
            <input value={form.loginId} onChange={(e) => setForm((prev) => ({ ...prev, loginId: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="로그인 아이디" />
            <input value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none" placeholder="비밀번호" />
            <select value={form.teamId} onChange={(e) => setForm((prev) => ({ ...prev, teamId: e.target.value }))} className="rounded border border-[#ddd] px-3 py-3 text-sm outline-none">
              <option value="">팀 선택</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded border border-[#ddd] px-3 py-3 text-sm text-[#444]">
              <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm((prev) => ({ ...prev, isAdmin: e.target.checked }))} />
              관리자 권한
            </label>
          </div>

          <button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded bg-[#0b3f79] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Plus className="h-4 w-4" />
            {mode === 'create' ? '구성원 추가하기' : '구성원 저장하기'}
          </button>
        </form>

        <div className="rounded border border-[#e5e5e5] bg-[#fcfcfd] p-4">
          <div className="mb-3 text-sm font-semibold text-[#243b53]">현재 전체 구성원</div>
          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {users.map((user) => (
              <div key={user.id} className="rounded border border-[#eee] bg-white px-3 py-3 text-sm">
                <div className="font-semibold text-[#243b53]">
                  {user.name} {user.isAdmin ? '(관리자)' : ''}
                </div>
                <div className="mt-1 text-[#66788a]">
                  {user.role} · {user.teamId ? getTeamName(user.teamId, teams) : '미배정'}
                </div>
                <div className="mt-1 text-xs text-[#999]">아이디: {user.loginId}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
        <p className="mt-1 text-sm text-[#66788a]">누가 어떤 문서를 수정했는지 확인할 수 있습니다.</p>
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
                <button type="button" onClick={() => onNavigate(log.pageId)} className="text-left text-[18px] font-semibold text-[#0b4f9b] hover:underline">
                  {log.pageTitle}
                </button>
                <span className="rounded bg-[#eef5fb] px-2 py-1 text-xs text-[#355b82]">{log.summary}</span>
              </div>
              {log.changes.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {log.changes.map((change, idx) => (
                    <div key={`${log.id}-${idx}`} className="rounded border border-[#e6edf5] bg-[#fafcff] p-4">
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

function WikiArticle({
  page,
  editing,
  draft,
  setDraft,
  onEdit,
  onSave,
  onShare,
  onNavigate,
  users,
  teams,
  onBack,
  canGoBack,
  isAdmin,
  saving,
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
  users: UserAccount[];
  teams: Team[];
  onBack: () => void;
  canGoBack: boolean;
  isAdmin: boolean;
  saving: boolean;
  conflictMessage: string;
}) {
  const toc = useMemo(() => buildToc(editing && draft ? draft.content : page.content), [editing, draft, page.content]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canEditThisPage = !(page.pageType === 'admin' && !isAdmin);

  if (editing && !draft) return null;

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
          <ActionButtons editing={editing} disabled={!canEditThisPage || saving} onEdit={onEdit} onSave={onSave} onShare={onShare} />
        </div>

        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[#111]">{editing && draft ? draft.title : page.title}</h1>
          <div className="mt-1 text-[14px] text-[#5a7ca2]">
            ({page.pageType} 문서) · rev.{page.revision}
          </div>
        </div>

        {conflictMessage ? (
          <div className="mt-4 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {conflictMessage}
          </div>
        ) : null}
      </div>

      <div className="grid gap-8 px-5 py-8 md:grid-cols-[1fr_250px] md:px-6">
        <div>
          {page.pageType === 'admin' && !isAdmin ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">관리자만 접근할 수 있습니다.</div>
          ) : editing && canEditThisPage && draft ? (
            <div className="space-y-3">
              <input value={draft.title} onChange={(e) => setDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))} className="w-full rounded border border-[#ddd] px-4 py-3 text-[22px] font-bold outline-none" />
              <input value={draft.summary} onChange={(e) => setDraft((prev) => (prev ? { ...prev, summary: e.target.value } : prev))} className="w-full rounded border border-[#ddd] px-4 py-3 text-sm outline-none" placeholder="요약" />
              <EditorImageTools
                onAppendImage={async (file) => {
                  const result = await uploadImageToSupabase(file);
                  setDraft((prev) => prev ? { ...prev, content: `${prev.content}\n\n{{image:${result.filePath}|${result.fileName}}}`.trim() } : prev);
                }}
              />
              <EditorStyleToolbar textareaRef={textareaRef} setDraft={setDraft} />
              <textarea ref={textareaRef} value={draft.content} onChange={(e) => setDraft((prev) => (prev ? { ...prev, content: e.target.value } : prev))} className="min-h-[520px] w-full rounded border border-[#ddd] px-4 py-4 text-sm leading-7 outline-none" />
            </div>
          ) : (
            <div>
              <div className="mb-6 text-[15px] text-[#666]">
                최근 수정: {formatDate(page.updatedAt)} · {page.updatedByName ?? 'system'}
              </div>
              <div className="prose max-w-none prose-p:my-0">{renderWikiText(page.content, onNavigate)}</div>

              {page.pageType === 'team' && page.teamId ? (
                <TeamMembersBlock users={users} teamId={page.teamId} onNavigate={onNavigate} />
              ) : null}

              {page.id === INTERN_PAGE_ID ? (
                <DynamicInternBlock teams={teams} users={users} onNavigate={onNavigate} />
              ) : null}
            </div>
          )}
        </div>
        <div>
          <TocBox toc={toc} />
        </div>
      </div>
    </div>
  );
}

export default function YulturnWikiPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [session, setSession] = useState<UserAccount | null>(null);
  const [search, setSearch] = useState('');
  const [currentPageId, setCurrentPageId] = useState(HOME_PAGE_ID);
  const [history, setHistory] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WikiPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');

  const allPages = useMemo(() => pages, [pages]);
  const currentPage = useMemo(() => allPages.find((page) => page.id === currentPageId) ?? null, [allPages, currentPageId]);

  const refreshTeams = useCallback(async () => {
    const nextTeams = await loadTeams();
    setTeams(nextTeams);
  }, []);

  const refreshUsers = useCallback(async () => {
    const nextUsers = await loadUsers();
    setUsers(nextUsers);
    setSession((prev) => {
      if (!prev) return prev;
      const matched = nextUsers.find((user) => user.id === prev.id);
      if (!matched) return null;
      saveSession(matched);
      return matched;
    });
  }, []);

  const refreshPages = useCallback(async () => {
    const nextPages = await loadPages();
    setPages(nextPages);
  }, []);

  const refreshAudit = useCallback(async () => {
    const nextLogs = await loadAudit();
    setLogs(nextLogs);
  }, []);

  const refreshAll = useCallback(async () => {
    setSyncing(true);
    try {
      const nextTeams = await loadTeams();
      await ensureBasePages();
      await ensureTeamPages(nextTeams);

      const nextUsers = await loadUsers();
      for (const user of nextUsers) {
        await ensurePersonPage(user, nextTeams);
      }

      const [finalPages, finalLogs] = await Promise.all([loadPages(), loadAudit()]);

      setTeams(nextTeams);
      setUsers(nextUsers);
      setPages(finalPages);
      setLogs(finalLogs);

      setSession((prev) => {
        if (!prev) return prev;
        const matched = nextUsers.find((user) => user.id === prev.id);
        if (!matched) return null;
        saveSession(matched);
        return matched;
      });
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await refreshAll();
        const loadedSession = loadSession();
        if (loadedSession) {
          const matched = users.find((user) => user.id === loadedSession.id || user.loginId === loadedSession.loginId);
          if (matched) {
            setSession(matched);
            saveSession(matched);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!users.length) return;
    const loadedSession = loadSession();
    if (!loadedSession) return;
    const matched = users.find((user) => user.id === loadedSession.id || user.loginId === loadedSession.loginId);
    if (matched) {
      setSession(matched);
      saveSession(matched);
    }
  }, [users]);

  useEffect(() => {
    const channel = supabase
      .channel('wiki-realtime-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, async () => {
        await refreshTeams();
        await refreshPages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wiki_users' }, async () => {
        await refreshUsers();
        await refreshPages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wiki_pages' }, async () => {
        await refreshPages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, async () => {
        await refreshAudit();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_changes' }, async () => {
        await refreshAudit();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAudit, refreshPages, refreshTeams, refreshUsers]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allPages
      .filter((page) => [page.title, page.summary, page.content].join(' ').toLowerCase().includes(q))
      .slice(0, 20);
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

  const onSave = async () => {
    if (!currentPage || !draft || !session) return;
    setSaving(true);
    setConflictMessage('');

    try {
      const saved = await savePageWithRevision({
        page: draft,
        actor: session,
        originalRevision: currentPage.revision,
      });

      const changes = buildAuditChanges(currentPage, saved);
      await saveAuditLog({
        id: uuid(),
        pageId: saved.id,
        pageTitle: saved.title,
        action: 'update',
        actorId: session.id,
        actorName: session.name,
        actorRole: session.role,
        summary: '문서 수정',
        timestamp: nowIso(),
        changes,
      });

      await refreshPages();
      await refreshAudit();

      setCurrentPageId(saved.id);
      setEditing(false);
      setDraft(null);
    } catch (error: any) {
      setConflictMessage(error?.message ?? '저장 중 오류가 발생했어요.');
      await refreshPages();
    } finally {
      setSaving(false);
    }
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
      <TopBar
        user={session}
        search={search}
        setSearch={setSearch}
        searchResults={searchResults}
        onLogout={onLogout}
        onGoHome={() => navigate(HOME_PAGE_ID)}
        onSelectSearch={navigate}
        onGoAdmin={() => navigate(ADMIN_PAGE_ID)}
        onRefresh={refreshAll}
        syncing={syncing}
      />

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <WikiArticle
            page={currentPage}
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            onEdit={onEdit}
            onSave={onSave}
            onShare={onShare}
            onNavigate={navigate}
            users={users}
            teams={teams}
            onBack={goBack}
            canGoBack={history.length > 0}
            isAdmin={session.isAdmin}
            saving={saving}
            conflictMessage={conflictMessage}
          />

          {currentPage.id === ADMIN_PAGE_ID && session.isAdmin ? (
            <>
              <AdminTeamsPanel actor={session} onSaved={refreshAll} />
              <AdminPeoplePanel users={users} teams={teams} actor={session} onSaved={refreshAll} />

              <div className="rounded border border-[#ddd] bg-white">
                <div className="border-b border-[#e5e5e5] bg-[#f8f9fa] px-6 py-4">
                  <h2 className="text-[22px] font-bold text-[#243b53]">전체 문서 현황</h2>
                  <p className="mt-1 text-sm text-[#66788a]">모든 문서를 한 번에 볼 수 있습니다.</p>
                </div>
                <div className="grid gap-3 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
                  {pages.map((page) => (
                    <button key={page.id} type="button" onClick={() => navigate(page.id)} className="rounded border border-[#e6edf5] bg-[#fafcff] p-4 text-left hover:bg-white">
                      <div className="text-sm font-semibold text-[#243b53]">{page.title}</div>
                      <div className="mt-1 text-xs text-[#66788a]">{page.pageType}</div>
                      <div className="mt-2 text-xs text-[#999]">
                        rev.{page.revision} · {formatDate(page.updatedAt)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <AdminAuditPanel logs={logs} onNavigate={navigate} />
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <RecentChanges logs={logs} onNavigate={navigate} />
          <div className="rounded border border-[#ddd] bg-white p-4 text-sm text-[#555]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#243b53]">
              <Users className="h-4 w-4" />
              실시간 반영 안내
            </div>
            <p>Supabase Realtime 구독으로 팀, 사용자, 문서, 로그 변경이 자동 반영됩니다.</p>
            <p className="mt-2">같은 문서를 동시에 수정하면 revision 충돌로 먼저 저장된 내용을 보호합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}