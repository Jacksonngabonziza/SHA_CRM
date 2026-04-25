import math
from decimal import Decimal
from apps.products.models import Product


def _get_cfg():
    from apps.accounts.models import CompanySettings
    return CompanySettings.get()


def calculate_system(
    appliances_data: list,
    backup_hours: float = 8.0,
    peak_sun_hours: float = None,
    panel_id: int = None,
    battery_id: int = None,
    inverter_id: int = None,
    generator_id: int = None,   # All-in-one unit
) -> dict:
    """
    Smart solar system designer.

    If generator_id is provided → all-in-one mode:
      - Skips separate battery + inverter selection
      - Validates that total PV input ≤ generator.max_pv_input_w
      - Only suggests compatible panels (within max_panel_wp limit)

    Returns full BOM + pricing dict.
    """
    cfg    = _get_cfg()
    psh    = Decimal(str(peak_sun_hours)) if peak_sun_hours else cfg.default_peak_sun_hours
    backup = Decimal(str(backup_hours))

    # ── Step 1: Sum appliances → load ─────────────────────────────────────────
    total_daily_kwh = Decimal('0')
    max_load_kw     = Decimal('0')
    processed       = []

    for a in appliances_data:
        qty  = Decimal(str(a.get('quantity', 1)))
        w    = Decimal(str(a.get('wattage', 0)))
        h    = Decimal(str(a.get('hours_per_day', 0)))
        kwh  = qty * w * h / Decimal('1000')
        kw   = qty * w / Decimal('1000')
        total_daily_kwh += kwh
        max_load_kw     += kw
        processed.append({
            'name': a.get('name', ''),
            'quantity': int(qty),
            'wattage': float(w),
            'hours_per_day': float(h),
            'daily_kwh': round(float(kwh), 3),
        })

    design_daily_kwh = total_daily_kwh * (Decimal('1') + cfg.safety_margin_pct)
    system_size_kwp  = design_daily_kwh / psh
    system_size_wp   = system_size_kwp * Decimal('1000')

    # ── Step 2: All-in-One mode ───────────────────────────────────────────────
    generator      = None
    battery        = None
    inverter       = None
    validation_errors = []

    if generator_id:
        try:
            generator = Product.objects.get(pk=generator_id, category='generator', is_active=True)
        except Product.DoesNotExist:
            generator = None

    # ── Step 3: Select panel ──────────────────────────────────────────────────
    if panel_id:
        try:
            panel = Product.objects.get(pk=panel_id, category='panel', is_active=True)
        except Product.DoesNotExist:
            panel = _best_panel(generator)
    else:
        panel = _best_panel(generator)

    if panel and panel.wattage_wp:
        num_panels  = math.ceil(float(system_size_wp) / float(panel.wattage_wp))
        actual_kwp  = Decimal(str(num_panels)) * panel.wattage_wp / Decimal('1000')
        total_pv_w  = num_panels * float(panel.wattage_wp)
    else:
        num_panels = 0
        actual_kwp = system_size_kwp
        total_pv_w = 0

    # ── Step 4: Validate all-in-one PV limit ──────────────────────────────────
    if generator:
        # Check total PV input limit
        if generator.max_pv_input_w and total_pv_w > generator.max_pv_input_w:
            # Recalculate: max panels = floor(max_pv_input_w / panel.wattage_wp)
            if panel and panel.wattage_wp:
                max_panels = math.floor(generator.max_pv_input_w / float(panel.wattage_wp))
                validation_errors.append(
                    f"Warning: {num_panels} panels ({total_pv_w}W) exceeds generator max input "
                    f"({generator.max_pv_input_w}W). Capped at {max_panels} panels."
                )
                num_panels = max_panels
                actual_kwp = Decimal(str(num_panels)) * panel.wattage_wp / Decimal('1000')
                total_pv_w = num_panels * float(panel.wattage_wp)

        # Check per-panel wattage limit
        if panel and generator.max_panel_wp and panel.wattage_wp > generator.max_panel_wp:
            validation_errors.append(
                f"Warning: Selected panel ({panel.wattage_wp}Wp) exceeds generator max panel size "
                f"({generator.max_panel_wp}Wp). Please select a smaller panel."
            )

        # All-in-one provides battery + inverter
        battery  = None
        inverter = None

    else:
        # ── Step 5: Select inverter (standalone mode) ─────────────────────────
        if inverter_id:
            try:
                inverter = Product.objects.get(pk=inverter_id, category='inverter', is_active=True)
            except Product.DoesNotExist:
                inverter = _best_inverter(max_load_kw)
        else:
            inverter = _best_inverter(max_load_kw)

        # ── Step 6: Select battery (standalone mode) ──────────────────────────
        required_battery_kwh = design_daily_kwh * (backup / Decimal('24'))

        if battery_id:
            try:
                battery = Product.objects.get(pk=battery_id, category='battery', is_active=True)
            except Product.DoesNotExist:
                battery = _best_battery(required_battery_kwh)
        else:
            battery = _best_battery(required_battery_kwh)

    # ── Step 7: Quantities ────────────────────────────────────────────────────
    required_battery_kwh = design_daily_kwh * (backup / Decimal('24'))

    # Battery quantity: how many units needed to cover required storage
    num_batteries = 1
    if battery and battery.capacity_kwh:
        num_batteries = max(1, math.ceil(float(required_battery_kwh) / float(battery.capacity_kwh)))

    # Inverter quantity: how many units needed to cover peak load
    # Uses the largest available unit so the count is minimised.
    num_inverters = 1
    if inverter and inverter.power_kw and not generator:
        num_inverters = max(1, math.ceil(float(max_load_kw) / float(inverter.power_kw)))
        if num_inverters > 1:
            validation_errors.append(
                f"Note: Peak load ({float(max_load_kw):.1f} kW) exceeds a single "
                f"{inverter.brand} {inverter.model} ({float(inverter.power_kw):.0f} kW). "
                f"Using {num_inverters}× units in parallel."
            )

    # ── Step 8: Pricing ───────────────────────────────────────────────────────
    panels_cost    = (panel.price_rwf * Decimal(str(num_panels))) if panel else Decimal('0')
    battery_cost   = (battery.price_rwf * Decimal(str(num_batteries))) if battery else Decimal('0')
    inverter_cost  = (inverter.price_rwf * Decimal(str(num_inverters))) if inverter else Decimal('0')
    generator_cost = generator.price_rwf if generator else Decimal('0')

    hardware_cost    = panels_cost + battery_cost + inverter_cost + generator_cost
    accessories_cost = hardware_cost * cfg.accessories_pct
    installation_cost= hardware_cost * cfg.installation_pct
    total_price      = hardware_cost + accessories_cost + installation_cost

    # ── Step 9: Savings ───────────────────────────────────────────────────────
    annual_kwh      = total_daily_kwh * Decimal('365')
    annual_savings  = annual_kwh * cfg.grid_tariff_rwf_kwh
    payback_years   = (total_price / annual_savings).quantize(Decimal('0.1')) if annual_savings > 0 else Decimal('0')

    return {
        'appliances':           processed,
        'total_daily_kwh':      float(round(total_daily_kwh, 2)),
        'design_daily_kwh':     float(round(design_daily_kwh, 2)),
        'max_load_kw':          float(round(max_load_kw, 2)),
        'system_size_kwp':      float(round(actual_kwp, 2)),
        'num_panels':           num_panels,
        'total_pv_w':           round(total_pv_w, 0),
        'backup_hours':         float(backup),
        'peak_sun_hours':       float(psh),
        'required_battery_kwh': float(round(required_battery_kwh, 2)),
        'num_batteries':        num_batteries,
        'num_inverters':        num_inverters,
        'is_all_in_one_mode':   generator is not None,
        'validation_warnings':  validation_errors,
        'panel':                _product_summary(panel),
        'inverter':             _product_summary(inverter),
        'battery':              _product_summary(battery),
        'generator':            _product_summary(generator),
        'panels_cost':          float(round(panels_cost, 2)),
        'battery_cost':         float(round(battery_cost, 2)),
        'inverter_cost':        float(round(inverter_cost, 2)),
        'generator_cost':       float(round(generator_cost, 2)),
        'accessories_cost':     float(round(accessories_cost, 2)),
        'installation_cost':    float(round(installation_cost, 2)),
        'total_price_rwf':      float(round(total_price, 2)),
        'annual_savings_rwf':   float(round(annual_savings, 2)),
        'payback_years':        float(payback_years),
        'grid_tariff_rwf_kwh':  float(cfg.grid_tariff_rwf_kwh),
    }


