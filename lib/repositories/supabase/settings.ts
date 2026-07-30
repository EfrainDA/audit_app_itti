import { requireManager } from "./access"
import { persistThresholds, type ThresholdUpdate } from "./thresholds"

export async function updateThresholds(thresholds: ThresholdUpdate[]) {
  await requireManager()
  await persistThresholds(thresholds)
}
