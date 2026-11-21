from decimal import Decimal
import pytest
from app.core.decimal_math import (
    to_decimal, quantize_money, quantize_quantity,
    calculate_line_item, calculate_gst_amount,
    is_within_tolerance, calculate_discrepancy
)

def test_to_decimal_various_inputs():
    assert to_decimal("1250.50") == Decimal("1250.50")
    assert to_decimal(1250.5) == Decimal("1250.5")
    assert to_decimal(" ₹ 1,250.50 ") == Decimal("1250.50")
    assert to_decimal(None) == Decimal("0.00")
    assert to_decimal("") == Decimal("0.00")
    assert to_decimal("invalid", default="0.00") == Decimal("0.00")

def test_quantize_money():
    assert quantize_money("10.555") == Decimal("10.56")
    assert quantize_money("10.554") == Decimal("10.55")
    assert quantize_money(100) == Decimal("100.00")

def test_quantize_quantity():
    assert quantize_quantity("5.1234") == Decimal("5.123")
    assert quantize_quantity("5.1236") == Decimal("5.124")

def test_calculate_line_item():
    qty = Decimal("5.000")
    rate = Decimal("1200.00")
    disc = Decimal("200.00")
    expected = (qty * rate) - disc
    assert calculate_line_item(qty, rate, disc) == expected
    assert calculate_line_item(qty, rate) == Decimal("6000.00")

def test_calculate_gst_amount():
    taxable = Decimal("10000.00")
    assert calculate_gst_amount(taxable, Decimal("18.00")) == Decimal("1800.00")
    assert calculate_gst_amount(taxable, Decimal("12.00")) == Decimal("1200.00")
    assert calculate_gst_amount(taxable, Decimal("5.00")) == Decimal("500.00")
    assert calculate_gst_amount(taxable, Decimal("0.00")) == Decimal("0.00")

def test_tolerance_and_discrepancy():
    assert is_within_tolerance(Decimal("100.02"), Decimal("100.05"), tolerance=Decimal("0.05")) is True
    assert is_within_tolerance(Decimal("100.00"), Decimal("100.10"), tolerance=Decimal("0.05")) is False
    assert calculate_discrepancy(Decimal("100.00"), Decimal("105.50")) == Decimal("5.50")
    assert calculate_discrepancy(Decimal("105.50"), Decimal("100.00")) == Decimal("-5.50")
