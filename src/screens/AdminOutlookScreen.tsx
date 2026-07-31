import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppTopNav } from "../components/AppTopNav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

type CommentaryType =
  | "weekly_outlook"
  | "event_preview"
  | "event_reaction"
  | "market_update"
  | "pair_analysis";

type FormState = {
  title: string;
  slug: string;
  authorName: string;
  previewOne: string;
  previewTwo: string;
  marketRegime: string;
  currencyOutlook: string;
  mainDrivers: string;
  importantEvents: string;
  pairOfTheWeek: string;
  technicalStructure: string;
  baseScenario: string;
  alternativeScenario: string;
  invalidation: string;
  commentaryType: CommentaryType;
  chartImageAlt: string;
  chartImageCaption: string;
  technicalChartImageAlt: string;
  technicalChartImageCaption: string;
};

const INITIAL_FORM: FormState = {
  title: "",
  slug: "",
  authorName: "Bongani Mantjate",
  previewOne: "",
  previewTwo: "",
  marketRegime: "",
  currencyOutlook: "",
  mainDrivers: "",
  importantEvents: "",
  pairOfTheWeek: "",
  technicalStructure: "",
  baseScenario: "",
  alternativeScenario: "",
  invalidation: "",
  commentaryType: "market_update",
  chartImageAlt: "",
  chartImageCaption: "",
  technicalChartImageAlt: "",
  technicalChartImageCaption: "",
};

const COMMENTARY_TYPES: CommentaryType[] = [
  "weekly_outlook",
  "event_preview",
  "event_reaction",
  "market_update",
  "pair_analysis",
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

function safeFileName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop() : "png";
  const base = name.replace(/\.[^.]+$/, "");
  return `${slugify(base) || "chart"}.${String(extension).toLowerCase()}`;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = true,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#52525b"
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

function FilePicker({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.fileCard}>
        <Text style={styles.fileLabel}>{label}</Text>
        <Text style={styles.fileHint}>Image upload is available in the web admin panel.</Text>
      </View>
    );
  }

  return (
    <View style={styles.fileCard}>
      <Text style={styles.fileLabel}>{label}</Text>
      <Text style={styles.fileHint}>
        PNG, JPG or WEBP. The file is uploaded to the private Outlook bucket.
      </Text>
      {React.createElement("input", {
        type: "file",
        accept: "image/png,image/jpeg,image/webp",
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          onFile(event.target.files?.[0] ?? null);
        },
        style: {
          width: "100%",
          marginTop: 12,
          color: "#d4d4d8",
          fontSize: 13,
        },
      })}
      <Text style={styles.fileName}>{file?.name ?? "No file selected"}</Text>
    </View>
  );
}

