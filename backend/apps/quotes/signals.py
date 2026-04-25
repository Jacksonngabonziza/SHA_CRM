from django.db.models.signals import pre_save
from django.dispatch import receiver


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
