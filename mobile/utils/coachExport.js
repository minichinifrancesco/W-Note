import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  formatBadgeDate,
  formatBadgeValue,
  formatDuration,
  formatLastTrainedAt,
  formatSignedDuration,
  formatSignedNumber,
  formatSignedPercent,
  formatSignedVolume,
  formatVolume,
  formatWeight,
} from "../features/coach/utils/coachFormatter";

const sanitizeFileName = (value = "coach-report") => {
  const cleaned = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return cleaned || "coach-report";
};

const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getCoachReportFileName = (summary) => {
  const start = summary?.period?.start
    ? String(summary.period.start).slice(0, 10)
    : "periodo";

  return `${sanitizeFileName(`coach-report-${start}`)}.pdf`;
};

const shareFile = async (uri, options) => {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    return uri;
  }

  await Sharing.shareAsync(uri, options);
  return uri;
};

const renderRows = (rows) => rows.join("");

const renderKeyValueRows = (entries) =>
  renderRows(
    entries.map(
      ([label, value]) => `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>`,
    ),
  );

const renderBulletList = (items, emptyMessage) => {
  const validItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (validItems.length === 0) {
    return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  }

  return `
<ul>
  ${validItems
    .map(
      (item) => `
  <li>${escapeHtml(item)}</li>`,
    )
    .join("")}
</ul>`;
};

const getStatusLabel = (status) => {
  if (status === "none") return "Non allenato";
  if (status === "low") return "Poco allenato";
  if (status === "ok") return "In equilibrio";
  if (status === "high") return "Molto allenato";

  return "Non disponibile";
};

const getTrendStatusLabel = (status) => {
  if (status === "IMPROVING") return "In crescita";
  if (status === "DECLINING") return "In calo";

  return "Stabile";
};

const formatSessionCount = (value) => {
  const count = Number(value || 0);

  return `${count} ${count === 1 ? "allenamento" : "allenamenti"}`;
};

const formatDayCount = (value) => {
  const count = Number(value || 0);

  return `${count} ${count === 1 ? "giorno" : "giorni"}`;
};

const formatReportDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));

  if (safeSeconds > 0 && safeSeconds < 60) {
    return "< 1 min";
  }

  return formatDuration(safeSeconds);
};

const formatSignedReportDuration = (seconds) => {
  const safeSeconds = Math.floor(Number(seconds) || 0);
  const absoluteSeconds = Math.abs(safeSeconds);

  if (absoluteSeconds > 0 && absoluteSeconds < 60) {
    return `${safeSeconds > 0 ? "+" : "-"} < 1 min`;
  }

  return formatSignedDuration(safeSeconds);
};

const getWeeklyPaceContent = (progress = {}) => {
  const completed = Number(progress.completedSessions || 0);
  const target = Number(progress.targetSessions || 0);
  const expected = Number(progress.expectedSessions || 0);
  const daysRemaining = Number(progress.daysRemaining || 0);

  const completionLabel = `Hai completato ${formatSessionCount(
    completed,
  )} su ${target}.`;

  if (progress.status === "TARGET_REACHED") {
    return {
      title: "Target settimanale raggiunto",
      completionLabel,
      detail:
        "Hai raggiunto il numero di sedute previsto. Mantieni attenzione a recupero e qualità del lavoro.",
      expected,
      daysRemaining,
    };
  }

  if (progress.status === "ABOVE_TARGET") {
    return {
      title: "Target settimanale superato",
      completionLabel,
      detail:
        "Hai superato il numero di sedute previsto. Valuta se lasciare spazio a recupero o mobilità.",
      expected,
      daysRemaining,
    };
  }

  if (progress.paceStatus === "BEHIND_TARGET") {
    return {
      title: "Ritmo da recuperare",
      completionLabel,
      detail:
        daysRemaining === 0
          ? "La settimana è conclusa: usa questo dato per distribuire meglio il lavoro nella prossima."
          : `A questo punto erano attesi ${formatSessionCount(
              expected,
            )}. Restano ${formatDayCount(
              daysRemaining,
            )}: evita di recuperare tutto con volume eccessivo.`,
      expected,
      daysRemaining,
    };
  }

  return {
    title:
      progress.status === "NOT_STARTED"
        ? "Settimana da iniziare"
        : "In linea con il ritmo",
    completionLabel,
    detail:
      expected === 0
        ? `La settimana è appena iniziata. Restano ${formatDayCount(
            daysRemaining,
          )} per distribuire le sedute.`
        : `A questo punto erano attesi ${formatSessionCount(
            expected,
          )}. Restano ${formatDayCount(daysRemaining)}.`,
    expected,
    daysRemaining,
  };
};

