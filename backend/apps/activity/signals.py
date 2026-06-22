"""
Signals that automatically log every create / update / delete across all key models.
Reads current user + IP from thread-local middleware context.
"""
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import ActivityLog

# ── Helper ────────────────────────────────────────────────────────────────────

def _log(action, description, resource_type='', resource_id=None, resource_label=''):
    try:
        ActivityLog.log(
            action=action,
            description=description,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_label=resource_label,
        )
    except Exception:
        pass  # never let logging break the main request


# ── Track which records are new vs updated ────────────────────────────────────
# We store the "old" state before save so we can detect status changes.
_PRE_SAVE_STATE = {}


def _pre(sender, instance, **kwargs):
    if instance.pk:
        try:
            _PRE_SAVE_STATE[id(instance)] = sender.objects.get(pk=instance.pk)
        except sender.DoesNotExist:
            pass


def _get_old(instance):
    return _PRE_SAVE_STATE.pop(id(instance), None)


# ── Clients ───────────────────────────────────────────────────────────────────
@receiver(pre_save, sender='clients.Client')
def client_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='clients.Client')
def client_post_save(sender, instance, created, **kwargs):
    old = _get_old(instance)
    if created:
        _log('create', f"Registered client {instance.name} ({instance.phone})",
             'client', instance.pk, f"Client: {instance.name}")
    else:
        if old and old.status != instance.status:
            _log('status_change',
                 f"Changed client {instance.name} status: {old.status} → {instance.status}",
                 'client', instance.pk, f"Client: {instance.name}")
        else:
            _log('update', f"Updated client {instance.name}",
                 'client', instance.pk, f"Client: {instance.name}")


@receiver(post_delete, sender='clients.Client')
def client_delete(sender, instance, **kwargs):
    _log('delete', f"Deleted client {instance.name} ({instance.phone})",
         'client', instance.pk, f"Client: {instance.name}")


@receiver(post_save, sender='clients.ClientNote')
def client_note_save(sender, instance, created, **kwargs):
    if created:
        _log('create', f"Added note to client {instance.client.name}",
             'client', instance.client_id, f"Client: {instance.client.name}")


# ── Quotes ────────────────────────────────────────────────────────────────────
@receiver(pre_save, sender='quotes.Quote')
def quote_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='quotes.Quote')
def quote_post_save(sender, instance, created, **kwargs):
    old = _get_old(instance)
    is_order = getattr(instance, 'quote_type', 'installation') == 'product_order'
    kind  = 'Order' if is_order else 'Quote'
    rtype = 'order' if is_order else 'quote'
    label = f"{kind}: {instance.ref_number}"
    if created:
        try:
            client_name = instance.client.name
        except Exception:
            client_name = '—'
        _log('create', f"Created {kind.lower()} {instance.ref_number} for {client_name}",
             rtype, instance.pk, label)
    elif old and old.status != instance.status:
        action_map = {'approved': 'approve', 'rejected': 'reject', 'sent': 'send'}
        action = action_map.get(instance.status, 'status_change')
        _log(action,
             f"{kind} {instance.ref_number} status: {old.status} → {instance.status}",
             rtype, instance.pk, label)
    else:
        _log('update', f"Updated {kind.lower()} {instance.ref_number}",
             rtype, instance.pk, label)


@receiver(post_delete, sender='quotes.Quote')
def quote_delete(sender, instance, **kwargs):
    is_order = getattr(instance, 'quote_type', 'installation') == 'product_order'
    kind = 'Order' if is_order else 'Quote'
    _log('delete', f"Deleted {kind.lower()} {instance.ref_number}",
         'order' if is_order else 'quote', instance.pk, f"{kind}: {instance.ref_number}")


# ── Payments ──────────────────────────────────────────────────────────────────
@receiver(pre_save, sender='payments.Payment')
def payment_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='payments.Payment')
def payment_post_save(sender, instance, created, **kwargs):
    old = _get_old(instance)
    label = f"Payment: {getattr(instance, 'quote_ref', instance.quote_id)}"
    if created:
        _log('create',
             f"Recorded payment of {instance.amount_rwf} RWF on quote {getattr(instance, 'quote_ref', instance.quote_id)} by {instance.client.name}",
             'payment', instance.pk, label)
    elif old and old.status != instance.status:
        _log('status_change',
             f"Payment status changed: {old.status} → {instance.status} ({instance.amount_rwf} RWF)",
             'payment', instance.pk, label)
    else:
        _log('update', f"Updated payment record ({instance.amount_rwf} RWF)",
             'payment', instance.pk, label)


@receiver(post_delete, sender='payments.Payment')
def payment_delete(sender, instance, **kwargs):
    _log('delete',
         f"Deleted payment of {instance.amount_rwf} RWF on quote {getattr(instance, 'quote_ref', '')}",
         'payment', instance.pk, f"Payment: {getattr(instance, 'quote_ref', instance.quote_id)}")


# ── Installations ─────────────────────────────────────────────────────────────
@receiver(pre_save, sender='installations.Installation')
def installation_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='installations.Installation')
def installation_post_save(sender, instance, created, **kwargs):
    old = _get_old(instance)
    label = f"Installation: {instance.quote_ref}"
    if created:
        _log('create', f"Created installation for {instance.client_name} ({instance.quote_ref})",
             'installation', instance.pk, label)
    elif old and old.status != instance.status:
        _log('status_change',
             f"Installation {instance.quote_ref} status: {old.status} → {instance.status}",
             'installation', instance.pk, label)
    else:
        _log('update', f"Updated installation {instance.quote_ref}",
             'installation', instance.pk, label)