async function uploadChart(slug: string, role: "macro" | "technical", file: File) {
  const timestamp = Date.now();
  const objectPath = `outlooks/${slug}/${role}-${timestamp}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from("outlook-media")
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) throw error;
  return objectPath;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.trim().split(/\s+/);
  let line = "";
  let lineIndex = 0;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y + lineIndex * lineHeight);
      line = word;
      lineIndex += 1;
      if (lineIndex >= maxLines) return y + lineIndex * lineHeight;
    } else {
      line = test;
    }
  }

  if (line && lineIndex < maxLines) {
    context.fillText(line, x, y + lineIndex * lineHeight);
    lineIndex += 1;
  }

  return y + lineIndex * lineHeight;
}

function downloadSocialCard(form: FormState) {
  if (Platform.OS !== "web") return;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser.");

  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#030303");
  gradient.addColorStop(0.65, "#071820");
  gradient.addColorStop(1, "#120b20");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#164e63";
  context.lineWidth = 2;
  context.strokeRect(58, 58, 964, 1234);

  context.strokeStyle = "rgba(56,189,248,0.14)";
  context.lineWidth = 1;
  for (let x = 60; x <= 1020; x += 80) {
    context.beginPath();
    context.moveTo(x, 530);
    context.lineTo(x, 1120);
    context.stroke();
  }
  for (let y = 560; y <= 1120; y += 80) {
    context.beginPath();
    context.moveTo(60, y);
    context.lineTo(1020, y);
    context.stroke();
  }

  context.fillStyle = "#38bdf8";
  context.font = "900 28px Arial";
  context.fillText("AI MARKET EXPERT", 90, 130);

  context.fillStyle = "#a1a1aa";
  context.font = "700 22px Arial";
  context.fillText("TECHNICAL & FUNDAMENTAL OUTLOOK", 90, 175);

  context.fillStyle = "#ffffff";
  context.font = "900 72px Arial";
  const titleBottom = drawWrappedText(
    context,
    form.title || "Market Outlook Update",
    90,
    310,
    880,
    82,
    4
  );

  context.fillStyle = "#d4d4d8";
  context.font = "600 30px Arial";
  drawWrappedText(
    context,
    form.previewOne || "Macro context, technical structure and scenario planning.",
    90,
    titleBottom + 60,
    880,
    44,
    5
  );

  context.strokeStyle = "#38bdf8";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(110, 1070);
  context.lineTo(285, 980);
  context.lineTo(420, 1030);
  context.lineTo(590, 865);
  context.lineTo(750, 930);
  context.lineTo(945, 735);
  context.stroke();

  context.fillStyle = "#071820";
  context.strokeStyle = "#38bdf8";
  context.lineWidth = 2;
  context.roundRect(90, 1145, 900, 86, 24);
  context.fill();
  context.stroke();

  context.fillStyle = "#e0f2fe";
  context.font = "900 27px Arial";
  context.fillText("NOW AVAILABLE IN THE LIVE OUTLOOK ARCHIVE", 125, 1199);

  context.fillStyle = "#71717a";
  context.font = "700 20px Arial";
  context.fillText(`By ${form.authorName || "AI Market Expert"}`, 90, 1270);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(form.slug || form.title) || "outlook"}-social-card.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export default function AdminOutlookScreen() {
  const { isAdmin, profileLoading } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [macroFile, setMacroFile] = useState<File | null>(null);
  const [technicalFile, setTechnicalFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolvedSlug = useMemo(
    () => slugify(form.slug || form.title),
    [form.slug, form.title]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function publish() {
    setError(null);
    setMessage(null);

    if (!form.title.trim() || !resolvedSlug || !form.previewOne.trim()) {
      setError("Title, slug and first preview sentence are required.");
      return;
    }

    setSaving(true);

    try {
      const [chartImagePath, technicalChartImagePath] = await Promise.all([
        macroFile ? uploadChart(resolvedSlug, "macro", macroFile) : Promise.resolve(null),
        technicalFile
          ? uploadChart(resolvedSlug, "technical", technicalFile)
          : Promise.resolve(null),
      ]);

      const payload = {
        slug: resolvedSlug,
        title: form.title.trim(),
        author_name: form.authorName.trim() || "Bongani Mantjate",
        published_at: new Date().toISOString(),
        preview_sentences: [form.previewOne, form.previewTwo]
          .map((item) => item.trim())
          .filter(Boolean),
        market_regime: form.marketRegime.trim() || null,
        currency_outlook: form.currencyOutlook.trim() || null,
        main_drivers: form.mainDrivers.trim() || null,
        important_events: form.importantEvents.trim() || null,
        pair_of_the_week: form.pairOfTheWeek.trim() || null,
        technical_structure: form.technicalStructure.trim() || null,
        base_scenario: form.baseScenario.trim() || null,
        alternative_scenario: form.alternativeScenario.trim() || null,
        invalidation: form.invalidation.trim() || null,
        commentary_type: form.commentaryType,
        access_level: "premium",
        published: true,
        chart_image_path: chartImagePath,
        chart_image_alt: form.chartImageAlt.trim() || null,
        chart_image_caption: form.chartImageCaption.trim() || null,
        technical_chart_image_path: technicalChartImagePath,
        technical_chart_image_alt: form.technicalChartImageAlt.trim() || null,
        technical_chart_image_caption:
          form.technicalChartImageCaption.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from("macro_commentary")
        .upsert(payload, { onConflict: "slug" });

      if (saveError) throw saveError;

      setMessage(
        `Published successfully as ${resolvedSlug}. The latest Outlook card will update on the next refresh.`
      );
      setForm((current) => ({ ...current, slug: resolvedSlug }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centered}>
          <ActivityIndicator color="#38bdf8" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.deniedCard}>
          <Text style={styles.deniedTitle}>Admin access required</Text>
          <Text style={styles.deniedBody}>
            This publishing route is protected by profile entitlement and Supabase RLS.
          </Text>
          <Pressable
            onPress={() => router.replace("/" as never)}
            style={({ pressed }) => [styles.returnButton, pressed && styles.pressed]}
          >
            <Text style={styles.returnButtonText}>Return to dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.page,
        Platform.OS === "web" ? ({ height: "100vh" } as any) : null,
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppTopNav />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>OUTLOOK PUBLISHING DESK</Text>
          <Text style={styles.heroTitle}>Publish without opening SQL Editor.</Text>
          <Text style={styles.heroBody}>
            Write the structured thesis, attach a macro chart and a technical chart,
            publish it to the archive and generate a matching Instagram card. A small
            administrative miracle, previously known as doing five unrelated tasks manually.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.twoColumn}>
            <Field
              label="Title"
              value={form.title}
              onChangeText={(value) => {
                update("title", value);
                if (!form.slug) update("slug", slugify(value));
              }}
              placeholder="Post-Fed Decision Market Update"
              multiline={false}
              required
            />
            <Field
              label="Slug"
              value={form.slug}
              onChangeText={(value) => update("slug", slugify(value))}
              placeholder="post-fed-decision-market-update"
              multiline={false}
              required
            />
            <Field
              label="Author"
              value={form.authorName}
              onChangeText={(value) => update("authorName", value)}
              placeholder="Bongani Mantjate"
              multiline={false}
              required
            />
          </View>

          <Text style={styles.subheading}>Publication type</Text>
          <View style={styles.typeRow}>
            {COMMENTARY_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => update("commentaryType", type)}
                style={({ pressed }) => [
                  styles.typeButton,
                  form.commentaryType === type && styles.typeButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    form.commentaryType === type && styles.typeTextActive,
                  ]}
                >
                  {type.replace(/_/g, " ")}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          <Field
            label="Public preview sentence 1"
            value={form.previewOne}
            onChangeText={(value) => update("previewOne", value)}
            placeholder="The first public sentence shown before the subscription wall."
            required
          />
          <Field
            label="Public preview sentence 2"
            value={form.previewTwo}
            onChangeText={(value) => update("previewTwo", value)}
            placeholder="The second public sentence shown before the subscription wall."
          />

          <View style={styles.twoColumn}>
            <Field label="Market regime" value={form.marketRegime} onChangeText={(value) => update("marketRegime", value)} placeholder="Current regime and sentiment." />
            <Field label="Currency outlook" value={form.currencyOutlook} onChangeText={(value) => update("currencyOutlook", value)} placeholder="USD, EUR, GBP, JPY or relevant currency view." />
            <Field label="Main drivers" value={form.mainDrivers} onChangeText={(value) => update("mainDrivers", value)} placeholder="Rates, inflation, yields, oil, geopolitics and capital flows." />
            <Field label="Important events" value={form.importantEvents} onChangeText={(value) => update("importantEvents", value)} placeholder="Scheduled events and headline risks." />
            <Field label="Pair of interest" value={form.pairOfTheWeek} onChangeText={(value) => update("pairOfTheWeek", value)} placeholder="Pair and reason it matters." />
            <Field label="Technical structure" value={form.technicalStructure} onChangeText={(value) => update("technicalStructure", value)} placeholder="Structure, levels and confirmation conditions." />
            <Field label="Base scenario" value={form.baseScenario} onChangeText={(value) => update("baseScenario", value)} placeholder="Primary market scenario." />
            <Field label="Alternative scenario" value={form.alternativeScenario} onChangeText={(value) => update("alternativeScenario", value)} placeholder="Alternative outcome and catalyst." />
          </View>
          <Field label="Invalidation" value={form.invalidation} onChangeText={(value) => update("invalidation", value)} placeholder="What invalidates the thesis or setup." />

          <View style={styles.divider} />
          <Text style={styles.subheading}>Charts</Text>
          <View style={styles.twoColumn}>
            <View style={styles.chartColumn}>
              <FilePicker label="Macro / fundamental chart" file={macroFile} onFile={setMacroFile} />
              <Field label="Macro chart alt text" value={form.chartImageAlt} onChangeText={(value) => update("chartImageAlt", value)} placeholder="Describe the chart for accessibility." multiline={false} />
              <Field label="Macro chart caption" value={form.chartImageCaption} onChangeText={(value) => update("chartImageCaption", value)} placeholder="Short explanation under the image." />
            </View>
            <View style={styles.chartColumn}>
              <FilePicker label="Technical chart" file={technicalFile} onFile={setTechnicalFile} />
              <Field label="Technical chart alt text" value={form.technicalChartImageAlt} onChangeText={(value) => update("technicalChartImageAlt", value)} placeholder="Describe the setup and key levels." multiline={false} />
              <Field label="Technical chart caption" value={form.technicalChartImageCaption} onChangeText={(value) => update("technicalChartImageCaption", value)} placeholder="Short technical chart explanation." />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <View style={styles.actionRow}>
            <Pressable
              disabled={saving}
              onPress={() => void publish()}
              style={({ pressed }) => [
                styles.publishAction,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.publishActionText}>Publish Outlook</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => downloadSocialCard({ ...form, slug: resolvedSlug })}
              style={({ pressed }) => [styles.socialAction, pressed && styles.pressed]}
            >
              <Text style={styles.socialActionText}>Download 4:5 social card</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          Publishing and image upload are enforced by Supabase admin RLS policies. Draft carefully. The database is less forgiving than Instagram captions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#050505" },
  scrollContent: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 96,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.55 },
  deniedCard: {
    width: "90%",
    maxWidth: 560,
    margin: "auto" as any,
    borderWidth: 1,
    borderColor: "#881337",
    borderRadius: 24,
    backgroundColor: "#1c0710",
    padding: 22,
  },
  deniedTitle: { color: "#ffffff", fontSize: 24, fontWeight: "900" },
  deniedBody: { marginTop: 9, color: "#fda4af", fontSize: 14, lineHeight: 22 },
  returnButton: {
    marginTop: 17,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#fda4af",
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  returnButtonText: { color: "#ffffff", fontWeight: "900" },
  hero: { marginBottom: 25, maxWidth: 850 },
  eyebrow: { color: "#38bdf8", fontSize: 10, fontWeight: "900", letterSpacing: 2.5 },
  heroTitle: { marginTop: 14, color: "#ffffff", fontSize: 43, lineHeight: 51, fontWeight: "900", letterSpacing: -1.1 },
  heroBody: { marginTop: 13, color: "#a1a1aa", fontSize: 16, lineHeight: 27 },
  formCard: {
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 27,
    backgroundColor: "#09090b",
    padding: 21,
  },
  twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: 13 },
  field: { flexGrow: 1, flexBasis: 480, marginBottom: 13 },
  fieldLabel: { marginBottom: 7, color: "#d4d4d8", fontSize: 11, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 15,
    backgroundColor: "#0c0c0e",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 112, textAlignVertical: "top" },
  subheading: { marginBottom: 10, color: "#ffffff", fontSize: 17, fontWeight: "900" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeButton: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 999,
    backgroundColor: "#0c0c0e",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  typeButtonActive: { borderColor: "#38bdf8", backgroundColor: "#082f49" },
  typeText: { color: "#a1a1aa", fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  typeTextActive: { color: "#e0f2fe" },
  divider: { height: 1, marginVertical: 22, backgroundColor: "#202026" },
  chartColumn: { flexGrow: 1, flexBasis: 480 },
  fileCard: {
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#0c4a6e",
    borderRadius: 17,
    backgroundColor: "#071820",
    padding: 15,
  },
  fileLabel: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  fileHint: { marginTop: 6, color: "#a1a1aa", fontSize: 11, lineHeight: 17 },
  fileName: { marginTop: 10, color: "#7dd3fc", fontSize: 11, fontWeight: "800" },
  errorText: { marginTop: 12, color: "#fda4af", fontSize: 13, lineHeight: 20 },
  successText: { marginTop: 12, color: "#6ee7b7", fontSize: 13, lineHeight: 20 },
  actionRow: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 11 },
  publishAction: {
    minWidth: 210,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 17,
    backgroundColor: "#0369a1",
    paddingHorizontal: 18,
  },
  publishActionText: { color: "#ffffff", fontWeight: "900" },
  socialAction: {
    minWidth: 230,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c4b5fd",
    borderRadius: 17,
    backgroundColor: "#4c1d95",
    paddingHorizontal: 18,
  },
  socialActionText: { color: "#ffffff", fontWeight: "900" },
  disclaimer: { marginTop: 22, color: "#52525b", textAlign: "center", fontSize: 11, lineHeight: 18 },
});
