from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

_APPROVED_TRANSITION = set()  # track pk transitions across pre/post save


@receiver(pre_save, sender='quotes.Quote')
def create_agent_commission(sender, instance, **kwargs):
    """When a quote transitions to 'approved', create a commission for the source agent."""
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    if old.status != 'approved' and instance.status == 'approved':
        _APPROVED_TRANSITION.add(instance.pk)
        client = instance.client_detail if hasattr(instance, 'client_detail') else None
        if client is None:
            try:
                from apps.clients.models import Client
                client = Client.objects.get(pk=instance.client_id)
            except Exception:
                return

        agent = getattr(client, 'source_agent', None)
        if not agent:
            return

        try:
            profile = agent.agent_profile
        except Exception:
            return

        from apps.accounts.models import AgentCommission
        from decimal import Decimal
        deal_amount = Decimal(str(instance.total_price_rwf))
        rate = profile.effective_rate(deal_amount)
        amount = deal_amount * rate
        AgentCommission.objects.get_or_create(
            agent=agent,
            quote=instance,
            defaults={'amount_rwf': amount},
        )


@receiver(post_save, sender='quotes.Quote')
def create_contractor_expense(sender, instance, created, **kwargs):
    """Auto-create a contractor commission expense when a quote transitions to approved."""
    if instance.pk not in _APPROVED_TRANSITION:
        return
    _APPROVED_TRANSITION.discard(instance.pk)
    try:
        from apps.accounts.models import CompanySettings
        from apps.expenses.models import Expense
        from decimal import Decimal
        from django.utils import timezone
        settings = CompanySettings.get()
        pct = settings.sales_commission_pct
        if not pct:
            return
        amount = Decimal(str(instance.total_price_rwf)) * pct
        name   = settings.sales_commission_name or 'Contractor'
        if not Expense.objects.filter(quote=instance, category='contractor').exists():
            Expense.objects.create(
                description=f"Commission for {name} — {instance.ref_number}",
                category='contractor',
                amount_rwf=amount,
                date=timezone.now().date(),
                quote=instance,
                notes=f"{float(pct)*100:.1f}% of {instance.total_price_rwf} RWF",
            )
    except Exception:
        pass  # never block the main flow
