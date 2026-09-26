import { Medicine, Batch, InventoryCategory } from '../types';
import { AiInventoryAnalysisData } from '../components/AiInventoryAnalysisModal';

export function computeLocalAiInventoryAnalysis(
  medicines: Medicine[],
  batches: Batch[],
  stockMap: Map<string, number>,
  medicineBatchesMap: Map<string, Batch[]>,
  todayTime: number,
  ninetyDaysMs: number
): AiInventoryAnalysisData {
  let expiredCount = 0;
  let nearExpiryCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let overstockedCount = 0;
  let reorderNeededCount = 0;
  let totalAtRiskValue = 0;

  const categorizations = medicines.map((m) => {
    const stock = stockMap.get(m.id) || 0;
    const mBatches = medicineBatchesMap.get(m.id) || [];
    const minAlert = m.minStockAlert || 30;

    const expiredBatches = mBatches.filter(
      (b) => b.quantity > 0 && new Date(b.expiryDate).getTime() < todayTime
    );
    const nearExpiryBatches = mBatches.filter((b) => {
      if (b.quantity <= 0) return false;
      const diff = new Date(b.expiryDate).getTime() - todayTime;
      return diff >= 0 && diff <= ninetyDaysMs;
    });

    const hasExpired = expiredBatches.length > 0;
    const hasNearExpiry = nearExpiryBatches.length > 0;
    const isOut = stock === 0;
    const isLow = stock > 0 && stock <= minAlert;
    const isOver = stock > minAlert * 3;

    // Calculate at risk value
    for (const eb of expiredBatches) {
      totalAtRiskValue += eb.quantity * eb.purchasePrice;
    }
    for (const nb of nearExpiryBatches) {
      totalAtRiskValue += nb.quantity * nb.purchasePrice * 0.5; // partial risk
    }

    const categories: string[] = [];
    let riskScore = 10;
    let primaryAction = 'Monitor Stock (Normal)';
    let recommendedOrderQty = 0;
    let reason = 'Stock is within standard clinical operating parameters.';

    if (hasExpired) {
      categories.push('EXPIRED');
      expiredCount++;
      riskScore = 95;
      primaryAction = 'Quarantine & Return to Supplier';
      reason = `${expiredBatches.reduce((s, b) => s + b.quantity, 0)} units past expiration date. Must not be sold.`;
    }
    if (hasNearExpiry) {
      categories.push('EXPIRING_SOON');
      nearExpiryCount++;
      riskScore = Math.max(riskScore, 75);
      primaryAction = 'FEFO Priority Dispense';
      reason = `Batches expiring within 90 days. Prioritize dispensing older batch first.`;
    }
    if (isOut) {
      categories.push('OUT_OF_STOCK');
      outOfStockCount++;
      riskScore = Math.max(riskScore, 90);
      primaryAction = 'Emergency Reorder';
      recommendedOrderQty = minAlert * 2;
      reason = 'Zero stock available. Customer prescriptions bouncing.';
    } else if (isLow) {
      categories.push('LOW_STOCK');
      categories.push('REORDER_NEEDED');
      lowStockCount++;
      reorderNeededCount++;
      riskScore = Math.max(riskScore, 80);
      primaryAction = 'Replenish Reorder';
      recommendedOrderQty = minAlert * 2 - stock;
      reason = `Stock (${stock} units) at or below safety alert threshold (${minAlert}). Reorder to prevent stockout.`;
    }
    if (isOver) {
      categories.push('OVERSTOCKED');
      overstockedCount++;
      riskScore = Math.max(riskScore, 40);
      primaryAction = 'Liquidate / Hold Purchases';
      reason = `Current stock (${stock} units) exceeds 3x minimum threshold. Excess working capital locked.`;
    }
    if (categories.length === 0) {
      categories.push('OPTIMAL');
    }

    const nearestExpBatch = mBatches
      .filter((b) => b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];

    return {
      medicineId: m.id,
      medicineName: m.name,
      currentStock: stock,
      nearestExpiry: nearestExpBatch ? nearestExpBatch.expiryDate : 'N/A',
      categories,
      riskScore,
      primaryAction,
      recommendedOrderQty,
      reason,
    };
  });

  const healthScore = Math.max(
    35,
    Math.min(
      100,
      Math.round(100 - expiredCount * 6 - lowStockCount * 2 - outOfStockCount * 4)
    )
  );
  const healthStatus =
    healthScore >= 85
      ? 'EXCELLENT'
      : healthScore >= 70
      ? 'STABLE'
      : healthScore >= 50
      ? 'REQUIRES_ATTENTION'
      : 'CRITICAL_RISK';

  const topUrgentActions: string[] = [];
  if (expiredCount > 0) {
    topUrgentActions.push(`Quarantine ${expiredCount} expired medicine batches immediately.`);
  }
  if (outOfStockCount > 0) {
    topUrgentActions.push(`Place emergency PO for ${outOfStockCount} out-of-stock essential drugs.`);
  }
  if (nearExpiryCount > 0) {
    topUrgentActions.push(`Apply FEFO clearance dispensing on ${nearExpiryCount} batches expiring within 90 days.`);
  }
  if (lowStockCount > 0) {
    topUrgentActions.push(`Replenish ${lowStockCount} medicines currently below min safety threshold.`);
  }

  return {
    healthScore,
    healthStatus,
    totalAtRiskValue: Math.round(totalAtRiskValue),
    expiredCount,
    nearExpiryCount,
    lowStockCount,
    overstockedCount,
    reorderNeededCount: reorderNeededCount + outOfStockCount,
    categorizations,
    executiveSummary: `Inventory audited across ${medicines.length} formulations. Total stock value at risk: ₹${Math.round(
      totalAtRiskValue
    ).toLocaleString()}. Health score: ${healthScore}/100.`,
    topUrgentActions,
  };
}
