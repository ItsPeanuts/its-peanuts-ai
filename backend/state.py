"""
In-memory application state.
Slaat maintenance-mode op in geheugen — reset bij herstart (wat precies het gewenste gedrag is:
na een deploy is de website automatisch weer online).
"""

maintenance: dict = {
    "enabled": False,
    "message": "We zijn de website en AI aan het verbeteren. We zijn zo weer volledig online!",
}
