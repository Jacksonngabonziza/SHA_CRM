import threading

_thread_locals = threading.local()


class CurrentRequestMiddleware:
    """Store the current request in thread-local so signals can access user + IP."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        try:
            return self.get_response(request)
        finally:
            _thread_locals.request = None


def get_current_request():
    return getattr(_thread_locals, 'request', None)


def get_client_ip(request):
    if request is None:
        return None
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
