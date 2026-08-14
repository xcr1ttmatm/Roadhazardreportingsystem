import jsPDF from 'jspdf'
import { SEVERITY_LABELS } from './severity'

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatHazardType(type) {
  if (!type) return ''
  return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Fetches an image URL and converts it to a base64 data URL, since jsPDF
// needs image data directly rather than a remote URL.
async function urlToDataUrl(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Builds and downloads a branded hazard report PDF.
 * Used by both the Admin and Inspector report views — same report,
 * same PDF, no matter which role generates it.
 *
 * @param {object} report - the hazard_reports row (with reporter + hazard_images joined)
 * @param {object|null} detection - the latest hazard_detection_results row, if any
 */
export async function generateReportPdf(report, detection) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const maxWidth = pageWidth - margin * 2
  let y = 0

  // Header bar
  doc.setFillColor(15, 76, 129) // #0F4C81
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('Road Hazard Reporting System', margin, 12)
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text('Official Hazard Assessment Report', margin, 19)
  doc.text(`Report ID: ${report.report_id}`, margin, 25)
  y = 38

  function sectionHeader(text) {
    if (y > 270) { doc.addPage(); y = 20 }
    doc.setTextColor(15, 76, 129)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(text, margin, y)
    y += 6
    doc.setDrawColor(252, 209, 22) // accent underline
    doc.setLineWidth(0.8)
    doc.line(margin, y - 4.5, margin + 30, y - 4.5)
  }

  function bodyText(text) {
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    const lines = doc.splitTextToSize(text || '—', maxWidth)
    lines.forEach((line) => {
      if (y > 280) { doc.addPage(); y = 20 }
      doc.text(line, margin, y)
      y += 5
    })
    y += 4
  }

  sectionHeader('Basic Information')
  bodyText(
    `Title: ${report.title || 'Untitled hazard report'}\n` +
    `Status: ${STATUS_LABELS[report.status]}\n` +
    `Submitted: ${formatDate(report.created_at)}\n` +
    `Location: ${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}\n` +
    `Reported by: ${report.reporter?.username ?? 'Unknown'}`
  )

  sectionHeader('Citizen Description')
  bodyText(report.description)

  if (report.hazard_images?.[0]?.image_url) {
    try {
      const dataUrl = await urlToDataUrl(report.hazard_images[0].image_url)
      if (y > 200) { doc.addPage(); y = 20 }
      doc.addImage(dataUrl, 'JPEG', margin, y, 80, 60)
      y += 68
    } catch {
      // If the image can't be embedded, just skip it rather than failing the whole PDF
    }
  }

  if (detection) {
    sectionHeader('Computer Vision Detection')
    bodyText(
      `Hazard Type: ${formatHazardType(detection.hazard_type)}\n` +
      `Severity: ${SEVERITY_LABELS[detection.severity_level] || detection.severity_level}\n` +
      `Confidence: ${Number(detection.confidence_score).toFixed(0)}%\n` +
      `Notes: ${detection.detection_notes}`
    )
  }

  if (report.ai_report) {
    sectionHeader('Executive Summary')
    bodyText(report.ai_report.executive_summary)
    sectionHeader('Hazard Description')
    bodyText(report.ai_report.hazard_description)
    sectionHeader('Severity Assessment')
    bodyText(report.ai_report.severity_assessment)
    sectionHeader('Recommended Action')
    bodyText(report.ai_report.recommended_action)
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Generated ${new Date().toLocaleString('en-PH')} — AI-assisted draft for LGU internal review`,
    margin,
    290
  )

  doc.save(`hazard-report-${report.report_id}.pdf`)
}