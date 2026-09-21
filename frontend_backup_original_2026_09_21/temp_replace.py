from pathlib import Path
import re

base = Path(r'd:\Documents\ACADEMIC\VI Semester\Minor\Smart\frontend')
files = [base / 'admin.html', base / 'faculty.html', base / 'student.html', base / 'session.html']

section_map = {
    '30px': 'section-gap',
    '20px': 'section-gap',
    '15px': 'section-gap-sm',
    '10px': 'section-gap-sm',
    '5px': 'section-gap-sm'
}

def add_class(classes, new):
    if new and new not in classes:
        classes.append(new)


def normalize_style(style):
    props = [p.strip() for p in style.split(';') if p.strip()]
    classes = []
    keep = []
    display = None
    for prop in props:
        if ':' not in prop:
            continue
        name, value = [p.strip() for p in prop.split(':', 1)]
        if name == 'margin-top' or name == 'margin-bottom':
            add_class(classes, section_map.get(value, 'section-gap'))
            continue
        if name == 'margin':
            if 'auto' in value:
                add_class(classes, 'mx-auto')
            if '15px 0' in value or '15px 0' in value:
                add_class(classes, 'section-gap-sm')
            continue
        if name == 'display' and value in ('grid', 'flex'):
            display = value
            continue
        if name == 'grid-template-columns':
            if 'repeat(4, 1fr)' in value:
                add_class(classes, 'grid-4')
            elif 'repeat(3, 1fr)' in value:
                add_class(classes, 'grid-3')
            elif 'repeat(auto-fit' in value or 'repeat(auto-fill' in value or 'minmax(' in value:
                add_class(classes, 'grid')
                add_class(classes, 'gap-sm')
            elif '1fr 1fr 1fr auto' in value or '1fr 1fr 2fr auto' in value or '1fr 1fr auto' in value:
                add_class(classes, 'grid')
                add_class(classes, 'gap-sm')
                add_class(classes, 'align-end')
            elif '1fr 1fr' in value:
                add_class(classes, 'grid-2')
            else:
                add_class(classes, 'grid')
            continue
        if name == 'gap':
            if value == '10px' or value == '15px' or value == '8px':
                add_class(classes, 'gap-sm')
            elif value == '20px':
                add_class(classes, 'gap-xl')
            else:
                keep.append(prop)
            continue
        if name == 'justify-content' and value == 'space-between':
            add_class(classes, 'flex-between')
            continue
        if name == 'align-items' and value == 'end':
            add_class(classes, 'align-end')
            continue
        if name == 'overflow-y' and value == 'auto':
            if any(p.startswith('max-height') for p in props):
                add_class(classes, 'panel-scroll')
                continue
            keep.append(prop)
            continue
        if name == 'max-height' and 'px' in value:
            if any(p.startswith('overflow-y') for p in props):
                add_class(classes, 'panel-scroll')
                continue
            keep.append(prop)
            continue
        if name == 'width' and value == '100%':
            add_class(classes, 'table-fill')
            continue
        if name == 'min-width':
            continue
        if name == 'display' and value == 'none':
            keep.append(prop)
            continue
        if name in ('padding', 'background', 'color', 'font-size', 'border-radius', 'border', 'cursor', 'font-family', 'white-space', 'word-break', 'text-transform', 'font-weight', 'font-style', 'opacity', 'text-align'):
            keep.append(prop)
            continue
        if name == 'flex':
            keep.append(prop)
            continue
        keep.append(prop)
    if display == 'flex' and 'flex-between' not in classes:
        add_class(classes, 'flex-wrap')
    if display == 'grid' and 'grid' not in classes and 'grid-2' not in classes and 'grid-3' not in classes and 'grid-4' not in classes:
        add_class(classes, 'grid')
    return classes, '; '.join(keep) + (';' if keep else '')

pattern = re.compile(r'(<[^>]*?)style="([^"]*)"([^>]*>)', re.IGNORECASE)

for path in files:
    text = path.read_text(encoding='utf-8')
    original = text
    def repl(match):
        opening, style, closing = match.groups()
        classes, new_style = normalize_style(style)
        if not classes and new_style == style:
            return match.group(0)
        class_attr_match = re.search(r'class="([^"]*)"', opening)
        if class_attr_match:
            existing = class_attr_match.group(1)
            new_classes = ' '.join(existing.split() + classes)
            opening = re.sub(r'class="[^"]*"', f'class="{new_classes}"', opening)
        elif classes:
            opening = opening + ' class="' + ' '.join(classes) + '"'
        if new_style:
            return opening + ' style="' + new_style + '"' + closing
        return opening + closing
    text = pattern.sub(repl, text)
    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'Updated {path.name}')
