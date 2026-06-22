from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',          include('apps.accounts.urls')),
    path('api/products/',      include('apps.products.urls')),
    path('api/clients/',       include('apps.clients.urls')),
    path('api/quotes/',        include('apps.quotes.urls')),
    path('api/dashboard/',     include('apps.dashboard.urls')),
    path('api/surveys/',       include('apps.surveys.urls')),
    path('api/installations/', include('apps.installations.urls')),
    path('api/payments/',      include('apps.payments.urls')),
    path('api/reports/',       include('apps.reports.urls')),
    path('api/referrals/',     include('apps.referrals.urls')),
    path('api/activity/',      include('apps.activity.urls')),
    path('api/expenses/',      include('apps.expenses.urls')),
    path('api/purchases/',     include('apps.purchases.urls')),
]

# Serve media files via Django in development only.
# In production, serve /media/ through Nginx (see nginx.conf).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
