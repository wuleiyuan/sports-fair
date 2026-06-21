#!/usr/bin/env python3
"""Generate a fitness stats SVG for GitHub Profile README."""
import json
import os
import sys


def load_json(path):
    with open(path) as f:
        return json.load(f)


def acwr_status_label(status):
    return {'under': 'Under-training', 'sweet_spot': 'Sweet Spot',
            'caution': 'Caution', 'high_risk': 'High Risk'}.get(status, status)


def tsb_status_label(status):
    return {'recovery': 'Recovered', 'optimal': 'Optimal',
            'fatigue': 'Fatigued', 'overtrained': 'Overtrained'}.get(status, status)


def acwr_color(ratio):
    if ratio is None or ratio <= 0: return '#666666'
    if ratio < 0.8: return '#a855f7'
    if ratio <= 1.3: return '#22c55e'
    if ratio <= 1.5: return '#f97316'
    return '#ef4444'


def tsb_color(tsb_val):
    if tsb_val is None: return '#666666'
    if tsb_val > 15: return '#3b82f6'
    if tsb_val > -5: return '#22c55e'
    if tsb_val > -15: return '#f97316'
    return '#ef4444'


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    training_path = os.path.join(base_dir, 'src', 'static', 'training_load.json')

    if not os.path.exists(training_path):
        print(f'No training data at {training_path}', file=sys.stderr)
        sys.exit(0)

    data = load_json(training_path)
    acwr = data.get('acwr', {})
    tsb = data.get('tsb', {})
    zones = data.get('hr_zones', {})

    ratio = acwr.get('ratio', 0) or 0
    tsb_val = tsb.get('tsb', 0) or 0
    total_activities = zones.get('activities_with_hr', 0)

    # HR zone bar segments
    zone_keys = [
        ('z1_recovery', '#FF5500'),
        ('z2_aerobic_base', '#FF8800'),
        ('z3_aerobic', '#FFB347'),
        ('z4_threshold', '#FF9900'),
        ('z5_anaerobic', '#CC6600'),
    ]
    zone_total = sum(zones.get(k, 0) for k, _ in zone_keys) or 1
    bar_x, bar_w = 520, 80
    zone_bars = ''
    for k, c in zone_keys:
        v = zones.get(k, 0)
        if v <= 0:
            continue
        seg_w = max(1, int(bar_w * v / zone_total))
        zone_bars += f'<rect x="{bar_x}" y="118" width="{seg_w}" height="8" rx="0" fill="{c}"/>'
        bar_x += seg_w

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="700" height="200" viewBox="0 0 700 200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0D0D0D"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
  </defs>
  <rect width="700" height="200" rx="16" fill="url(#bg)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="24" y="36" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="700" fill="#ffffff">Sports Fair</text>
  <text x="24" y="54" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)">Fitness Dashboard · Auto-updated daily</text>
  <line x1="24" y1="66" x2="676" y2="66" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <text x="40" y="98" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" font-weight="600">ACWR</text>
  <text x="40" y="128" font-family="system-ui,-apple-system,sans-serif" font-size="32" font-weight="800" fill="{acwr_color(ratio)}">{ratio:.2f}</text>
  <rect x="40" y="136" width="60" height="20" rx="6" fill="{acwr_color(ratio)}22"/>
  <text x="70" y="150" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="700" fill="{acwr_color(ratio)}" text-anchor="middle">{acwr_status_label(acwr.get('status', ''))}</text>

  <text x="220" y="98" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" font-weight="600">TSB</text>
  <text x="220" y="128" font-family="system-ui,-apple-system,sans-serif" font-size="32" font-weight="800" fill="{tsb_color(tsb_val)}">{tsb_val:+.1f}</text>
  <rect x="220" y="136" width="60" height="20" rx="6" fill="{tsb_color(tsb_val)}22"/>
  <text x="250" y="150" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="700" fill="{tsb_color(tsb_val)}" text-anchor="middle">{tsb_status_label(tsb.get('status', ''))}</text>

  <text x="400" y="98" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" font-weight="600">Activities</text>
  <text x="400" y="128" font-family="system-ui,-apple-system,sans-serif" font-size="32" font-weight="800" fill="#FF8800">{total_activities}</text>
  <text x="400" y="150" font-family="system-ui,-apple-system,sans-serif" font-size="10" fill="rgba(255,255,255,0.4)">with HR data</text>

  <text x="520" y="98" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" font-weight="600">HR Zones</text>
  <rect x="520" y="118" width="80" height="8" rx="4" fill="rgba(255,255,255,0.06)"/>
  {zone_bars}

  <text x="24" y="182" font-family="system-ui,-apple-system,sans-serif" font-size="10" fill="rgba(255,255,255,0.2)">github.com/wuleiyuan/sports-fair</text>
</svg>'''

    output_dir = os.path.join(base_dir, 'profile')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'stats.svg')

    with open(output_path, 'w') as f:
        f.write(svg)

    print(f'Generated: {output_path}')


if __name__ == '__main__':
    main()
