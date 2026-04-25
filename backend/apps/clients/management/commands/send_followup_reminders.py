from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.clients.models import Client


class Command(BaseCommand):
    help = 'Email each sales rep a digest of their follow-ups due today and overdue.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview emails without sending them.',
        )

    def handle(self, *args, **options):
        from django.core.mail import send_mail
        from apps.accounts.models import User, CompanySettings
        from django.conf import settings as django_settings

        today    = timezone.now().date()
        dry_run  = options['dry_run']
        cfg      = CompanySettings.get()

        overdue_qs = Client.objects.filter(
            followup_date__lt=today,
            status='followup',
        ).select_related('created_by', 'assigned_to')

        today_qs = Client.objects.filter(
            followup_date=today,
            status='followup',
        ).select_related('created_by', 'assigned_to')

        # Group by rep: use assigned_to if set, else created_by
        def _rep(client):
            return client.assigned_to or client.created_by

        rep_map: dict = {}
        for c in list(overdue_qs) + list(today_qs):
            rep = _rep(c)
            if rep and rep.email:
                rep_map.setdefault(rep, {'overdue': [], 'today': []})

        for c in overdue_qs:
            rep = _rep(c)
            if rep and rep.email:
                rep_map[rep]['overdue'].append(c)

        for c in today_qs:
            rep = _rep(c)
            if rep and rep.email:
                rep_map[rep]['today'].append(c)

        if not rep_map:
            self.stdout.write(self.style.SUCCESS('No follow-ups due today — no emails sent.'))
            return

        frontend_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:3000')

        for rep, groups in rep_map.items():
            overdue = groups['overdue']
            due_today = groups['today']
            total = len(overdue) + len(due_today)

            subject = f'[{cfg.company_name}] You have {total} follow-up{"s" if total != 1 else ""} today'

            lines = []
            if due_today:
                lines.append(f'DUE TODAY ({len(due_today)}):')
                for c in due_today:
                    lines.append(f'  • {c.name} — {c.phone}{" — " + c.location if c.location else ""}')
                    lines.append(f'    {frontend_url}/clients/{c.id}')

            if overdue:
                lines.append(f'\nOVERDUE ({len(overdue)}):')
                for c in overdue:
                    lines.append(
                        f'  • {c.name} — {c.phone} — was due {c.followup_date}'
                        f'{" — " + c.location if c.location else ""}'
                    )
                    lines.append(f'    {frontend_url}/clients/{c.id}')

            body = (
                f'Hi {rep.get_full_name() or rep.username},\n\n'
                f'Here are your follow-ups that need attention today:\n\n'
                + '\n'.join(lines)
                + f'\n\n{cfg.company_tagline}\n{cfg.company_name}'
            )

            if dry_run:
                self.stdout.write(self.style.WARNING(f'[DRY RUN] Would email {rep.email}:'))
                self.stdout.write(f'  Subject: {subject}')
                self.stdout.write(f'  {total} follow-up(s): {len(due_today)} today, {len(overdue)} overdue')
                continue

            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=cfg.company_email,
                    recipient_list=[rep.email],
                    fail_silently=False,
                )
                self.stdout.write(self.style.SUCCESS(
                    f'Emailed {rep.email} — {total} follow-up(s)'
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to email {rep.email}: {e}'))