const buildMetricRows = (summary, formatOptions) => {
  const totals = summary?.totals || {};

  return renderKeyValueRows([
    ["Sessioni", totals.sessions || 0],
    ["Durata totale", formatReportDuration(totals.durationSeconds)],
    ["Durata media", formatReportDuration(totals.averageDurationSeconds)],
    ["Serie completate", totals.completedSets || 0],
    ["Volume", formatVolume(totals.volume || 0, formatOptions)],
  ]);
};

const buildComparisonRows = (summary, formatOptions) => {
  const comparison = summary?.comparison || {};

  return renderKeyValueRows([
    ["Sessioni", formatSignedNumber(comparison.sessionsDelta || 0)],
    ["Durata", formatSignedReportDuration(comparison.durationSecondsDelta)],
    [
      "Serie completate",
      formatSignedNumber(comparison.completedSetsDelta || 0),
    ],
    ["Volume", formatSignedVolume(comparison.volumeDelta || 0, formatOptions)],
    [
      "Variazione volume",
      formatSignedPercent(comparison.volumeDeltaPercent || 0),
    ],
  ]);
};

const buildWeeklyPaceBlock = (summary) => {
  const progress = summary?.recommendedSession?.weeklyProgress;

  if (!progress) {
    return '<p class="empty">Ritmo settimanale non disponibile.</p>';
  }

  const content = getWeeklyPaceContent(progress);

  return `
<table>
  <tbody>
    ${renderKeyValueRows([
      ["Stato", content.title],
      ["Completamento", content.completionLabel],
      ["Dettaglio", content.detail],
      [
        "Previsti al momento del riepilogo",
        formatSessionCount(content.expected),
      ],
      ["Giorni rimanenti", formatDayCount(content.daysRemaining)],
    ])}
  </tbody>
</table>`;
};

const buildRecommendedSessionBlock = (summary) => {
  const recommendation = summary?.recommendedSession;

  if (!recommendation?.sessionType) {
    return '<p class="empty">Nessuna seduta consigliata disponibile.</p>';
  }

  const detailRows = [
    ["Focus della seduta", recommendation.focus],
    ["Struttura", recommendation.structure],
    ["Intensità", recommendation.intensity],
    ["Indicazione generale", recommendation.guidance],
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);

  return `
<p class="recommendation-type">
  ${escapeHtml(recommendation.sessionType)}
</p>

<p class="subheading">Perché</p>
${renderBulletList(recommendation.reasons, "Nessuna motivazione disponibile.")}

<p class="subheading">Priorità</p>
${renderBulletList(recommendation.priorities, "Nessuna priorità specifica.")}

${
  detailRows.length > 0
    ? `
<table>
  <tbody>
    ${renderKeyValueRows(detailRows)}
  </tbody>
</table>`
    : ""
}`;
};

const buildExerciseTrendCards = (summary, formatOptions) => {
  const trends = Array.isArray(summary?.exerciseTrends)
    ? summary.exerciseTrends.filter(Boolean)
    : [];

  if (trends.length === 0) {
    return '<p class="empty">Nessun trend esercizio disponibile.</p>';
  }

  return renderRows(
    trends.map(
      (trend) => `
<div class="trend-card">
  <div class="trend-card-header">
    <div>
      <p class="trend-exercise">${escapeHtml(trend.exerciseName)}</p>
      <p class="trend-group">${escapeHtml(trend.muscleGroup)}</p>
    </div>
    <p class="trend-status">${escapeHtml(getTrendStatusLabel(trend.status))}</p>
</div>

  <table class="trend-metrics">
    <tbody>
      ${renderKeyValueRows([
        [
          "1RM stimato",
          formatWeight(trend.currentEstimatedOneRm, formatOptions),
        ],
        [
          "Seduta precedente",
          formatWeight(trend.previousEstimatedOneRm, formatOptions),
        ],
        ["Variazione", formatSignedPercent(trend.deltaPercent)],
      ])}
    </tbody>
  </table>

  <p class="trend-reading">
    <strong>Lettura:</strong> ${escapeHtml(trend.message)}
  </p>
</div>`,
    ),
  );
};

