from app import create_app

app = create_app()

with app.app_context():
    for rule in app.url_map.iter_rules():
        if "faculty" in rule.rule:
            print(f"{rule.rule} -> {rule.methods}")
