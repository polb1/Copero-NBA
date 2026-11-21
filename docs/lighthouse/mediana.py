# Uso: python mediana.py <carpeta> [<carpeta_comparar>]  -> tabla de medianas por página y dispositivo
import json, glob, os, sys, statistics as st, collections
def load(d):
    R = collections.defaultdict(list)
    for f in glob.glob(os.path.join(d, '*.json')):
        n = os.path.basename(f).split('.'); page, dev = n[0], n[1]
        try: x = json.load(open(f, encoding='utf-8'))
        except Exception: continue
        c, a = x['categories'], x['audits']
        if x.get('runtimeError'): continue
        R[(page, dev)].append({k: (c[k]['score'] or 0) * 100 for k in ['performance', 'accessibility', 'best-practices', 'seo']} | {
            'LCP': a['largest-contentful-paint'].get('numericValue'), 'TBT': a['total-blocking-time'].get('numericValue'),
            'CLS': a['cumulative-layout-shift'].get('numericValue'), 'FCP': a['first-contentful-paint'].get('numericValue')})
    return {k: {m: (st.median([r[m] for r in v if r[m] is not None]) if any(r[m] is not None for r in v) else float("nan")) for m in v[0]} | {'n': len(v)} for k, v in R.items()}
A = load(sys.argv[1]); B = load(sys.argv[2]) if len(sys.argv) > 2 else None
for k in sorted(A):
    a = A[k]; s = f"{k[0]:32s} {k[1][:3]} n={a['n']} P{a['performance']:.0f} A{a['accessibility']:.0f} BP{a['best-practices']:.0f} S{a['seo']:.0f} LCP{a['LCP']/1000:.1f} TBT{a['TBT']:.0f} CLS{a['CLS']:.2f}"
    if B and k in B:
        b = B[k]; s += f"  ->  P{b['performance']:.0f} A{b['accessibility']:.0f} BP{b['best-practices']:.0f} S{b['seo']:.0f} LCP{b['LCP']/1000:.1f} TBT{b['TBT']:.0f} CLS{b['CLS']:.2f}"
    print(s)