const buildDayRows = (summary, formatOptions) => {
  const days = Array.isArray(summary?.days) ? summary.days : [];

  if (days.length === 0) {
    return '<tr><td colspan="4">Nessun dato giornaliero disponibile.</td></tr>';
  }

  return renderRows(
    days.map(
      (day) => `
<tr>
  <td>${escapeHtml(new Date(day.date).toLocaleDateString("it-IT"))}</td>
  <td>${escapeHtml(day.sessions || 0)}</td>
  <td>${escapeHtml(day.completedSets || 0)}</td>
  <td>${escapeHtml(formatVolume(day.volume || 0, formatOptions))}</td>
</tr>`,
    ),
  );
};

const buildInsightBlocks = (summary) => {
  const insights = Array.isArray(summary?.insights) ? summary.insights : [];

  if (insights.length === 0) {
    return '<p class="empty">Nessun consiglio disponibile.</p>';
  }

  return renderRows(
    insights.map(
      (insight) => `
<div class="note">
  <strong>${escapeHtml(insight.title)}</strong>
  <p>${escapeHtml(insight.message)}</p>
</div>`,
    ),
  );
};

const buildNextFocusBlock = (summary) => {
  const nextFocus = summary?.nextFocus;
  const groups = Array.isArray(nextFocus?.groups) ? nextFocus.groups : [];

  if (!nextFocus) {
    return '<p class="empty">Nessun focus disponibile.</p>';
  }

  const groupRows =
    groups.length > 0
      ? renderRows(
          groups.map(
            (group) => `
<tr>
  <td>${escapeHtml(group.name)}</td>
  <td>${escapeHtml(getStatusLabel(group.status))}</td>
  <td>${escapeHtml(group.sets || 0)}</td>
  <td>${escapeHtml(group.reason || "-")}</td>
</tr>`,
          ),
        )
      : '<tr><td colspan="4">Nessuna priorità specifica.</td></tr>';

  return `
<p class="muted">${escapeHtml(nextFocus.message)}</p>

<table>
  <thead>
    <tr>
      <th>Gruppo</th>
      <th>Stato</th>
      <th>Serie</th>
      <th>Motivo</th>
    </tr>
  </thead>
  <tbody>${groupRows}</tbody>
</table>`;
};

const buildMuscleGroupRows = (summary, formatOptions) => {
  const groups = Array.isArray(summary?.muscleGroups)
    ? summary.muscleGroups
    : [];

  if (groups.length === 0) {
    return '<tr><td colspan="5">Nessun gruppo muscolare disponibile.</td></tr>';
  }

  return renderRows(
    groups.map(
      (group) => `
<tr>
  <td>${escapeHtml(group.name)}</td>
  <td>${escapeHtml(getStatusLabel(group.status))}</td>
  <td>${escapeHtml(group.sets || 0)}</td>
  <td>${escapeHtml(formatVolume(group.volume || 0, formatOptions))}</td>
  <td>${escapeHtml(formatLastTrainedAt(group.lastTrainedAt))}</td>
</tr>`,
    ),
  );
};

const buildBadgeRows = (summary, formatOptions) => {
  const badges = Array.isArray(summary?.badges?.items)
    ? summary.badges.items
    : [];

  if (badges.length === 0) {
    return '<tr><td colspan="4">Nessun badge ottenuto nel periodo.</td></tr>';
  }

  return renderRows(
    badges.map(
      (badge) => `
<tr>
  <td>${escapeHtml(badge.name)}</td>
  <td>${escapeHtml(badge.exerciseName || "Badge generale")}</td>
  <td>${escapeHtml(
    formatBadgeValue(badge.value, badge.code, formatOptions) || "-",
  )}</td>
  <td>${escapeHtml(formatBadgeDate(badge.earnedAt))}</td>
</tr>`,
    ),
  );
};

