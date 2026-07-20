from app import create_app

app = create_app()

with app.app_context():
    rules_by_route = {}
    for rule in app.url_map.iter_rules():
        route = rule.rule
        if route not in rules_by_route:
            rules_by_route[route] = []
        rules_by_route[route].append((rule.endpoint, rule.methods))
        
    for route, endpoints in rules_by_route.items():
        if len(endpoints) > 1:
            print(f"DUPLICATE ROUTES FOR {route}:")
            for ep in endpoints:
                print(f"  {ep}")
