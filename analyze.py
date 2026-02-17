#!/usr/bin/env python3
"""
COMEX Metals Data Analysis Script
Generates comprehensive analysis from parsed COMEX warehouse, delivery, and volume data.
"""

import json
import os
from datetime import datetime, date
from collections import defaultdict

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

# ── Contract specifications ──────────────────────────────────────────────────
CONTRACT_SIZES = {
    "Gold":      {"unit": "troy oz", "size": 100,   "symbol": "GC"},
    "Silver":    {"unit": "troy oz", "size": 5000,  "symbol": "SI"},
    "Copper":    {"unit": "lbs",     "size": 25000, "symbol": "HG"},
    "Platinum":  {"unit": "troy oz", "size": 50,    "symbol": "PL"},
    "Palladium": {"unit": "troy oz", "size": 100,   "symbol": "PA"},
    "Aluminum":  {"unit": "lbs",     "size": 44000, "symbol": "ALI"},
}

# Warehouse data units: Gold/Silver/Platinum/Palladium = troy oz;
# Copper = short tons (must convert: 1 short ton = 2000 lbs);
# Aluminum = metric tons (must convert: 1 MT = 2204.62 lbs)
WAREHOUSE_UNIT_CONVERSIONS = {
    "Gold":      1.0,       # already in troy oz
    "Silver":    1.0,       # already in troy oz
    "Copper":    2000.0,    # short tons → lbs
    "Platinum":  1.0,       # already in troy oz
    "Palladium": 1.0,       # already in troy oz
    "Aluminum":  2204.62,   # metric tons → lbs
}


def load_json(filename):
    path = os.path.join(BASE_DIR, filename)
    with open(path) as f:
        return json.load(f)


def analyze_warehouse(data):
    """Analyze warehouse stock data for all metals."""
    metals_of_interest = ["Gold", "Silver", "Copper", "Platinum", "Palladium", "Aluminum", "Zinc"]
    summary = {}

    for metal in metals_of_interest:
        if metal not in data:
            continue
        entry = data[metal]
        totals = entry["totals"]
        registered = totals["registered"]
        eligible = totals["eligible"]
        total = totals["total"]
        reg_pct = (registered / total * 100) if total > 0 else 0

        # Top depositories by total holdings
        deps_sorted = sorted(entry["depositories"], key=lambda d: d["total"], reverse=True)
        top_deps = [
            {"name": d["name"], "registered": d["registered"],
             "eligible": d["eligible"], "total": d["total"]}
            for d in deps_sorted[:5]
        ]

        summary[metal] = {
            "registered": round(registered, 2),
            "eligible": round(eligible, 2),
            "total": round(total, 2),
            "registered_pct": round(reg_pct, 2),
            "eligible_pct": round(100 - reg_pct, 2),
            "report_date": entry["report_date"],
            "top_depositories": top_deps,
        }

    # Top 5 largest depositories across ALL metals (by total inventory in native units)
    all_deps = []
    for metal in metals_of_interest:
        if metal not in data:
            continue
        for dep in data[metal]["depositories"]:
            all_deps.append({
                "metal": metal,
                "depository": dep["name"],
                "total": dep["total"],
            })
    all_deps.sort(key=lambda x: x["total"], reverse=True)

    return {
        "per_metal": summary,
        "top_5_depositories_overall": all_deps[:5],
    }