@receiver(post_delete, sender='installations.Installation')
def installation_delete(sender, instance, **kwargs):
    _log('delete', f"Deleted installation {instance.quote_ref}",
         'installation', instance.pk, f"Installation: {instance.quote_ref}")


@receiver(post_save, sender='installations.InstallationLog')
def installation_log_save(sender, instance, created, **kwargs):
    if created:
        note_preview = instance.note[:80]
        ref = getattr(instance.installation, 'quote_ref', instance.installation_id)
        _log('create', f'Added log to installation {ref}: "{note_preview}"',
             'installation', instance.installation_id,
             f"Installation: {getattr(instance.installation, 'quote_ref', '')}")


# ── Products ──────────────────────────────────────────────────────────────────
@receiver(pre_save, sender='products.Product')
def product_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='products.Product')
def product_post_save(sender, instance, created, **kwargs):
    _get_old(instance)
    label = f"Product: {instance.brand} {instance.model}"
    action = 'create' if created else 'update'
    verb = 'Added' if created else 'Updated'
    _log(action, f"{verb} product {instance.brand} {instance.model} ({instance.get_category_display()})",
         'product', instance.pk, label)


@receiver(post_delete, sender='products.Product')
def product_delete(sender, instance, **kwargs):
    _log('delete', f"Deleted product {instance.brand} {instance.model}",
         'product', instance.pk, f"Product: {instance.brand} {instance.model}")


# ── Surveys ───────────────────────────────────────────────────────────────────
@receiver(pre_save, sender='surveys.SiteSurvey')
def survey_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='surveys.SiteSurvey')
def survey_post_save(sender, instance, created, **kwargs):
    _get_old(instance)
    label = f"Survey: {instance.client_name}"
    action = 'create' if created else 'update'
    verb = 'Created' if created else 'Updated'
    _log(action, f"{verb} site survey for {instance.client_name}",
         'survey', instance.pk, label)


@receiver(post_delete, sender='surveys.SiteSurvey')
def survey_delete(sender, instance, **kwargs):
    _log('delete', f"Deleted survey for {instance.client_name}",
         'survey', instance.pk, f"Survey: {instance.client_name}")


# ── Warranty ──────────────────────────────────────────────────────────────────
@receiver(pre_save, sender='installations.WarrantyClaim')
def warranty_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='installations.WarrantyClaim')
def warranty_post_save(sender, instance, created, **kwargs):
    old = _get_old(instance)
    label = f"Warranty: {instance.title}"
    title = instance.title
    if created:
        _log('create', f'Filed warranty claim "{title}" for {instance.client_name}',
             'warranty', instance.pk, label)
    elif old and old.status != instance.status:
        _log('status_change',
             f'Warranty claim "{title}" status: {old.status} → {instance.status}',
             'warranty', instance.pk, label)
    else:
        _log('update', f'Updated warranty claim "{title}"',
             'warranty', instance.pk, label)


@receiver(post_delete, sender='installations.WarrantyClaim')
def warranty_delete(sender, instance, **kwargs):
    _log('delete', f'Deleted warranty claim "{instance.title}"',
         'warranty', instance.pk, f"Warranty: {instance.title}")


# ── Referrals ─────────────────────────────────────────────────────────────────
@receiver(pre_save, sender='referrals.Referral')
def referral_pre_save(sender, instance, **kwargs):
    _pre(sender, instance, **kwargs)


@receiver(post_save, sender='referrals.Referral')
def referral_post_save(sender, instance, created, **kwargs):
    old = _get_old(instance)
    label = f"Referral: {instance.referrer_name} → {instance.referred_name}"
    if created:
        _log('create', f"Created referral: {instance.referrer_name} referred {instance.referred_name}",
             'referral', instance.pk, label)
    elif old and old.status != instance.status:
        _log('status_change',
             f"Referral {instance.referrer_name} → {instance.referred_name}: {old.status} → {instance.status}",
             'referral', instance.pk, label)
    else:
        _log('update', f"Updated referral {instance.referrer_name} → {instance.referred_name}",
             'referral', instance.pk, label)


@receiver(post_delete, sender='referrals.Referral')
def referral_delete(sender, instance, **kwargs):
    _log('delete', f"Deleted referral {instance.referrer_name} → {instance.referred_name}",
         'referral', instance.pk, f"Referral: {instance.referrer_name} → {instance.referred_name}")


# ── Users / Agents ────────────────────────────────────────────────────────────
@receiver(post_save, sender='accounts.User')
def user_post_save(sender, instance, created, **kwargs):
    if created:
        role_label = {'admin': 'admin user', 'sales': 'sales user', 'field_agent': 'field agent'}.get(instance.role, 'user')
        _log('create', f"Created {role_label} account: {instance.get_full_name() or instance.username}",
             'user', instance.pk, f"User: {instance.get_full_name() or instance.username}")


@receiver(post_save, sender='accounts.AgentCommission')
def commission_post_save(sender, instance, created, **kwargs):
    if not created and instance.is_paid:
        _log('mark_paid',
             f"Marked commission paid for agent {instance.agent.get_full_name()} on quote {instance.quote.ref_number} ({instance.amount_rwf} RWF)",
             'commission', instance.pk,
             f"Commission: {instance.agent.get_full_name()}")
