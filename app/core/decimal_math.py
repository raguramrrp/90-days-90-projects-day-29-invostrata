from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Union, Optional

TWO_PLACES = Decimal("0.01")
THREE_PLACES = Decimal("0.001")

def to_decimal(val: Union[str, int, float, Decimal, None], default: str = "0.00") -> Decimal:
    """Safely converts any numerical input to Python Decimal without float precision loss."""
    if val is None or val == "":
        return Decimal(default)
    if isinstance(val, Decimal):
        return val
    try:
        # If string, strip currency symbols, commas and whitespace
        if isinstance(val, str):
            clean_str = val.replace(",", "").replace("₹", "").replace("$", "").replace("INR", "").strip()
            if not clean_str:
                return Decimal(default)
            return Decimal(clean_str)
        # Convert floats via str to avoid binary IEEE 754 representation artifacts
        return Decimal(str(val))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(default)

def quantize_money(val: Union[str, int, float, Decimal, None]) -> Decimal:
    """Quantize to 2 decimal places with standard ROUND_HALF_UP."""
    d = to_decimal(val)
    return d.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

def quantize_quantity(val: Union[str, int, float, Decimal, None]) -> Decimal:
    """Quantize to 3 decimal places for fractional item measurements."""
    d = to_decimal(val, default="1.000")
    return d.quantize(THREE_PLACES, rounding=ROUND_HALF_UP)

def calculate_line_item(qty: Decimal, unit_price: Decimal, discount: Decimal = Decimal("0.00")) -> Decimal:
    """Line item taxable amount = (Qty * Unit Price) - Discount"""
    gross = quantize_money(qty * unit_price)
    taxable = quantize_money(gross - discount)
    return max(Decimal("0.00"), taxable)

def calculate_gst_amount(taxable_value: Decimal, rate_percent: Decimal) -> Decimal:
    """GST Amount = Taxable Value * (Rate / 100)"""
    rate = to_decimal(rate_percent)
    tax = (taxable_value * rate) / Decimal("100.00")
    return quantize_money(tax)

def is_within_tolerance(val1: Union[Decimal, float, str], val2: Union[Decimal, float, str], tolerance: Decimal = Decimal("0.05")) -> bool:
    """Checks if two decimal amounts match within an allowable tolerance window."""
    d1 = to_decimal(val1)
    d2 = to_decimal(val2)
    return abs(d1 - d2) <= tolerance

def calculate_discrepancy(expected: Union[Decimal, float, str], actual: Union[Decimal, float, str]) -> Decimal:
    """Returns actual - expected difference."""
    d_exp = to_decimal(expected)
    d_act = to_decimal(actual)
    return quantize_money(d_act - d_exp)