def analyze_deliveries(mtd_data, daily_data, ytd_data, warehouse_data):
    """Analyze delivery activity: daily rates, MTD totals, delivery-to-inventory ratios."""

    # ── Collect MTD totals ──────────────────────────────────────────────
    # Best source: delivery_daily (most recent date) has month_to_date field
    mtd_totals = {}  # metal -> contracts delivered MTD

    # From delivery_daily.json
    for d in daily_data.get("deliveries", []):
        metal = d["metal"]
        mtd_totals[metal] = d["month_to_date"]

    # Fill in from delivery_mtd.json for metals not in daily
    for c in mtd_data.get("contracts", []):
        metal = c["metal"]
        if metal not in mtd_totals:
            mtd_totals[metal] = c["total_cumulative"]

    # ── Compute daily velocity from MTD data ──────────────────────────
    daily_rates = {}
    for c in mtd_data.get("contracts", []):
        metal = c["metal"]
        daily_entries = c.get("daily_data", [])
        if not daily_entries:
            continue

        # Count distinct delivery days from the data
        num_days = len(daily_entries)
        cum_total = c["total_cumulative"]

        # For metals also in daily_data, add 1 more day
        extra_daily = 0
        for d in daily_data.get("deliveries", []):
            if d["metal"] == metal:
                # Check if this date is already in mtd entries
                daily_date = daily_data["parsed_date"]
                mtd_dates = [e["iso_date"] for e in daily_entries]
                if daily_date not in mtd_dates:
                    num_days += 1
                    extra_daily = d.get("daily_issued", 0)
                break

        total_for_rate = cum_total + extra_daily
        avg_daily = total_for_rate / num_days if num_days > 0 else 0

        # Latest daily figure
        last_daily = daily_entries[-1]["daily"] if daily_entries else 0

        daily_rates[metal] = {
            "avg_daily_contracts": round(avg_daily, 1),
            "last_daily_contracts": last_daily,
            "delivery_days_counted": num_days,
        }

    # ── Delivery-to-inventory ratios ──────────────────────────────────
    delivery_to_inventory = {}
    for metal, mtd_contracts in mtd_totals.items():
        if metal not in CONTRACT_SIZES or metal not in warehouse_data:
            continue

        spec = CONTRACT_SIZES[metal]
        wh = warehouse_data[metal]["totals"]
        registered = wh["registered"]
        conv = WAREHOUSE_UNIT_CONVERSIONS.get(metal, 1.0)

        # Convert warehouse to contract units
        registered_in_contract_units = registered * conv
        mtd_physical = mtd_contracts * spec["size"]
        ratio_pct = (mtd_physical / registered_in_contract_units * 100) if registered_in_contract_units > 0 else float('inf')

        delivery_to_inventory[metal] = {
            "mtd_contracts": mtd_contracts,
            "mtd_physical_amount": round(mtd_physical, 2),
            "registered_inventory": round(registered_in_contract_units, 2),
            "delivery_to_registered_pct": round(ratio_pct, 2),
            "unit": spec["unit"],
        }

    # ── Top firms from YTD data ──────────────────────────────────────
    firm_totals = defaultdict(lambda: {"issued": 0, "stopped": 0, "total_activity": 0, "metals": set()})
    for product in ytd_data.get("products", []):
        metal = product.get("metal", product.get("product_name", "Unknown"))
        for firm in product.get("firms", []):
            key = firm["name"]
            firm_totals[key]["issued"] += firm.get("total_issued", 0)
            firm_totals[key]["stopped"] += firm.get("total_stopped", 0)
            firm_totals[key]["total_activity"] += firm.get("total_activity", 0)
            firm_totals[key]["metals"].add(metal)

    top_firms = sorted(firm_totals.items(), key=lambda x: x[1]["total_activity"], reverse=True)[:10]
    top_firms_list = []
    for name, data_f in top_firms:
        top_firms_list.append({
            "firm": name,
            "total_issued": data_f["issued"],
            "total_stopped": data_f["stopped"],
            "total_activity": data_f["total_activity"],
            "metals_count": len(data_f["metals"]),
        })

    # ── Identify metals with heaviest delivery relative to inventory ──
    heaviest = sorted(
        delivery_to_inventory.items(),
        key=lambda x: x[1]["delivery_to_registered_pct"],
        reverse=True,
    )
    heaviest_list = [{"metal": m, **v} for m, v in heaviest]

    return {
        "mtd_totals_contracts": {m: v for m, v in mtd_totals.items()},
        "daily_velocity": daily_rates,
        "delivery_to_inventory": delivery_to_inventory,
        "heaviest_delivery_metals": heaviest_list,
        "top_firms_ytd": top_firms_list,
    }


