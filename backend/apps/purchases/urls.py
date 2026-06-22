from django.urls import path
from .views import (
    SupplierListCreateView, SupplierDetailView,
    PurchaseOrderListCreateView, PurchaseOrderDetailView,
    add_po_item, remove_po_item, mark_po_received, purchase_order_pdf,
)

urlpatterns = [
    path('suppliers/',              SupplierListCreateView.as_view(),  name='supplier_list'),
    path('suppliers/<int:pk>/',     SupplierDetailView.as_view(),      name='supplier_detail'),
    path('',                        PurchaseOrderListCreateView.as_view(), name='po_list'),
    path('<int:pk>/',               PurchaseOrderDetailView.as_view(), name='po_detail'),
    path('<int:pk>/items/',         add_po_item,                       name='po_add_item'),
    path('<int:pk>/items/<int:item_pk>/', remove_po_item,              name='po_remove_item'),
    path('<int:pk>/receive/',       mark_po_received,                  name='po_receive'),
    path('<int:pk>/pdf/',           purchase_order_pdf,                name='po_pdf'),
]
