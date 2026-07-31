import {
  OUTLOOKS,
  type OutlookSection,
  type TechnicalFundamentalOutlook,
} from "../config/outlookContent";
import { supabase } from "../lib/supabase";

const OUTLOOK_MEDIA_BUCKET = "outlook-media";
const SIGNED_IMAGE_TTL_SECONDS = 60 * 60;

type FullOutlookRow = {
  id: string;
  slug: string;
  title: string;
  author_name: string;
  published_at: string;
  preview_sentences: string[] | null;
  market_regime: string | null;
  currency_outlook: string | null;
  main_drivers: string | null;
  important_events: string | null;
  pair_of_the_week: string | null;
  technical_structure: string | null;
  base_scenario: string | null;
  alternative_scenario: string | null;
  invalidation: string | null;
  commentary_type: string;
  access_level: string;
  chart_image_path: string | null;
  chart_image_alt: string | null;
  chart_image_caption: string | null;
  technical_chart_image_path: string | null;
  technical_chart_image_alt: string | null;
  technical_chart_image_caption: string | null;
};

type PreviewOutlookRow = Pick<
  FullOutlookRow,
  | "id"
  | "slug"
  | "title"
  | "author_name"
  | "published_at"
  | "preview_sentences"
  | "commentary_type"
  | "access_level"
>;

export type OutlookArticle = TechnicalFundamentalOutlook & {
  slug: string;
  commentaryType: string;
  accessLevel: string;
  chartImageUrl: string | null;
  chartImageAlt: string | null;
  chartImageCaption: string | null;
  technicalChartImageUrl: string | null;
  technicalChartImageAlt: string | null;
  technicalChartImageCaption: string | null;
  previewOnly: boolean;
};

export type OutlookFeedResult = {
  outlooks: OutlookArticle[];
  databaseBacked: boolean;
  warning: string | null;
};

function section(
  key: OutlookSection["key"],
  title: string,
  body?: string | null
): OutlookSection | null {
  const cleanBody = String(body ?? "").trim();
  if (!cleanBody) return null;
  return { key, title, body: cleanBody };
}

function buildSections(row: FullOutlookRow): OutlookSection[] {
  return [
    section("market_regime", "Market regime", row.market_regime),
    section("currency_outlook", "USD / EUR / GBP / JPY outlook", row.currency_outlook),
    section("main_drivers", "Main drivers", row.main_drivers),
    section("important_events", "Important events", row.important_events),
    section("pair_of_the_week", "Pair of the week", row.pair_of_the_week),
    section("technical_structure", "Technical structure", row.technical_structure),
    section("base_scenario", "Base scenario", row.base_scenario),
    section("alternative_scenario", "Alternative scenario", row.alternative_scenario),
    section("invalidation", "Invalidation", row.invalidation),
  ].filter((item): item is OutlookSection => Boolean(item));
}

function normalizePreview(value: string[] | null | undefined) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 2)
    : [];
}

function emptyMediaFields() {
  return {
    chartImageUrl: null,
    chartImageAlt: null,
    chartImageCaption: null,
    technicalChartImageUrl: null,
    technicalChartImageAlt: null,
    technicalChartImageCaption: null,
  };
}

function mapPreviewRow(row: PreviewOutlookRow): OutlookArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author_name,
    publishedAt: row.published_at,
    preview: normalizePreview(row.preview_sentences),
    sections: [],
    commentaryType: row.commentary_type,
    accessLevel: row.access_level,
    ...emptyMediaFields(),
    previewOnly: true,
  };
}

async function getSignedChartUrl(path?: string | null) {
  const cleanPath = String(path ?? "").trim();
  if (!cleanPath) return null;

  const { data, error } = await supabase.storage
    .from(OUTLOOK_MEDIA_BUCKET)
    .createSignedUrl(cleanPath, SIGNED_IMAGE_TTL_SECONDS);

  if (error) {
    console.warn(`Failed to create Outlook chart URL for ${cleanPath}:`, error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}

async function mapFullRow(row: FullOutlookRow): Promise<OutlookArticle> {
  const [chartImageUrl, technicalChartImageUrl] = await Promise.all([
    getSignedChartUrl(row.chart_image_path),
    getSignedChartUrl(row.technical_chart_image_path),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author_name,
    publishedAt: row.published_at,
    preview: normalizePreview(row.preview_sentences),
    sections: buildSections(row),
    commentaryType: row.commentary_type,
    accessLevel: row.access_level,
    chartImageUrl,
    chartImageAlt: row.chart_image_alt,
    chartImageCaption: row.chart_image_caption,
    technicalChartImageUrl,
    technicalChartImageAlt: row.technical_chart_image_alt,
    technicalChartImageCaption: row.technical_chart_image_caption,
    previewOnly: false,
  };
}

function localFallback(): OutlookArticle[] {
  return [...OUTLOOKS]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .map((item) => ({
      ...item,
      slug: item.id,
      commentaryType: "weekly_outlook",
      accessLevel: "premium",
      ...emptyMediaFields(),
      previewOnly: false,
    }));
}

export async function fetchOutlookFeed(
  hasFullAccess: boolean
): Promise<OutlookFeedResult> {
  try {
    if (hasFullAccess) {
      const { data, error } = await supabase
        .from("macro_commentary")
        .select(
          [
            "id",
            "slug",
            "title",
            "author_name",
            "published_at",
            "preview_sentences",
            "market_regime",
            "currency_outlook",
            "main_drivers",
            "important_events",
            "pair_of_the_week",
            "technical_structure",
            "base_scenario",
            "alternative_scenario",
            "invalidation",
            "commentary_type",
            "access_level",
            "chart_image_path",
            "chart_image_alt",
            "chart_image_caption",
            "technical_chart_image_path",
            "technical_chart_image_alt",
            "technical_chart_image_caption",
          ].join(",")
        )
        .eq("published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;

      if (data?.length) {
        return {
          outlooks: await Promise.all(
            (data as FullOutlookRow[]).map((row) => mapFullRow(row))
          ),
          databaseBacked: true,
          warning: null,
        };
      }
    } else {
      const { data, error } = await supabase
        .from("macro_commentary_previews")
        .select(
          "id,slug,title,author_name,published_at,preview_sentences,commentary_type,access_level"
        )
        .order("published_at", { ascending: false });

      if (error) throw error;

      if (data?.length) {
        return {
          outlooks: (data as PreviewOutlookRow[]).map(mapPreviewRow),
          databaseBacked: true,
          warning: null,
        };
      }
    }

    return {
      outlooks: localFallback(),
      databaseBacked: false,
      warning:
        "No published database outlook was found. Showing the reviewed local fallback.",
    };
  } catch (error: any) {
    console.error("Failed to load Outlook feed:", error);

    return {
      outlooks: localFallback(),
      databaseBacked: false,
      warning:
        error?.message ??
        "The Outlook database could not be reached. Showing the reviewed local fallback.",
    };
  }
}
