"""
Seed SHA-CRM with products from the Sunshare Power Rwanda wholesale price list.
Selling price = wholesale RWF * 1.40  (40% markup).
Stock quantity = 50 pcs per product.

Usage:
    python manage.py seed_sunshare_products
    python manage.py seed_sunshare_products --dry-run      # preview only
    python manage.py seed_sunshare_products --clear        # delete all products first
"""
from decimal import Decimal, ROUND_HALF_UP
from django.core.management.base import BaseCommand
from apps.products.models import Product


def rwf(wholesale):
    """Return selling price: wholesale * 1.40, rounded to nearest 100 RWF."""
    return int(Decimal(str(wholesale)) * Decimal('1.40') / 100) * 100


def usd(wholesale_usd):
    """Return selling price in USD: wholesale * 1.40, rounded to 2 dp."""
    return float((Decimal(str(wholesale_usd)) * Decimal('1.40')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


# ─────────────────────────────────────────────────────────────────────────────
# Product catalogue — (category, brand, model, name, fields…)
# ─────────────────────────────────────────────────────────────────────────────
PRODUCTS = [

    # ── Solar Panels ──────────────────────────────────────────────────────────
    dict(
        category='panel', brand='AIKO', model='AIKO-G640-MCH72Dw',
        name='AIKO 645W Mono Panel',
        description='645W monocrystalline panel, 2382×1134×30mm',
        wattage_wp=645, price_rwf=rwf(145_000), price_usd=usd(100),
        warranty_years=12, stock_quantity=50,
    ),
    dict(
        category='panel', brand='AIKO', model='AIKO-A450-MAH54Mb-445',
        name='AIKO 445W Mono Panel',
        description='445W monocrystalline panel, 1762×1134×30mm',
        wattage_wp=445, price_rwf=rwf(100_050), price_usd=usd(69),
        warranty_years=12, stock_quantity=50,
    ),
    dict(
        category='panel', brand='AIKO', model='AIKO-A450-MAH54Mb',
        name='AIKO 450W Mono Panel',
        description='450W monocrystalline panel, 1762×1134×30mm',
        wattage_wp=450, price_rwf=rwf(101_500), price_usd=usd(70),
        warranty_years=12, stock_quantity=50,
    ),
    dict(
        category='panel', brand='AIKO', model='AIKO-A460-MAH54Db',
        name='AIKO 460W Mono Panel',
        description='460W monocrystalline panel, 1762×1134×30mm',
        wattage_wp=460, price_rwf=rwf(104_400), price_usd=usd(72),
        warranty_years=12, stock_quantity=50,
    ),
    dict(
        category='panel', brand='Topshine', model='DYPOG-210W',
        name='Topshine 200W Panel',
        description='200W solar panel, 1480×770×35mm',
        wattage_wp=200, price_rwf=rwf(58_000), price_usd=usd(40),
        warranty_years=10, stock_quantity=50,
    ),

    # ── Hybrid Inverters — Single Phase ───────────────────────────────────────
    dict(
        category='inverter', brand='DEYE', model='SUN-3K-SG04LP1-EU',
        name='DEYE 3kW Hybrid Inverter',
        description='Single-phase 3kW hybrid inverter',
        power_kw=3, phase='single', inverter_type='Hybrid',
        price_rwf=rwf(1_450_000), price_usd=usd(1_000),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='inverter', brand='SSP', model='SD 5K-SL',
        name='SSP 5kW Hybrid Inverter',
        description='Single-phase 5kW hybrid inverter',
        power_kw=5, phase='single', inverter_type='Hybrid',
        price_rwf=rwf(1_160_000), price_usd=usd(800),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='inverter', brand='SSP', model='SD 6K-SL',
        name='SSP 6kW Hybrid Inverter',
        description='Single-phase 6kW hybrid inverter',
        power_kw=6, phase='single', inverter_type='Hybrid',
        price_rwf=rwf(1_232_500), price_usd=usd(850),
        warranty_years=5, stock_quantity=50,
    ),

    # ── Hybrid Inverters — Three Phase ────────────────────────────────────────
    dict(
        category='inverter', brand='SSP', model='SD 12K-SL',
        name='SSP 12kW Hybrid Inverter',
        description='Three-phase 12kW hybrid inverter',
        power_kw=12, phase='three', inverter_type='Hybrid',
        price_rwf=rwf(2_900_000), price_usd=usd(2_000),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='inverter', brand='SSP', model='SD 15K-SL',
        name='SSP 15kW Hybrid Inverter',
        description='Three-phase 15kW hybrid inverter',
        power_kw=15, phase='three', inverter_type='Hybrid',
        price_rwf=rwf(3_190_000), price_usd=usd(2_200),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='inverter', brand='DEYE', model='SUN-12K-SG04LP3-EU',
        name='DEYE 12kW Hybrid Inverter',
        description='Three-phase 12kW hybrid inverter',
        power_kw=12, phase='three', inverter_type='Hybrid',
        price_rwf=rwf(3_480_000), price_usd=usd(2_400),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='inverter', brand='DEYE', model='SUN-15K-SG05LP3-EU-SM2',
        name='DEYE 15kW Hybrid Inverter',
        description='Three-phase 15kW hybrid inverter',
        power_kw=15, phase='three', inverter_type='Hybrid',
        price_rwf=rwf(4_350_000), price_usd=usd(3_000),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='inverter', brand='DEYE', model='SUN-20K-SG05LP3-EU-SM2',
        name='DEYE 20kW Hybrid Inverter',
        description='Three-phase 20kW hybrid inverter',
        power_kw=20, phase='three', inverter_type='Hybrid',
        price_rwf=rwf(5_075_000), price_usd=usd(3_500),
        warranty_years=5, stock_quantity=50,
    ),

    # ── Micro Inverters ───────────────────────────────────────────────────────
    dict(
        category='inverter', brand='SSP', model='SV500-PRO',
        name='SSP 500W Micro Inverter',
        description='500W micro inverter for balcony / small systems',
        power_kw=0.5, phase='single', inverter_type='Micro',
        price_rwf=rwf(145_000), price_usd=usd(100),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='inverter', brand='SSP', model='SV800-PRO',
        name='SSP 800W Micro Inverter',
        description='800W micro inverter for balcony / small systems',
        power_kw=0.8, phase='single', inverter_type='Micro',
        price_rwf=rwf(290_000), price_usd=usd(200),
        warranty_years=5, stock_quantity=50,
    ),

    # ── Batteries ─────────────────────────────────────────────────────────────
    dict(
        category='battery', brand='HITHIUM', model='Hero EE 1',
        name='HITHIUM 1kWh Portable Power Bank',
        description='200W / 1kWh portable power station',
        capacity_kwh=1, price_rwf=rwf(362_500), price_usd=usd(250),
        warranty_years=3, stock_quantity=50,
    ),
    dict(
        category='battery', brand='SSP', model='Hero EE 2',
        name='SSP 2kWh Portable Power Bank',
        description='1kW / 2kWh portable power station',
        capacity_kwh=2, price_rwf=rwf(797_500), price_usd=usd(550),
        warranty_years=3, stock_quantity=50,
    ),
    dict(
        category='battery', brand='SSP', model='HeroEE 16',
        name='SSP 16kWh Low Voltage Battery',
        description='16kWh low-voltage lithium battery bank',
        capacity_kwh=16, voltage_v=48,
        price_rwf=rwf(3_625_000), price_usd=usd(2_500),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='battery', brand='SSP', model='SSP-5kWh-LV',
        name='SSP 5kWh Low Voltage Battery',
        description='5kWh low-voltage lithium battery bank',
        capacity_kwh=5, voltage_v=48,
        price_rwf=rwf(1_885_000), price_usd=usd(1_300),
        warranty_years=5, stock_quantity=50,
    ),

    # ── All-in-One Generator (Hybrid ESS) ─────────────────────────────────────
    dict(
        category='generator', brand='SSP', model='ESS-5/8-1PN-A',
        name='SSP 5kW/8kWh All-in-One ESS',
        description='5kW hybrid inverter with 8kWh built-in battery, single-phase',
        power_kw=5, phase='single', is_all_in_one=True,
        builtin_capacity_kwh=8, voltage_v=48,
        price_rwf=rwf(2_900_000), price_usd=usd(2_000),
        warranty_years=5, stock_quantity=50,
    ),

    # ── Balcony Solar Kits (accessories) ──────────────────────────────────────
    dict(
        category='accessory', brand='AIKO', model='Balcony-450W-500W',
        name='AIKO 450W Balcony Solar Kit',
        description='450W panel + 500W micro inverter balcony kit',
        price_rwf=rwf(435_000), price_usd=usd(300),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='AIKO', model='Balcony-900W-800W',
        name='AIKO 900W Balcony Solar Kit',
        description='900W panel + 800W micro inverter balcony kit',
        price_rwf=rwf(725_000), price_usd=usd(500),
        warranty_years=5, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='AIKO', model='Balcony-450W-2kWh',
        name='AIKO 450W Balcony Kit + 2kWh Battery',
        description='450W panel + 2kWh portable battery balcony kit',
        price_rwf=rwf(957_000), price_usd=usd(660),
        warranty_years=3, stock_quantity=50,
    ),

    # ── PV Mounting Brackets ──────────────────────────────────────────────────
    dict(
        category='accessory', brand='HYT', model='Bracket-200W-1pc',
        name='Rooftop Bracket 200W (1 panel)',
        description='Double head hanger bolt rooftop bracket for 200W panel',
        price_rwf=rwf(30_160), price_usd=usd(20.80),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='HYT', model='Bracket-450W-1pc',
        name='Rooftop Bracket 450W (1 panel)',
        description='Double head hanger bolt rooftop bracket for 450W panel',
        price_rwf=rwf(46_255), price_usd=usd(31.90),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Jinyang', model='Bracket-645W-2pc',
        name='Rooftop Bracket 1.29kW (2 panels)',
        description='Double head hanger bolt bracket set for 2× 645W panels',
        price_rwf=rwf(64_090), price_usd=usd(44.20),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Jinyang', model='Bracket-645W-5pc',
        name='Rooftop Bracket 3.23kW (5 panels)',
        description='Double head hanger bolt bracket set for 5× 645W panels',
        price_rwf=rwf(133_835), price_usd=usd(92.30),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Jinyang', model='Bracket-645W-10pc',
        name='Rooftop Bracket 6.45kW (10 panels)',
        description='Double head hanger bolt bracket set for 10× 645W panels',
        price_rwf=rwf(263_320), price_usd=usd(181.60),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Jinyang', model='Bracket-645W-18pc',
        name='Rooftop Bracket 11.61kW (18 panels)',
        description='Double head hanger bolt bracket set for 18× 645W panels',
        price_rwf=rwf(450_805), price_usd=usd(310.90),
        warranty_years=1, stock_quantity=50,
    ),

    # ── DC Wiring & Protection ────────────────────────────────────────────────
    dict(
        category='accessory', brand='Jiukai', model='PV1-F-4mm-100m',
        name='DC Solar Cable 4mm² (per metre)',
        description='PV1-F 1×4mm² red/black DC cable, sold per metre (100m roll)',
        price_rwf=rwf(1_885), price_usd=usd(1.30),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Generic', model='MC4-Tool-Kit',
        name='MC4 Connector Tool Kit',
        description='MC4 wire stripper and crimping tool set',
        price_rwf=rwf(68_585), price_usd=usd(47.30),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Generic', model='MC4-Connector-Pair',
        name='MC4 Connector Pair',
        description='MC4 compatible male/female connector pair',
        price_rwf=rwf(3_045), price_usd=usd(2.10),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Generic', model='DC-Combiner-2in1',
        name='DC Combiner Box 2-in-1',
        description='2 in 1 out DC combiner box with surge protector',
        price_rwf=rwf(171_535), price_usd=usd(118.30),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Generic', model='DC-Combiner-3in1',
        name='DC Combiner Box 3-in-1',
        description='3 in 1 out DC combiner box with surge protector',
        price_rwf=rwf(181_830), price_usd=usd(125.40),
        warranty_years=1, stock_quantity=50,
    ),

    # ── AC Cables ─────────────────────────────────────────────────────────────
    dict(
        category='accessory', brand='Jiukai', model='YJV-2x16-per-m',
        name='AC Cable YJV 2×16mm² (per metre)',
        description='YJV-0.6/1KV 2×16mm² AC cable, sold per metre',
        price_rwf=rwf(10_295), price_usd=usd(7.10),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='Jiukai', model='ZRC-YJLHV22-2x120-per-m',
        name='AC Cable ZRC 2×120mm² (per metre)',
        description='ZRC-YJLHV22-0.6/1kV 2×120mm² AC cable, sold per metre',
        price_rwf=rwf(11_310), price_usd=usd(7.80),
        warranty_years=1, stock_quantity=50,
    ),

    # ── Rechargeable Batteries (small) ────────────────────────────────────────
    dict(
        category='accessory', brand='batzone', model='Ni-MH-AAA800-4pcs',
        name='NiMH AAA 800mAh Batteries (4-pack)',
        description='Rechargeable NiMH AAA 800mAh batteries, 4-pack',
        price_rwf=rwf(4_350), price_usd=usd(3.00),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-Li3A-666C-2pcs',
        name='Li-ion Battery P2-Li3A-666C (2-pack)',
        description='Rechargeable Li-ion batteries, 2-pack',
        price_rwf=rwf(7_250), price_usd=usd(5.00),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='C2-4D1H01-charger',
        name='NiMH Battery Charger',
        description='NiMH rechargeable battery charger C2-4D1H01',
        price_rwf=rwf(8_700), price_usd=usd(6.00),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-Li3A-666C-4pcs',
        name='Li-ion Battery P2-Li3A-666C (4-pack)',
        description='Rechargeable Li-ion batteries, 4-pack',
        price_rwf=rwf(14_790), price_usd=usd(10.20),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-LiC-7400C-2pcs',
        name='Li-ion Battery P2-LiC-7400C (2-pack)',
        description='Rechargeable Li-ion batteries, 2-pack',
        price_rwf=rwf(16_240), price_usd=usd(11.20),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-LiD-7400C-2pcs',
        name='Li-ion Battery P2-LiD-7400C (2-pack)',
        description='Rechargeable Li-ion batteries, 2-pack',
        price_rwf=rwf(16_240), price_usd=usd(11.20),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-Li18650-2000C-2pcs',
        name='Li-ion 18650 2000mAh Batteries (2-pack)',
        description='Rechargeable Li-ion 18650 2000mAh batteries, 2-pack',
        price_rwf=rwf(17_400), price_usd=usd(12.00),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='Ni-MH-AA1800-4pcs',
        name='NiMH AA 1800mAh Batteries (4-pack)',
        description='Rechargeable NiMH AA 1800mAh batteries, 4-pack',
        price_rwf=rwf(7_250), price_usd=usd(5.00),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-Li2A-2220C-2pcs',
        name='Li-ion Battery P2-Li2A-2220C (2-pack)',
        description='Rechargeable Li-ion batteries, 2-pack',
        price_rwf=rwf(8_700), price_usd=usd(6.00),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-Li2A-2220C-4pcs',
        name='Li-ion Battery P2-Li2A-2220C (4-pack)',
        description='Rechargeable Li-ion batteries, 4-pack',
        price_rwf=rwf(17_400), price_usd=usd(12.00),
        warranty_years=1, stock_quantity=50,
    ),
    dict(
        category='accessory', brand='batzone', model='P2-Li9V-4500C-1pc',
        name='Li-ion 9V Battery P2-Li9V-4500C',
        description='Rechargeable Li-ion 9V battery',
        price_rwf=rwf(8_700), price_usd=usd(6.00),
        warranty_years=1, stock_quantity=50,
    ),
]

# Field defaults for Product model
DEFAULTS = dict(
    description='', inverter_type='', phase='', is_all_in_one=False,
    wattage_wp=None, panel_efficiency=None, capacity_kwh=None,
    voltage_v=None, battery_cycles=None, power_kw=None,
    min_panel_wp=None, max_panel_wp=None, max_pv_input_w=None,
    builtin_inverter_kw=None, builtin_capacity_kwh=None,
    price_usd=None, linear_warranty_years=None,
    in_stock=True, is_active=True,
)


class Command(BaseCommand):
    help = 'Seed the product catalogue from the Sunshare Power Rwanda wholesale price list.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without saving.')
        parser.add_argument('--clear', action='store_true', help='Delete all existing products first.')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        clear = options['clear']

        if clear and not dry_run:
            count, _ = Product.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {count} existing products.'))

        created = skipped = 0

        for p in PRODUCTS:
            data = {**DEFAULTS, **p}
            ident = f"{data['brand']} {data['model']}"

            if dry_run:
                markup = ((data['price_rwf'] / (data['price_rwf'] / 1.4)) - 1) * 100
                self.stdout.write(
                    f"  [{data['category'].upper():9}] {ident:<45} "
                    f"RWF {data['price_rwf']:>12,.0f}  "
                    f"(USD {data.get('price_usd') or 0:>8.2f})  "
                    f"qty {data['stock_quantity']}"
                )
                created += 1
                continue

            obj, new = Product.objects.update_or_create(
                brand=data['brand'], model=data['model'],
                defaults=data,
            )
            if new:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  + {ident}'))
            else:
                skipped += 1
                self.stdout.write(f'  ~ {ident} (updated)')

        if dry_run:
            self.stdout.write(self.style.WARNING(f'\n[DRY RUN] Would create {created} products.'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\nDone — {created} created, {skipped} updated.'
            ))
