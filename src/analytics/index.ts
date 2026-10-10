import siteConfig from "@generated/docusaurus.config";
import type { PostHog, CaptureResult } from "posthog-js/dist/module.slim.no-external";

type AnalyticsConfig = {
  production: boolean;
  origin: string;
  posthogKey: string;
  posthogHost: string;
};

const config = siteConfig.customFields?.analytics as AnalyticsConfig;
const preferenceKey = "suat:statistics-disabled";
export const testModeKey = "suat:analytics-test";
let instance: PostHog | undefined;
let loading: Promise<PostHog | undefined> | undefined;

export function statisticsDisabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(preferenceKey) === "true";
  } catch {
    return true;
  }
}

export function isProductionSite(): boolean {
  return typeof window !== "undefined" && config.production &&
    window.location.origin === config.origin;
}

export function canCollectStatistics(): boolean {
  return isProductionSite() && !statisticsDisabled();
}

export function feedbackAvailable(): boolean {
  return canCollectStatistics() && Boolean(config.posthogKey);
}

function stopPostHogBeforeReload(): void {
  if (!instance) return;
  instance.opt_out_capturing();
  // SDK 1.438.7 opt-out does not discard queued/retry requests. Its dispatch
  // checks __loaded, so close this gate before reload can flush those queues.
  // Keep the SDK pinned and recheck this boundary when upgrading.
  instance.__loaded = false;
}

export function setStatisticsEnabled(enabled: boolean): boolean {
  try {
    window.localStorage.setItem(preferenceKey, String(!enabled));
  } catch {
    return false;
  }
  if (!enabled) stopPostHogBeforeReload();
  // A fresh document also stops the third-party Busuanzi script and its timers.
  window.location.reload();
  return true;
}

export function synchronizePreferences(): void {
  window.addEventListener("storage", (event) => {
    if (event.key === preferenceKey || event.key === null) {
      if (statisticsDisabled()) stopPostHogBeforeReload();
      window.location.reload();
    }
  });
}

export function articlePath(path: string): string {
  const pathname = new URL(path, config.origin).pathname;
  try {
    return decodeURI(pathname).replace(/\/$/, "") || "/";
  } catch {
    return pathname.replace(/\/$/, "") || "/";
  }
}

function isTestEvent(): boolean {
  try {
    return window.localStorage.getItem(testModeKey) === "true";
  } catch {
    return false;
  }
}

const allowedProperties = new Set([
  "token", "distinct_id", "$device_id", "$session_id", "$window_id",
  "$lib", "$lib_version", "$process_person_profile", "$is_identified",
  "$current_url", "$pathname", "$title", "article_path", "rating", "reason",
  "is_test", "$geoip_disable",
]);

function sanitizeEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || !feedbackAvailable() ||
      !["$pageview", "article_feedback"].includes(event.event)) return null;
  return {
    uuid: event.uuid,
    event: event.event,
    timestamp: event.timestamp,
    properties: Object.fromEntries(
      Object.entries(event.properties).filter(([key]) => allowedProperties.has(key)),
    ),
  };
}

async function getPostHog(): Promise<PostHog | undefined> {
  if (!feedbackAvailable()) return undefined;
  if (instance) return instance;
  if (!loading) {
    loading = import("posthog-js/dist/module.slim.no-external").then(({ default: posthog }) => {
      if (!feedbackAvailable()) return undefined;
      posthog.init(config.posthogKey, {
        api_host: config.posthogHost,
        persistence: "localStorage",
        person_profiles: "never",
        autocapture: false,
        rageclick: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_performance: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_external_dependency_loading: true,
        advanced_disable_flags: true,
        advanced_disable_toolbar_metrics: true,
        remote_config_refresh_interval_ms: 0,
        save_referrer: false,
        save_campaign_params: false,
        ip: false,
        before_send: sanitizeEvent,
      });
      // The site preference is authoritative; SDK opt-out may remain from a prior visit.
      posthog.opt_in_capturing({ captureEventName: false });
      instance = posthog;
      return instance;
    }).catch(() => {
      loading = undefined;
      return undefined;
    });
  }
  return loading;
}

function pageProperties(path: string, title: string) {
  const pathname = articlePath(path);
  return {
    $current_url: `${config.origin}${pathname}`,
    $pathname: pathname,
    $title: title,
    is_test: isTestEvent(),
    $geoip_disable: true,
  };
}

export async function capturePageview(path: string, title: string): Promise<void> {
  const properties = pageProperties(path, title);
  const posthog = await getPostHog();
  if (feedbackAvailable()) posthog?.capture("$pageview", properties);
}

export const ratings = {
  helpful: "有帮助",
  partly_helpful: "部分有帮助",
  not_helpful: "没帮助",
} as const;

export const reasons = {
  outdated: "信息可能过时或有误",
  unclear: "讲得不够清楚",
  missing: "缺少我需要的信息",
  broken_link: "文中的链接无法使用",
} as const;

export type Rating = keyof typeof ratings;
export type Reason = keyof typeof reasons;

export function beijingDay(date = new Date()): string {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function feedbackKey(path: string): string {
  return `suat:feedback:${articlePath(path)}`;
}

export function hasFeedbackToday(path: string): boolean {
  try {
    return window.localStorage.getItem(feedbackKey(path)) === beijingDay();
  } catch {
    return false;
  }
}

export type FeedbackResult = "accepted" | "duplicate" | "unavailable" | "storage-error";

export async function submitFeedback(
  path: string, title: string, rating: Rating, reason?: Reason,
): Promise<FeedbackResult> {
  if (!feedbackAvailable() || !navigator.onLine) return "unavailable";
  const posthog = await getPostHog();
  if (!posthog || !feedbackAvailable()) return "unavailable";

  const submit = (): FeedbackResult => {
    if (hasFeedbackToday(path)) return "duplicate";
    const key = feedbackKey(path);
    try {
      window.localStorage.setItem(key, beijingDay());
    } catch {
      return "storage-error";
    }
    const captured = posthog.capture("article_feedback", {
      ...pageProperties(path, title),
      article_path: articlePath(path),
      rating,
      reason: rating === "helpful" ? "none" : reason || "none",
    });
    if (!captured) {
      window.localStorage.removeItem(key);
      return "unavailable";
    }
    return "accepted";
  };

  // Serialize submissions across tabs where Web Locks is available.
  return navigator.locks
    ? navigator.locks.request(feedbackKey(path), submit)
    : submit();
}
