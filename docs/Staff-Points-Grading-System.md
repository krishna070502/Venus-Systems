# Staff Points & Grading System

> **Module**: PoultryRetail-Core Staff Performance  
> **Last Updated**: January 2026  
> **Target Audience**: Business Stakeholders & Technical Teams

---

## 1. System Overview

The Staff Points & Grading System is a **performance-based incentive framework** designed to:

- **Track staff performance** through measurable point-based metrics
- **Detect and minimize fraud** through variance penalties
- **Reward high performers** with bonuses based on their grade
- **Provide accountability** through monthly performance snapshots

```
┌─────────────────────────────────────────────────────────────────┐
│                     PERFORMANCE CYCLE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Daily Work          Points Earned       Monthly Snapshot       │
│  ───────────         ─────────────       ────────────────       │
│  • Sales             • +10 Zero Var      • Total Points         │
│  • Settlements       • +3/kg Found       • Total Weight         │
│  • Processing        • -8/kg Lost        • Normalized Score     │
│                                          • Grade (A+ to E)      │
│                                          • Bonus/Penalty        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Points System

### 2.1 How Points Are Earned/Lost

Staff members earn or lose points based on their daily activities:

| Action | Points | Type |
|--------|--------|------|
| Perfect settlement (Zero Variance) | **+10** | Reward |
| On-time settlement submission | **+2** | Reward |
| Positive variance approved (found stock) | **+3 per kg** | Reward |
| Late settlement submission | **-3** | Penalty |
| Negative variance (lost stock) | **-8 per kg** | Penalty |
| Manual correction by Admin | **-5** | Penalty |
| Repeated negative (3 consecutive days) | **-20** | Penalty |
| Settlement locked without submission | **-30** | Penalty |

### 2.2 Reason Codes

All point changes are tracked with a reason code for transparency:

| Code | Description | Points | Category |
|------|-------------|--------|----------|
| `ZERO_VARIANCE` | Perfect settlement | +10 | Settlement |
| `POSITIVE_VARIANCE_APPROVED` | Found stock verified | +3/kg | Settlement |
| `NEGATIVE_VARIANCE` | Stock shortage | -8/kg | Settlement |
| `ON_TIME_SETTLEMENT` | Submitted on time | +2 | Discipline |
| `LATE_SETTLEMENT` | Late submission (<24h) | -3 | Discipline |
| `MANUAL_CORRECTION` | Admin manual fix | -5 | Discipline |
| `REPEATED_NEGATIVE_3DAYS` | 3 consecutive shortages | -20 | Discipline |
| `MISSED_SETTLEMENT` | Failed to submit on day with sales | -15 | Discipline |
| `SETTLEMENT_LOCKED_NO_SUBMIT` | Draft locked by system | -30 | Discipline |
| `SELLING_BLOCKED_STOCK` | Attempted fraud | -50 | Fraud |
| `INVENTORY_TAMPERING` | Tampering detected | -100 | Fraud |
| `BYPASSING_POS` | Bypassing POS system | -100 | Fraud |
| `REPEATED_FRAUD_FLAG` | Multiple fraud flags | -500 | Fraud |
| `ADMIN_BONUS` | Manual bonus | Variable | Manual |
| `ADMIN_PENALTY` | Manual penalty | Variable | Manual |

---

## 3. Normalized Score

### 3.1 What is Normalized Score?

The **normalized score** is a fairness metric that accounts for workload differences:

```
Normalized Score = Total Points ÷ Total Weight Handled (kg)
```

### 3.2 Why Normalize?

Without normalization, high-volume stores would dominate leaderboards unfairly:

| Staff | Points | Weight | Raw Rank | Normalized Score | Fair Rank |
|-------|--------|--------|----------|------------------|-----------|
| Staff A | +100 | 500 kg | #1 | **+0.20** | #2 |
| Staff B | +50 | 100 kg | #2 | **+0.50** | #1 ✓ |

> **Key Insight**: Staff B is actually performing better per kg handled!

### 3.3 Calculation Example

```
Example: Manager Krishna
─────────────────────────
Total Points This Month: -10
Weight Handled: 50 kg

Normalized Score = -10 ÷ 50 = -0.20