const buildCoachReportHtml = (summary, formatOptions = {}) => {
  const periodLabel = summary?.period?.label || "Periodo non disponibile";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.45;
        margin: 32px;
      }

      h1 {
        color: #15803d;
        font-size: 28px;
        margin: 0 0 4px;
      }

      h2 {
        border-bottom: 1px solid #e2e8f0;
        font-size: 18px;
        margin: 26px 0 10px;
        padding-bottom: 6px;
      }

      .muted {
        color: #64748b;
        margin: 0 0 12px;
      }

      .subheading {
        color: #334155;
        font-size: 14px;
        font-weight: 700;
        margin: 16px 0 4px;
      }

      .recommendation-type {
        color: #15803d;
        font-size: 18px;
        font-weight: 700;
        margin: 4px 0 14px;
      }

      table {
        border-collapse: collapse;
        margin-bottom: 12px;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid #e2e8f0;
        padding: 8px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f8fafc;
        color: #334155;
        font-size: 12px;
        text-transform: uppercase;
      }

      ul {
        margin: 6px 0 14px;
        padding-left: 20px;
      }

      li {
        margin: 5px 0;
      }

      .note {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        margin: 10px 0;
        padding: 12px;
      }

      .note p {
        color: #475569;
        margin: 4px 0 0;
      }

      .trend-card {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        break-inside: avoid;
        margin: 12px 0;
        page-break-inside: avoid;
        padding: 14px;
      }

      .trend-card-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      .trend-exercise {
        font-size: 17px;
        font-weight: 700;
        margin: 0;
      }

      .trend-group {
        color: #64748b;
        margin: 2px 0 0;
      }

      .trend-status {
        color: #15803d;
        font-weight: 700;
        margin: 0;
        white-space: nowrap;
      }

      .trend-metrics {
        margin: 12px 0;
      }

      .trend-metrics td:first-child {
        color: #475569;
        width: 40%;
      }

      .trend-reading {
        color: #334155;
        margin: 0;
      }

      .empty {
        color: #64748b;
      }
    </style>
  </head>

  <body>
    <h1>Report Coach W-Note</h1>
    <p class="muted">${escapeHtml(periodLabel)}</p>

    <h2>Riepilogo</h2>
    <table>
      <tbody>${buildMetricRows(summary, formatOptions)}</tbody>
    </table>

    <h2>Ritmo settimanale</h2>
    ${buildWeeklyPaceBlock(summary)}

    <h2>Prossima seduta consigliata</h2>
    ${buildRecommendedSessionBlock(summary)}

    <h2>Lettura del progresso</h2>
    ${buildExerciseTrendCards(summary, formatOptions)}

    <h2>Distribuzione settimana</h2>
    <table>
      <thead>
        <tr>
          <th>Giorno</th>
          <th>Sessioni</th>
          <th>Serie</th>
          <th>Volume</th>
        </tr>
      </thead>
      <tbody>${buildDayRows(summary, formatOptions)}</tbody>
    </table>

    <h2>Confronto settimana precedente</h2>
    <table>
      <tbody>${buildComparisonRows(summary, formatOptions)}</tbody>
    </table>

    <h2>Consigli del Coach</h2>
    ${buildInsightBlocks(summary)}

    <h2>Prossimo Focus</h2>
    ${buildNextFocusBlock(summary)}

    <h2>Copertura muscolare</h2>
    <table>
      <thead>
        <tr>
          <th>Gruppo</th>
          <th>Stato</th>
          <th>Serie</th>
          <th>Volume</th>
          <th>Ultima volta</th>
        </tr>
      </thead>
      <tbody>${buildMuscleGroupRows(summary, formatOptions)}</tbody>
    </table>

    <h2>Badge settimanali</h2>
    <table>
      <thead>
        <tr>
          <th>Badge</th>
          <th>Esercizio</th>
          <th>Valore</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>${buildBadgeRows(summary, formatOptions)}</tbody>
    </table>
  </body>
</html>`;
};

export const exportCoachSummaryAsPdf = async (summary, formatOptions = {}) => {
  if (!summary || Number(summary?.totals?.sessions || 0) <= 0) {
    throw new Error(
      "Non ci sono allenamenti da esportare per il periodo selezionato.",
    );
  }

  const html = buildCoachReportHtml(summary, formatOptions);

  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return null;
  }

  const fileName = getCoachReportFileName(summary);
  const { uri } = await Print.printToFileAsync({ html });
  const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const targetUri = `${directory}${fileName}`;

  await FileSystem.copyAsync({ from: uri, to: targetUri });

  return shareFile(targetUri, {
    dialogTitle: "Condividi report Coach in PDF",
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });
};
