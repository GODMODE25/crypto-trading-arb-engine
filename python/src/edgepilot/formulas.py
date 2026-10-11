"""Decimal monetary formulas mirroring src/lib/edgepilot.

Never use binary floats for money.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_DOWN, getcontext
from typing import Sequence

getcontext().prec = 40

ZERO = Decimal("0")
BPS = Decimal("10000")


def D(value: str | Decimal) -> Decimal:
    if isinstance(value, Decimal):
        if not value.is_finite():
            raise ValueError("non-finite Decimal")
        return value
    if not isinstance(value, str):
        raise TypeError("money values must be Decimal or decimal string")
    n = Decimal(value)
    if not n.is_finite():
        raise ValueError("non-finite Decimal")
    return n


def floor_to_step(qty: Decimal, step: Decimal) -> Decimal:
    if step <= 0:
        raise ValueError("step must be positive")
    if qty <= 0:
        return ZERO
    return (qty / step).to_integral_value(rounding=ROUND_DOWN) * step


def vwap_fill(
    levels: Sequence[tuple[Decimal, Decimal]], qty: Decimal
) -> dict[str, Decimal | bool]:
    remaining = qty
    notional = ZERO
    filled = ZERO
    top = levels[0][0] if levels else ZERO
    for price, size in levels:
        if price <= 0 or size <= 0:
            continue
        take = remaining if remaining < size else size
        notional += take * price
        filled += take
        remaining -= take
        if remaining <= 0:
            break
    sufficient = remaining <= 0 and filled > 0
    vwap = notional / filled if filled > 0 else ZERO
    slip = (vwap - top).copy_abs() / top * BPS if top > 0 and vwap > 0 else ZERO
    return {
        "qty": filled,
        "vwap": vwap,
        "notional": notional,
        "unfilled": remaining if remaining > 0 else ZERO,
        "top": top,
        "slippage_bps": slip,
        "sufficient": sufficient,
    }


def inventory_spread(
    *,
    qty: Decimal,
    p_buy: Decimal,
    p_sell: Decimal,
    f_buy: Decimal,
    f_sell: Decimal,
    c_fixed: Decimal,
    min_net_profit: Decimal,
    min_net_roi: Decimal,
    buy_sufficient: bool = True,
    sell_sufficient: bool = True,
) -> dict[str, Decimal | bool | list[str]]:
    reasons: list[str] = []
    if not buy_sufficient:
        reasons.append("insufficient_depth_buy")
    if not sell_sufficient:
        reasons.append("insufficient_depth_sell")
    gross_cost = qty * p_buy
    buy_fee = gross_cost * f_buy
    gross_proceeds = qty * p_sell
    sell_fee = gross_proceeds * f_sell
    net_profit = gross_proceeds - sell_fee - gross_cost - buy_fee - c_fixed
    denom = gross_cost + buy_fee + c_fixed
    net_roi = net_profit / denom if denom > 0 else ZERO
    if p_sell <= p_buy:
        reasons.append("sell_not_above_buy")
    if net_profit < min_net_profit:
        reasons.append("net_profit_below_threshold")
    if net_roi < min_net_roi:
        reasons.append("net_roi_below_threshold")
    tradable = not reasons and net_profit >= min_net_profit and net_roi >= min_net_roi
    return {
        "gross_cost": gross_cost,
        "buy_fee": buy_fee,
        "gross_proceeds": gross_proceeds,
        "sell_fee": sell_fee,
        "net_profit": net_profit,
        "net_roi": net_roi,
        "tradable": tradable,
        "reasons": reasons,
    }


def triangle_usdt_btc_eth_usdt(
    start: Decimal,
    px_btc_usdt: Decimal,
    px_eth_btc: Decimal,
    px_eth_usdt_bid: Decimal,
    fee: Decimal,
    c_fixed: Decimal,
    min_net_profit: Decimal,
    min_net_roi: Decimal,
) -> dict[str, Decimal | bool | list[str]]:
    """Closed-loop mid model with conservative base haircut per buy leg."""
    btc = (start / px_btc_usdt) * (Decimal("1") - fee)
    eth = (btc / px_eth_btc) * (Decimal("1") - fee)
    final = eth * px_eth_usdt_bid * (Decimal("1") - fee)
    net_profit = final - start - c_fixed
    net_roi = net_profit / start if start > 0 else ZERO
    reasons: list[str] = []
    if net_profit < min_net_profit:
        reasons.append("net_profit_below_threshold")
    if net_roi < min_net_roi:
        reasons.append("net_roi_below_threshold")
    return {
        "final": final,
        "net_profit": net_profit,
        "net_roi": net_roi,
        "tradable": not reasons,
        "reasons": reasons,
    }
