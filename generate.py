import sys
import re
import base64
import json

FONT_FACE_PAT = re.compile(r"""
    (@font-face \s* \{ \s*
        font-family: \s* '([^']*) )( ' [^{}]*
        \.(\d+)\.woff [^{}]+
        unicode-range: ([U+\-0-9a-f,\s]+);
        [^{}]*
    \})
""", re.I | re.X)
URL_WO_SCHEMA_PAT = re.compile("(?<!:)//")
BLOCKS_PAT = re.compile(r'^([0-9A-F]+)\.\.([0-9A-F]+); (.*)$')

def runs(arr): # -> iterable of (value, run length)
    prev = None
    runlen = 0
    for i in arr:
        if prev != i:
            if runlen > 0: yield prev, runlen
            prev = i
            runlen = 0
        runlen += 1
    if runlen > 0: yield prev, runlen

def run_compressed_base64(values):
    data = bytearray()
    for v, l in runs(values):
        assert v < 128
        data.append(v)
        l -= 1
        while l > 129:
            data.append(255) # run length of 129 (code 255)
            l -= 129
        if l > 1:
            data.append(l + 126) # run length of 2..128 (code 128..254)
        elif l > 0:
            data.append(v)
    return base64.b64encode(data)

def compress_hybrid_delta(v):
    delta = [v[0]]
    for i, j in zip(v, v[1:]):
        delta.append(j - i)
    rlestart = max([-1] + [i for i in xrange(len(delta)//2) if delta[i] >= 128]) + 1
    rleend = min([len(delta)] + [i for i in xrange(len(delta)//2, len(delta)) if delta[i] >= 128])
    return delta[:rlestart] + [run_compressed_base64(delta[rlestart:rleend])] + delta[rleend:]

def generate_supplement(jsout, blocksin, iicorein):
    blocks = []
    lastend = 0
    with open(blocksin, 'r') as f:
        for line in f:
            m = BLOCKS_PAT.match(line)
            if not m: continue
            start = int(m.group(1), 16)
            end = int(m.group(2), 16) + 1 # exclusive range
            name = m.group(3).strip()
            if lastend < start:
                blocks.append((lastend, ''))
            blocks.append((start, name))
            lastend = end
    blocks.append((lastend, ''))

    iicore = []
    with open(iicorein, 'r') as f:
        for line in f:
            try: iicore.append(int(line[:5], 16))
            except ValueError: pass

    iicoredelta = compress_hybrid_delta(iicore)
    ksx1001delta = compress_hybrid_delta([c for c in xrange(0xac00, 0xac00 + 11172) if len(unichr(c).encode('euc-kr', 'ignore')) == 2])

    with open(jsout, 'w') as f:
        f.write('window.uniblocks = ')
        json.dump(blocks, f, separators=(',',':'))
        f.write(';\n')
        f.write('window.iicoredelta = ')
        json.dump(iicoredelta, f, separators=(',',':'))
        f.write(';\n')
        f.write('window.ksx1001delta = ')
        json.dump(ksx1001delta, f, separators=(',',':'))
        f.write(';\n')

def generate_data(cssout, jsonout):
    with open(cssout, 'w') as css:
        assignments = {}
        fontname = None
        for pre, name, post, idx, ranges in FONT_FACE_PAT.findall(sys.stdin.read()):
            assert fontname is None or fontname == name, (name, fontname)
            fontname = name
            group = int(idx)
            css.write(URL_WO_SCHEMA_PAT.sub('https://', '%s g%d%s\n' % (pre, group, post)))
            for r in ranges.split(','):
                r = r.strip()
                assert r.startswith('U+')
                a, sep, b = r[2:].partition('-')
                for c in range(int(a, 16), int(b or a, 16) + 1):
                    try:
                        assert assignments[c] == group
                    except KeyError:
                        assignments[c] = group

    ranges = []
    for c, group in sorted(assignments.items()):
        if not ranges or ranges[-1]['end'] + 1 < c:
            ranges.append(dict(start=c, end=c, groups=bytearray([group])))
        else:
            ranges[-1]['end'] = c
            ranges[-1]['groups'].append(group)

    with open(jsonout, 'w') as f:
        json.dump({
            'name': fontname,
            'csspath': cssout,
            'ngroups': max(assignments.values()) + 1,
            'ranges': [dict(start=r['start'], end=r['end'], groups=run_compressed_base64(r['groups'])) for r in ranges],
        }, f, separators=(',',':'))

if __name__ == '__main__':
    nargs = dict(supplement=3, data=2)
    if len(sys.argv) < 2 or sys.argv[1] not in nargs or len(sys.argv) < 2 + nargs[sys.argv[1]]:
        print >>sys.stderr, 'Usage: %s supplement <js output> <blocks.txt> <iicoremapping.txt>' % sys.argv[0]
        print >>sys.stderr, '   or: %s data <css output> <json output> < <css input>' % sys.argv[0]
        raise SystemExit(1)

    if sys.argv[1] == 'supplement':
        generate_supplement(jsout=sys.argv[2], blocksin=sys.argv[3], iicorein=sys.argv[4])
    else:
        assert sys.argv[1] == 'data'
        generate_data(cssout=sys.argv[2], jsonout=sys.argv[3])