def _best_panel(generator=None):
    """Best panel — if generator given, filter for compatibility."""
    qs = Product.objects.filter(category='panel', is_active=True, in_stock=True, wattage_wp__isnull=False)
    if generator:
        if generator.max_panel_wp:
            qs = qs.filter(wattage_wp__lte=generator.max_panel_wp)
        if generator.min_panel_wp:
            qs = qs.filter(wattage_wp__gte=generator.min_panel_wp)
    return qs.order_by('-wattage_wp').first()


def _best_inverter(max_load_kw):
    """
    Return the best single inverter unit.
    1. Prefer the smallest unit that covers the full load (no stacking needed).
    2. If load exceeds every unit, return the largest available so the number
       of parallel units needed is minimised.
    """
    qs = Product.objects.filter(category='inverter', is_active=True, in_stock=True, power_kw__isnull=False)
    fits = qs.filter(power_kw__gte=float(max_load_kw)).order_by('power_kw').first()
    if fits:
        return fits
    return qs.order_by('-power_kw').first()


def _best_battery(required_kwh):
    """
    Return the best single battery unit.
    1. Prefer the smallest unit that meets the full requirement (no stacking).
    2. Otherwise return the largest unit so the number of units is minimised.
    """
    qs = Product.objects.filter(category='battery', is_active=True, in_stock=True, capacity_kwh__isnull=False)
    single = qs.filter(capacity_kwh__gte=float(required_kwh)).order_by('capacity_kwh').first()
    if single:
        return single
    return qs.order_by('-capacity_kwh').first()


def _product_summary(product):
    if not product:
        return None
    return {
        'id': product.id, 'name': product.name,
        'brand': product.brand, 'model': product.model,
        'category': product.category,
        'display_spec': product.display_spec,
        'price_rwf': float(product.price_rwf),
        'warranty_years': product.warranty_years,
        'wattage_wp':    float(product.wattage_wp)    if product.wattage_wp    else None,
        'capacity_kwh':  float(product.capacity_kwh)  if product.capacity_kwh  else None,
        'power_kw':      float(product.power_kw)      if product.power_kw      else None,
        'is_all_in_one': product.is_all_in_one,
        'max_pv_input_w': product.max_pv_input_w,
        'max_panel_wp':  float(product.max_panel_wp)  if product.max_panel_wp  else None,
        'builtin_inverter_kw': float(product.builtin_inverter_kw) if product.builtin_inverter_kw else None,
        'builtin_capacity_kwh': float(product.builtin_capacity_kwh) if product.builtin_capacity_kwh else None,
    }