def analyze_market_structure(volume_data, bulletin_data, warehouse_data):
    """Analyze open interest, volume/OI ratios, paper-to-physical ratios."""
    results = {}

    # Map symbols to metals
    symbol_to_metal = {v["symbol"]: k for k, v in CONTRACT_SIZES.items()}

    # Use volume_summary for OI and volume
    for product in volume_data.get("products", []):
        sym = product["symbol"]
        if sym not in symbol_to_metal:
            continue

        metal = symbol_to_metal[sym]
        spec = CONTRACT_SIZES[metal]
        oi = product["open_interest"]
        vol = product["total_volume"]
        oi_change = product["oi_change"]
        vol_oi_ratio = round(vol / oi, 3) if oi > 0 else 0

        # Paper-to-physical ratio
        paper_claims = oi * spec["size"]  # in contract units (oz, lbs)
        conv = WAREHOUSE_UNIT_CONVERSIONS.get(metal, 1.0)
        registered = warehouse_data.get(metal, {}).get("totals", {}).get("registered", 0)
        registered_converted = registered * conv

        if registered_converted > 0:
            paper_physical = round(paper_claims / registered_converted, 2)
        else:
            paper_physical = float('inf')

        results[metal] = {
            "symbol": sym,
            "open_interest": oi,
            "oi_change": oi_change,
            "volume": vol,
            "volume_to_oi_ratio": vol_oi_ratio,
            "paper_claims_physical": round(paper_claims, 2),
            "registered_inventory_converted": round(registered_converted, 2),
            "paper_to_physical_ratio": paper_physical,
            "contract_unit": spec["unit"],
            "contract_size": spec["size"],
        }

    return results


def assess_risk(warehouse_summary, delivery_analysis, market_structure):
    """Generate risk assessment with coverage ratios, alerts, and overall risk level."""
    alerts = []
    metal_risks = {}

    for metal in CONTRACT_SIZES:
        risk_factors = []

        # ── Coverage ratio ────────────────────────────────────────────
        coverage_days = None
        if metal in delivery_analysis["daily_velocity"] and metal in delivery_analysis["delivery_to_inventory"]:
            avg_daily = delivery_analysis["daily_velocity"][metal]["avg_daily_contracts"]
            spec = CONTRACT_SIZES[metal]
            conv = WAREHOUSE_UNIT_CONVERSIONS.get(metal, 1.0)

            di = delivery_analysis["delivery_to_inventory"].get(metal, {})
            registered_inv = di.get("registered_inventory", 0)

            if avg_daily > 0 and registered_inv > 0:
                daily_physical = avg_daily * spec["size"]
                coverage_days = round(registered_inv / daily_physical, 1)

        # ── Paper-to-physical flag ────────────────────────────────────
        ptp = None
        if metal in market_structure:
            ptp = market_structure[metal]["paper_to_physical_ratio"]
            if ptp != float('inf') and ptp > 5:
                alert_msg = f"ALERT: {metal} paper-to-physical ratio is {ptp}:1 (exceeds 5:1 threshold)"
                alerts.append(alert_msg)
                risk_factors.append(f"High paper-to-physical ratio: {ptp}:1")

        # ── MTD delivery vs registered flag ───────────────────────────
        dtoi = None
        if metal in delivery_analysis["delivery_to_inventory"]:
            dtoi = delivery_analysis["delivery_to_inventory"][metal]["delivery_to_registered_pct"]
            if dtoi > 10:
                alert_msg = f"ALERT: {metal} MTD deliveries = {dtoi}% of registered inventory (exceeds 10% threshold)"
                alerts.append(alert_msg)
                risk_factors.append(f"High MTD delivery ratio: {dtoi}%")

        # ── Low coverage days ─────────────────────────────────────────
        if coverage_days is not None and coverage_days < 30:
            alert_msg = f"ALERT: {metal} registered inventory covers only {coverage_days} days at current delivery rate"
            alerts.append(alert_msg)
            risk_factors.append(f"Low coverage: {coverage_days} days")

        # ── Aggregate risk level for this metal ───────────────────────
        risk_score = len(risk_factors)
        if risk_score >= 3:
            level = "HIGH"
        elif risk_score >= 2:
            level = "ELEVATED"
        elif risk_score >= 1:
            level = "MODERATE"
        else:
            level = "LOW"

        metal_risks[metal] = {
            "coverage_days": coverage_days,
            "paper_to_physical_ratio": ptp,
            "mtd_delivery_to_inventory_pct": dtoi,
            "risk_factors": risk_factors,
            "risk_level": level,
        }

    # ── Overall market risk ───────────────────────────────────────────
    high_count = sum(1 for r in metal_risks.values() if r["risk_level"] == "HIGH")
    elevated_count = sum(1 for r in metal_risks.values() if r["risk_level"] == "ELEVATED")

    if high_count >= 2:
        overall = "HIGH"
    elif high_count >= 1 or elevated_count >= 2:
        overall = "ELEVATED"
    elif elevated_count >= 1:
        overall = "MODERATE"
    else:
        overall = "LOW"

    return {
        "per_metal": metal_risks,
        "alerts": alerts,
        "overall_risk_level": overall,
        "summary": f"{high_count} metals at HIGH risk, {elevated_count} at ELEVATED risk",
    }


