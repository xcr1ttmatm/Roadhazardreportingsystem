// src/lib/hazardDetection.js
//
// The "hybrid" detection used by the admin's Run Detection button:
//   1. Your trained YOLOv8 model runs in the browser.
//   2. If it finds a hazard it is confident about, that result is saved.
//   3. If it finds nothing confident (or can't run at all), the existing Gemini
//      Edge Function (`detect-hazard`) does the analysis instead.
// Every saved result records which engine produced it (detection_source).

import { detectInBrowser, MIN_CONFIDENCE, toStoredDetections } from './localDetector'
import { friendlyAiError, readFunctionError } from './functionErrors'

/**
 * @param {object} report    the hazard_reports row, with hazard_images joined
 * @param {object} supabase  the Supabase client
 * @param {object} [options]
 * @param {Function} [options.detector]  replaceable for testing
 * @param {(stage: 'local' | 'fallback') => void} [options.onStatus]
 * @returns {Promise<{source: 'yolov8_local' | 'gemini', detection: object, fallbackReason?: string}>}
 */
export async function runHazardDetection(report, supabase, { detector = detectInBrowser, onStatus = () => {} } = {}) {
  const primaryImage = report?.hazard_images?.[0]
  if (!primaryImage?.image_url) throw new Error('This report has no image to analyze')

  // 1. Try the trained model. Only model/runtime problems are caught here;
  //    database problems further down are real errors and are NOT hidden by a fallback.
  let summary = null
  let storedBoxes = null // everything the model saw, saved with the result either way
  let fallbackReason = null
  onStatus('local')
  try {
    const result = await detector(primaryImage.image_url)
    summary = result.summary
    if (result.imageSize) {
      storedBoxes = toStoredDetections(result.detections || [], result.imageSize.width, result.imageSize.height)
    }
    console.info(
      '[hazard-detection] trained model saw:',
      (result.detections || []).map((d) => `${d.label} ${Math.round(d.confidence * 100)}%`)
    )
    if (!summary) fallbackReason = explainNoResult(result.detections)
  } catch (err) {
    console.warn('Trained model could not run, using Gemini instead:', err)
    fallbackReason = `The trained model could not run (${err.message}).`
  }

  if (summary) {
    return { source: 'yolov8_local', detection: await saveLocalDetection(report, primaryImage, summary, storedBoxes, supabase) }
  }

  // 2. Fallback: the existing Gemini Edge Function.
  onStatus('fallback')
  const { data, error } = await supabase.functions.invoke('detect-hazard', {
    body: {
      reportId: report.report_id,
      imageId: primaryImage.image_id,
      imageUrl: primaryImage.image_url,
    },
  })
  if (error) throw new Error(friendlyAiError(await readFunctionError(error)))
  if (data?.error) throw new Error(friendlyAiError(data.error))

  // Label the result's origin and keep what the trained model saw (its weaker guesses), so the admin
  // can see why it was not used. Best-effort: if the columns are missing the result still stands,
  // and the UI treats an unlabeled result as Gemini.
  await supabase
    .from('hazard_detection_results')
    .update({ detection_source: 'gemini', detections: storedBoxes })
    .eq('detection_id', data.detection.detection_id)

  return {
    source: 'gemini',
    detection: { ...data.detection, detection_source: 'gemini', detections: storedBoxes },
    fallbackReason,
  }
}

/** Plain-English reason the trained model's result was not used, including its best guess. */
function explainNoResult(dets = []) {
  if (dets.length === 0) return 'The trained model ran, but nothing in the photo scored above 25%.'
  const best = dets.reduce((a, b) => (b.confidence > a.confidence ? b : a))
  const needed = MIN_CONFIDENCE[best.label] ?? 0.5
  return (
    `The trained model ran. Its best guess was ${best.label.toLowerCase()} at ${Math.round(best.confidence * 100)}%, ` +
    `below the ${Math.round(needed * 100)}% it needs to be trusted.`
  )
}

async function saveLocalDetection(report, primaryImage, summary, storedBoxes, supabase) {
  const { data: detection, error } = await supabase
    .from('hazard_detection_results')
    .insert({
      report_id: report.report_id,
      image_id: primaryImage.image_id,
      hazard_type: summary.hazardType,
      severity_level: summary.severityLevel,
      confidence_score: summary.confidenceScore,
      detection_notes: summary.notes,
      detection_source: 'yolov8_local',
      detections: storedBoxes,
    })
    .select()
    .single()
  if (error) throw new Error(`Could not save the detection result: ${error.message}`)

  // Always keep the report's severity current...
  const { error: severityError } = await supabase
    .from('hazard_reports')
    .update({ severity: summary.severityLevel })
    .eq('report_id', report.report_id)
  if (severityError) throw new Error(`Could not update the report: ${severityError.message}`)

  // ...but only move a brand-new report into review. Re-running detection on a report that is
  // already verified/approved must not push it backwards (and re-notify the citizen).
  const { error: statusError } = await supabase
    .from('hazard_reports')
    .update({ status: 'under_review' })
    .eq('report_id', report.report_id)
    .eq('status', 'pending')
  if (statusError) throw new Error(`Could not update the report: ${statusError.message}`)

  return detection
}