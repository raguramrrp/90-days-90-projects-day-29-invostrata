from decimal import Decimal
import pytest
from app.core.anomaly_engine import AnomalyEngine
from app.models.entities import Invoice

def test_suspect_round_amount(db_session):
    engine = AnomalyEngine(db_session)
    inv = Invoice(
        id="INV-ANOM-1",
        grand_total=Decimal("50000.00"),  # Exact round number with zero paise
        subtotal=Decimal("42372.88"),
        total_tax=Decimal("7627.12")
    )
    anomalies = engine.investigate(inv)
    round_anoms = [a for a in anomalies if a["anomaly_type"] == "SUSPECT_ROUND_AMOUNT"]
    assert len(round_anoms) == 1
    assert "₹50,000.00" in round_anoms[0]["explanation"]

def test_high_discount_anomaly(db_session):
    engine = AnomalyEngine(db_session)
    inv = Invoice(
        id="INV-ANOM-2",
        subtotal=Decimal("100000.00"),
        discount_amount=Decimal("30000.00"),  # 30% discount!
        grand_total=Decimal("70000.00")
    )
    anomalies = engine.investigate(inv)
    disc_anoms = [a for a in anomalies if a["anomaly_type"] == "HIGH_DISCOUNT_ANOMALY"]
    assert len(disc_anoms) == 1
    assert "30.0%" in disc_anoms[0]["explanation"]
