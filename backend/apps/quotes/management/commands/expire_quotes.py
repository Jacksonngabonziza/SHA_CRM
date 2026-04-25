from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.quotes.models import Quote


EXPIRABLE_STATUSES = ['draft', 'sent']


class Command(BaseCommand):
    help = 'Mark overdue quotes as expired and notify the sales reps who created them.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview which quotes would be expired without making changes.',
        )
        parser.add_argument(
            '--notify',
            action='store_true',
            help='Send email notifications to sales reps for each expired quote.',
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        dry_run = options['dry_run']
        notify = options['notify']

        qs = Quote.objects.filter(
            status__in=EXPIRABLE_STATUSES,
            valid_until__lt=today,
        ).select_related('client', 'created_by')

        count = qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No quotes to expire.'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN — {count} quote(s) would be expired:'))
            for q in qs:
                self.stdout.write(f'  {q.ref_number} — {q.client.name} — valid until {q.valid_until}')
            return

        expired_refs = list(qs.values_list('ref_number', flat=True))
        updated = qs.update(status='expired')

        self.stdout.write(self.style.SUCCESS(f'Expired {updated} quote(s): {", ".join(expired_refs)}'))

        if notify:
            self._send_notifications(qs.model.objects.filter(ref_number__in=expired_refs))

    def _send_notifications(self, quotes):
        from django.core.mail import send_mail
        from apps.accounts.models import CompanySettings

        cfg = CompanySettings.get()

        # Group by sales rep to send one digest email per rep
        by_rep = {}
        for q in quotes.select_related('client', 'created_by'):
            rep = q.created_by
            if rep and rep.email:
                by_rep.setdefault(rep, []).append(q)

        for rep, rep_quotes in by_rep.items():
            lines = '\n'.join(
                f'  • {q.ref_number} — {q.client.name} — RWF {q.total_price_rwf:,.0f} '
                f'(expired {q.valid_until})'
                for q in rep_quotes
            )
            body = (
                f'Hi {rep.get_full_name() or rep.username},\n\n'
                f'The following {len(rep_quotes)} quote(s) have passed their validity date '
                f'and have been marked as Expired:\n\n'
                f'{lines}\n\n'
                f'Consider reaching out to these clients to renew interest or create a new version.\n\n'
                f'{cfg.company_tagline}\n{cfg.company_name}'
            )
            try:
                send_mail(
                    subject=f'[{cfg.company_name}] {len(rep_quotes)} Quote(s) Expired',
                    message=body,
                    from_email=cfg.company_email,
                    recipient_list=[rep.email],
                    fail_silently=True,
                )
                self.stdout.write(f'  Notified {rep.email} ({len(rep_quotes)} quotes)')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Failed to notify {rep.email}: {e}'))
