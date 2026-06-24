from django.urls import path
from . import views

urlpatterns = [
    path('webhook/',                              views.webhook,               name='wa_webhook'),
    path('conversations/',                        views.conversation_list,     name='wa_conversations'),
    path('conversations/<int:pk>/',               views.conversation_detail,   name='wa_conversation_detail'),
    path('conversations/<int:pk>/send/',          views.send_manual_message,   name='wa_send_message'),
    path('conversations/<int:pk>/transfer/',      views.transfer_to_whatsapp,  name='wa_transfer'),
]
