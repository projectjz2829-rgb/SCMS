import ast
import os

def check_unused_imports(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read(), filename=filepath)
    
    imports = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                name = alias.asname or alias.name
                imports[name] = node
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                name = alias.asname or alias.name
                imports[name] = node
                
    used_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            used_names.add(node.id)
        elif isinstance(node, ast.Attribute):
            # rudimentary check for module.attribute
            if isinstance(node.value, ast.Name):
                used_names.add(node.value.id)

    unused = []
    for imp_name in imports:
        # Check if the base name of the import is used
        base_name = imp_name.split('.')[0]
        if base_name not in used_names:
            # Handle special cases like 'Blueprint' which is used in decorators @blueprint.route
            # But the decorator is Name(id='blueprint') or Attribute, which we capture.
            unused.append(imp_name)
    
    return unused

dirs_to_check = ['backend/app/api', 'backend/app/dashboard']
for d in dirs_to_check:
    for f in os.listdir(d):
        if f.endswith('.py'):
            fp = os.path.join(d, f)
            unused = check_unused_imports(fp)
            if unused:
                print(f"{fp}: {unused}")