def generate_key_findings(warehouse_summary, delivery_analysis, market_structure, risk_assessment):
    """Generate a list of notable observations."""
    findings = []

    # ── Warehouse observations ────────────────────────────────────────
    for metal, ws in warehouse_summary["per_metal"].items():
        if ws["registered_pct"] < 30:
            findings.append(
                f"{metal}: Only {ws['registered_pct']}% of warehouse stock is registered "
                f"(available for delivery), indicating most metal is in eligible (private) storage."
            )
        elif ws["registered_pct"] > 70:
            findings.append(
                f"{metal}: {ws['registered_pct']}% of warehouse stock is registered, "
                f"suggesting strong delivery availability."
            )

    # ── Zinc special note ─────────────────────────────────────────────
    if "Zinc" in warehouse_summary["per_metal"]:
        zn = warehouse_summary["per_metal"]["Zinc"]
        if zn["registered"] == 0:
            findings.append(
                "Zinc: ZERO registered inventory across all COMEX depositories. "
                "No physical zinc is available for futures delivery."
            )

    # ── Delivery velocity ─────────────────────────────────────────────
    heaviest = delivery_analysis.get("heaviest_delivery_metals", [])
    if heaviest:
        top = heaviest[0]
        findings.append(
            f"{top['metal']} has the highest delivery-to-inventory ratio at "
            f"{top['delivery_to_registered_pct']}%, meaning MTD deliveries represent "
            f"a significant portion of registered stock."
        )

    # ── Paper-to-physical ─────────────────────────────────────────────
    ptp_sorted = sorted(
        [(m, v["paper_to_physical_ratio"]) for m, v in market_structure.items()
         if v["paper_to_physical_ratio"] != float('inf')],
        key=lambda x: x[1], reverse=True,
    )
    if ptp_sorted:
        worst_metal, worst_ratio = ptp_sorted[0]
        findings.append(
            f"{worst_metal} has the highest paper-to-physical ratio at {worst_ratio}:1, "
            f"meaning there are {worst_ratio} ounces/lbs of paper claims for every unit of "
            f"registered physical metal. This indicates potential squeeze risk."
        )
        safe_metals = [(m, r) for m, r in ptp_sorted if r < 3]
        if safe_metals:
            names = ", ".join(m for m, _ in safe_metals)
            findings.append(
                f"Metals with relatively low paper-to-physical exposure: {names}."
            )

    # ── Gold-specific ─────────────────────────────────────────────────
    gold_ms = market_structure.get("Gold", {})
    if gold_ms:
        gold_oi = gold_ms["open_interest"]
        gold_oi_change = gold_ms["oi_change"]
        if gold_oi_change > 0:
            findings.append(
                f"Gold open interest increased by {gold_oi_change:,} contracts to {gold_oi:,}, "
                f"suggesting new money entering the market."
            )
        gold_del = delivery_analysis["mtd_totals_contracts"].get("Gold", 0)
        if gold_del > 30000:
            findings.append(
                f"Gold has exceptionally high MTD deliveries of {gold_del:,} contracts "
                f"({gold_del * 100:,} troy oz), indicating massive physical demand."
            )

    # ── Top firm dominance ────────────────────────────────────────────
    top_firms = delivery_analysis.get("top_firms_ytd", [])
    if top_firms:
        top = top_firms[0]
        findings.append(
            f"Top delivery firm YTD: {top['firm']} with {top['total_activity']:,} total contracts "
            f"({top['total_issued']:,} issued, {top['total_stopped']:,} stopped) across "
            f"{top['metals_count']} metals."
        )

    # ── Overall risk ──────────────────────────────────────────────────
    risk_level = risk_assessment["overall_risk_level"]
    findings.append(
        f"Overall COMEX metals market stress: {risk_level}. "
        f"{risk_assessment['summary']}."
    )

    # ── Coverage warnings ─────────────────────────────────────────────
    for metal, ra in risk_assessment["per_metal"].items():
        if ra["coverage_days"] is not None and ra["coverage_days"] < 50:
            findings.append(
                f"{metal}: At current delivery pace, registered inventory would be exhausted "
                f"in approximately {ra['coverage_days']} days."
            )

    return findings


