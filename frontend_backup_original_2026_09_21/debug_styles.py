from pathlib import Path
import re
base = Path(r'd:\Documents\ACADEMIC\VI Semester\Minor\Smart\frontend')
for name in ['admin.html','faculty.html','student.html','session.html']:
    path = base / name
    text = path.read_text(encoding='utf-8')
    styles = re.findall(r'style="([^"]*)"', text)
    unique = sorted(set(styles))
    print(name, len(unique))
    for s in unique[:50]:
        if any(term in s for term in ['grid-template-columns','display: grid','display: flex','margin-top','margin-bottom','overflow-y','width: 100%','text-align:']):
            print('  ', s)
    print('---')