→ This falls in Grade C range (-0.10 to -0.30)
```

---

## 4. Grading System

### 4.1 Grade Thresholds

Grades are assigned based on the normalized score:

| Grade | Min Score | Performance Level | Color |
|-------|-----------|-------------------|-------|
| **A+** | ≥ +0.50 | Outstanding | 🟡 Gold |
| **A** | ≥ +0.30 | Excellent | 🟢 Green |
| **B** | ≥ +0.10 | Good | 🔵 Blue |
| **C** | ≥ -0.10 | Average | ⚪ Grey |
| **D** | ≥ -0.30 | Below Average | 🟠 Orange |
| **E** | < -0.30 | Poor Performance | 🔴 Red |

### 4.2 Grade Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Sum all points_change from staff_points table               │
│     → total_points = SUM(points_change)                         │
├─────────────────────────────────────────────────────────────────┤
│  2. Sum all weight_handled from staff_points table              │
│     → total_weight = SUM(weight_handled)                        │
├─────────────────────────────────────────────────────────────────┤
│  3. Calculate normalized score                                  │
│     → normalized_score = total_points / total_weight            │
├─────────────────────────────────────────────────────────────────┤
│  4. Look up grade from thresholds                               │
│     → IF score >= 0.50 THEN A+                                  │
│     → ELSIF score >= 0.30 THEN A                                │
│     → ... etc                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Bonus & Penalty System

### 5.1 Bonus Rates (Incentives)

Higher grades earn bonuses based on weight handled:

| Grade | Bonus Rate | Example (500 kg) |
|-------|------------|------------------|
| **A+** | ₹10/kg | ₹5,000 |
| **A** | ₹6/kg | ₹3,000 |
| **B** | ₹3/kg | ₹1,500 |
| **C** | ₹0/kg | ₹0 |
| **D** | ₹0/kg | ₹0 |
| **E** | ₹0/kg | ₹0 |

### 5.2 Penalty Rates (Deductions)

Poor performers face salary deductions based on negative variance:

| Grade | Penalty Rate | Example (10 kg loss) |
|-------|--------------|----------------------|
| **A+, A, B** | ₹0/kg | ₹0 |
| **C** | ₹0/kg | ₹0 |
| **D** | ₹5/kg | ₹50 |
| **E** | ₹10/kg | ₹100 |

### 5.3 Monthly Caps

To prevent extreme outcomes:

| Limit | Amount |
|-------|--------|
| **Maximum Bonus** | ₹5,000/month |
| **Maximum Penalty** | ₹10,000/month |

### 5.4 Net Incentive Calculation

```
Net Incentive = Bonus Amount - Penalty Amount
```

**Example 1: Good Performer (Grade A)**
- Weight Handled: 500 kg
- Bonus: 500 × ₹6 = ₹3,000
- Penalty: ₹0
- **Net: +₹3,000**

**Example 2: Poor Performer (Grade E)**
- Weight Handled: 300 kg
- Negative Variance: 15 kg
- Bonus: ₹0
- Penalty: 15 × ₹10 = ₹150
- **Net: -₹150**

---

## 6. Monthly Performance Snapshots

### 6.1 What Gets Captured

At the end of each month, the system captures:

| Field | Description |
|-------|-------------|
| `total_points` | Sum of all points earned/lost |
| `total_weight_handled` | Total kg processed |
| `normalized_score` | Points per kg ratio |
| `grade` | A+ through E |
| `positive_variance_kg` | Total found stock |
| `negative_variance_kg` | Total lost stock |
| `zero_variance_days` | Days with perfect settlements |
| `bonus_amount` | Calculated bonus |
| `penalty_amount` | Calculated penalty |
| `is_locked` | Whether finalized |

### 6.2 Locking Process

1. **Generate**: Admin runs "Generate Monthly Performance" to calculate all metrics
2. **Review**: Manager reviews grades and bonuses/penalties
3. **Lock**: Once verified, month is **permanently locked**
4. **Payout**: Locked data is used for salary adjustments

> ⚠️ **Warning**: Locked records cannot be modified. Always verify before locking!

---

## 7. Fraud Detection

### 7.1 Automatic Fraud Flags

The system automatically flags suspicious activity:

| Indicator | Points | Action |
|-----------|--------|--------|
| Selling blocked stock | -50 | Flag raised |
| Inventory tampering | -100 | Flag raised |
| Bypassing POS system | -100 | Flag raised |
| Repeated fraud flag | -500 | **Auto-suspend** |

### 7.2 Auto-Suspension Threshold

| Threshold | Value |
|-----------|-------|
| Points for suspension | -200 |

When a staff member's cumulative points drop below **-200**, they are automatically flagged for suspension.

---

## 8. Implementation Status

### ✅ Implemented (Backend + Database)

| Feature | Status | Migration File |
|---------|--------|----------------|
| Staff Points Table | ✅ Complete | `051_staff_points.sql` |
| Points Reason Codes | ✅ Complete | `055_staff_grading_system.sql` |
| Grading Config Table | ✅ Complete | `055_staff_grading_system.sql` |
| Monthly Performance Table | ✅ Complete | `055_staff_grading_system.sql` |
| Grade Calculation Function | ✅ Complete | `055_staff_grading_system.sql` |
| Bonus/Penalty Calculation | ✅ Complete | `055_staff_grading_system.sql` |
| Generate Monthly Snapshot | ✅ Complete | `055_staff_grading_system.sql` |
| Lock Monthly Performance | ✅ Complete | `055_staff_grading_system.sql` |
| Variance Resolution Trigger | ✅ Complete | `077_automatic_point_triggers.sql` |
| Settlement Submit Points | ✅ Complete | `077_automatic_point_triggers.sql` |
| Repeated Negative Check | ✅ Complete | `077_automatic_point_triggers.sql` |
| Leaderboard RPC | ✅ Complete | `077_automatic_point_triggers.sql` |
| Calculate Staff Points RPC | ✅ Complete | `072_staff_performance_rpc.sql` |

### ✅ Implemented (Backend API)

| Endpoint | Permission | Status |
|----------|------------|--------|
| `GET /staff-points/me` | `staffpoints.view` | ✅ Complete |
| `GET /staff-points/history` | `staffpoints.view` | ✅ Complete |
| `GET /staff-points/store` | `staffpoints.viewall` | ✅ Complete |
| `GET /staff-points/leaderboard` | `staffpoints.viewall` | ✅ Complete |
| `GET /staff-points/breakdown` | `staffpoints.view` | ✅ Complete |
| `POST /staff-points` | `staffpoints.manage` | ✅ Complete |
| `GET /grading/config` | `staffgrading.view` | ✅ Complete |
| `PATCH /grading/config/{key}` | `staffgrading.config` | ✅ Complete |
| `GET /grading/reason-codes` | `staffgrading.view` | ✅ Complete |
| `POST /grading/performance/generate` | `staffgrading.generate` | ✅ Complete |
| `GET /grading/performance` | `staffgrading.view` | ✅ Complete |
| `POST /grading/performance/lock` | `staffgrading.lock` | ✅ Complete |

### ✅ Implemented (Frontend Pages)

| Page | Route | Status |
|------|-------|--------|
| My Performance | `/admin/business/staff-points` | ✅ Complete |
| Leaderboard | `/admin/business/staff-points/leaderboard` | ✅ Complete |
| Admin Performance Management | `/admin/business/staff-points/performance` | ✅ Complete |
| Risk Monitoring Dashboard | `/admin/business/staff-points/risk-monitoring` | ✅ Complete |
| Grading Config Editor | `/admin/business/staff-points/config` | ✅ Complete |
| Reason Codes Editor | `/admin/business/staff-points/config` | ✅ Complete |

### ⏳ Pending Implementation

| Feature | Priority | Notes |
|---------|----------|-------|
| Email Notifications | Low | Notify staff when monthly grades are locked |
| System Cron Integration | Low | Ensure backend `/scheduled-tasks` are called daily |

---

## 9. Configuration Reference

### 9.1 Grade Thresholds (Configurable)

| Key | Default | Description |
|-----|---------|-------------|
| `GRADE_A_PLUS_MIN` | 0.50 | Minimum score for A+ |
| `GRADE_A_MIN` | 0.30 | Minimum score for A |
| `GRADE_B_MIN` | 0.10 | Minimum score for B |
| `GRADE_C_MIN` | -0.10 | Minimum score for C |
| `GRADE_D_MIN` | -0.30 | Minimum score for D |

### 9.2 Bonus Rates (Configurable)

| Key | Default (₹/kg) |
|-----|----------------|
| `BONUS_RATE_A_PLUS` | 10.00 |
| `BONUS_RATE_A` | 6.00 |
| `BONUS_RATE_B` | 3.00 |
| `BONUS_RATE_C` | 0.00 |
| `BONUS_RATE_D` | 0.00 |
| `BONUS_RATE_E` | 0.00 |

### 9.3 Penalty Rates (Configurable)

| Key | Default (₹/kg) |
|-----|----------------|
| `PENALTY_RATE_C` | 0.00 |
| `PENALTY_RATE_D` | 5.00 |
| `PENALTY_RATE_E` | 10.00 |

### 9.4 System Settings

| Key | Default |
|-----|---------|
| `BONUS_CAP_MONTHLY` | ₹5,000 |
| `PENALTY_CAP_MONTHLY` | ₹10,000 |
| `FRAUD_AUTO_SUSPEND_THRESHOLD` | -200 points |

---

## 10. Permissions Matrix

| Permission | Admin | Store Manager | Cashier |
|------------|-------|---------------|---------|
| `staffpoints.view` | ✅ | ✅ | ✅ |
| `staffpoints.viewall` | ✅ | ✅ | ❌ |
| `staffpoints.manage` | ✅ | ❌ | ❌ |
| `staffgrading.view` | ✅ | ✅ | ❌ |
| `staffgrading.generate` | ✅ | ❌ | ❌ |
| `staffgrading.lock` | ✅ | ❌ | ❌ |
| `staffgrading.config` | ✅ | ❌ | ❌ |

---

**Document Version**: 1.0  
**Generated**: January 14, 2026
