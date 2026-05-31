import re as _re

# Test the parse functions before embedding
def parse_ac_blocks(acs_text):
    blocks = []
    pattern = _re.compile(
        r'(?:\*?\s*Scenario\s+(\d+)\s*[-\u2013\u2014]\s*([^\n]*?)(?:\*|\n|$))|'
        r'(?:\*?\s*AC\s*(\d+)\s*[-\u2013\u2014]\s*([^\n]*?)(?:\*|\n|$))',
        _re.IGNORECASE
    )
    positions = []
    for m in pattern.finditer(acs_text):
        if m.group(1):
            num = int(m.group(1))
            title = (m.group(2) or "").strip().strip("*").strip()
            positions.append((m.start(), num, title))
        elif m.group(3):
            num_str = m.group(3)
            try:
                num = int(num_str)
            except:
                num = 1
            title = (m.group(4) or "").strip().strip("*").strip()
            positions.append((m.start(), num, title))

    if not positions:
        ac_codes = _re.findall(r'\bAC\s*\d+\b', acs_text, _re.IGNORECASE)
        if ac_codes:
            seen = set()
            for ac in ac_codes:
                key = ac.replace(" ","").upper()
                if key not in seen:
                    seen.add(key)
                    blocks.append({"ac_code": key, "title": acs_text[:80], "full_text": acs_text})
        else:
            blocks.append({"ac_code": "AC01", "title": acs_text[:80], "full_text": acs_text})
        return blocks

    for idx, (pos, num, title) in enumerate(positions):
        end_pos = positions[idx+1][0] if idx+1 < len(positions) else len(acs_text)
        block_text = acs_text[pos:end_pos].strip()
        ac_code = f"AC0{num}" if num < 10 else f"AC{num}"
        blocks.append({"ac_code": ac_code, "title": title, "full_text": block_text})
    return blocks

# Test
tests = [
    '*Scenario 1 - Move Renewal Record to Accepted status*\n*GIVEN*...',
    '*Scenario 1 - A*\n*Scenario 2 - B*\n',
    'AC01 Intact Insurance...\nAC02 More...',
    'AC2 Given that an Intact eTrade policy',
    'Given a policy is in its renewal journey',
]
for t in tests:
    r = parse_ac_blocks(t)
    print(f"Input: {t[:60]!r}")
    print(f"  -> {[(b['ac_code'], b['title'][:40]) for b in r]}")
    print()
