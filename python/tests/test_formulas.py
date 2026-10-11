from decimal import Decimal

from edgepilot.formulas import D, inventory_spread, triangle_usdt_btc_eth_usdt, vwap_fill


def test_rejects_floats():
    try:
        D(0.1)  # type: ignore[arg-type]
        raise AssertionError("should reject float")
    except TypeError:
        pass
    assert D("0.1") + D("0.2") == D("0.3")


def test_vwap_walk():
    levels = [(D("100"), D("1")), (D("101"), D("1"))]
    fill = vwap_fill(levels, D("1.5"))
    assert fill["sufficient"] is True
    assert fill["vwap"] == D("100.3333333333333333333333333333333333333") or str(fill["vwap"]).startswith(
        "100.33333333"
    )
    thin = vwap_fill(levels, D("5"))
    assert thin["sufficient"] is False


def test_spread_fee_negative():
    r = inventory_spread(
        qty=D("1"),
        p_buy=D("100"),
        p_sell=D("100.12"),
        f_buy=D("0.001"),
        f_sell=D("0.001"),
        c_fixed=D("0.50"),
        min_net_profit=D("0.25"),
        min_net_roi=D("0.0005"),
    )
    assert r["tradable"] is False


def test_spread_fat_edge():
    r = inventory_spread(
        qty=D("0.001"),
        p_buy=D("50000"),
        p_sell=D("52000"),
        f_buy=D("0.001"),
        f_sell=D("0.001"),
        c_fixed=D("0.50"),
        min_net_profit=D("0.25"),
        min_net_roi=D("0.0005"),
    )
    assert r["tradable"] is True
    assert r["net_profit"] > D("0.25")


def test_triangle_fees_kill_closed_loop():
    r = triangle_usdt_btc_eth_usdt(
        D("75"),
        D("50000"),
        D("0.08"),
        D("4000"),
        D("0.001"),
        D("0.50"),
        D("0.25"),
        D("0.0005"),
    )
    assert r["tradable"] is False
    assert r["net_profit"] < Decimal("0")