def main():
    print("Loading data files...")
    warehouse_data = load_json("data.json")
    mtd_data = load_json("delivery_mtd.json")
    daily_data = load_json("delivery_daily.json")
    ytd_data = load_json("delivery_ytd.json")
    volume_data = load_json("volume_summary.json")
    bulletin_data = load_json("bulletin.json")
    print("All 6 data files loaded successfully.\n")

    # ── 1. Warehouse Analysis ─────────────────────────────────────────
    print("=" * 70)
    print("WAREHOUSE STOCK ANALYSIS")
    print("=" * 70)
    warehouse_summary = analyze_warehouse(warehouse_data)

    for metal, ws in warehouse_summary["per_metal"].items():
        print(f"\n{metal}:")
        print(f"  Registered: {ws['registered']:>15,.2f}  ({ws['registered_pct']:.1f}%)")
        print(f"  Eligible:   {ws['eligible']:>15,.2f}  ({ws['eligible_pct']:.1f}%)")
        print(f"  Total:      {ws['total']:>15,.2f}")
        print(f"  Top depository: {ws['top_depositories'][0]['name']} ({ws['top_depositories'][0]['total']:,.2f})")

    print(f"\nTop 5 depositories across all metals:")
    for dep in warehouse_summary["top_5_depositories_overall"]:
        print(f"  {dep['metal']:>10} | {dep['depository']:<55} | {dep['total']:>15,.2f}")

    # ── 2. Delivery Analysis ──────────────────────────────────────────
    print("\n" + "=" * 70)
    print("DELIVERY ANALYSIS")
    print("=" * 70)
    delivery_analysis = analyze_deliveries(mtd_data, daily_data, ytd_data, warehouse_data)

    print("\nMonth-to-Date Delivery Contracts:")
    for metal, contracts in delivery_analysis["mtd_totals_contracts"].items():
        print(f"  {metal:<12}: {contracts:>8,} contracts")

    print("\nDaily Delivery Velocity:")
    for metal, vel in delivery_analysis["daily_velocity"].items():
        print(f"  {metal:<12}: avg {vel['avg_daily_contracts']:>8,.1f} contracts/day "
              f"(last: {vel['last_daily_contracts']:,}, over {vel['delivery_days_counted']} days)")

    print("\nDelivery-to-Inventory Ratios:")
    for metal, dti in delivery_analysis["delivery_to_inventory"].items():
        flag = " *** ALERT ***" if dti["delivery_to_registered_pct"] > 10 else ""
        print(f"  {metal:<12}: {dti['delivery_to_registered_pct']:>6.1f}% of registered inventory{flag}")

    print("\nTop 10 Firms by YTD Delivery Activity:")
    for i, firm in enumerate(delivery_analysis["top_firms_ytd"], 1):
        print(f"  {i:>2}. {firm['firm']:<25} Activity: {firm['total_activity']:>8,} "
              f"(Issued: {firm['total_issued']:>7,} | Stopped: {firm['total_stopped']:>7,})")

    # ── 3. Market Structure Analysis ──────────────────────────────────
    print("\n" + "=" * 70)
    print("MARKET STRUCTURE ANALYSIS")
    print("=" * 70)
    market_structure = analyze_market_structure(volume_data, bulletin_data, warehouse_data)

    print(f"\n{'Metal':<12} {'OI':>10} {'OI Chg':>8} {'Volume':>10} {'Vol/OI':>7} {'Paper Claims':>15} {'Registered':>15} {'P/P Ratio':>10}")
    print("-" * 95)
    for metal in ["Gold", "Silver", "Copper", "Platinum", "Palladium", "Aluminum"]:
        if metal not in market_structure:
            continue
        ms = market_structure[metal]
        ptp_str = f"{ms['paper_to_physical_ratio']}:1"
        if ms['paper_to_physical_ratio'] > 5:
            ptp_str += " !!!"
        print(f"  {metal:<10} {ms['open_interest']:>10,} {ms['oi_change']:>+8,} {ms['volume']:>10,} "
              f"{ms['volume_to_oi_ratio']:>7.3f} {ms['paper_claims_physical']:>15,.0f} "
              f"{ms['registered_inventory_converted']:>15,.0f} {ptp_str:>12}")

    # ── 4. Risk Assessment ────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("RISK ASSESSMENT")
    print("=" * 70)
    risk_assessment = assess_risk(warehouse_summary, delivery_analysis, market_structure)

    print(f"\nOverall Market Risk: {risk_assessment['overall_risk_level']}")
    print(f"  {risk_assessment['summary']}")

    print(f"\nPer-Metal Risk:")
    for metal, ra in risk_assessment["per_metal"].items():
        cov = f"{ra['coverage_days']} days" if ra['coverage_days'] else "N/A"
        ptp = f"{ra['paper_to_physical_ratio']}:1" if ra['paper_to_physical_ratio'] else "N/A"
        dtoi = f"{ra['mtd_delivery_to_inventory_pct']}%" if ra['mtd_delivery_to_inventory_pct'] else "N/A"
        print(f"  {metal:<12} | Risk: {ra['risk_level']:<9} | Coverage: {cov:<12} | P/P: {ptp:<10} | Delivery: {dtoi}")
        for rf in ra["risk_factors"]:
            print(f"    -> {rf}")

    print(f"\nAlerts ({len(risk_assessment['alerts'])}):")
    for alert in risk_assessment["alerts"]:
        print(f"  {alert}")

    # ── 5. Key Findings ───────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("KEY FINDINGS")
    print("=" * 70)
    key_findings = generate_key_findings(warehouse_summary, delivery_analysis, market_structure, risk_assessment)

    for i, finding in enumerate(key_findings, 1):
        print(f"\n  {i}. {finding}")

    # ── 6. Save analysis.json ─────────────────────────────────────────
    # Clean up non-serializable types
    def clean_for_json(obj):
        if isinstance(obj, float) and obj == float('inf'):
            return "infinity"
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, dict):
            return {k: clean_for_json(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [clean_for_json(i) for i in obj]
        return obj

    analysis_report = {
        "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data_date": warehouse_data.get("_metadata", {}).get("last_updated", "unknown"),
        "warehouse_summary": clean_for_json(warehouse_summary),
        "delivery_analysis": clean_for_json(delivery_analysis),
        "market_structure": clean_for_json(market_structure),
        "risk_assessment": clean_for_json(risk_assessment),
        "key_findings": key_findings,
    }

    output_path = os.path.join(BASE_DIR, "analysis.json")
    with open(output_path, "w") as f:
        json.dump(analysis_report, f, indent=2)
    print(f"\n\nAnalysis saved to {output_path}")
    print("Done.")


if __name__ == "__main__":
    main()
