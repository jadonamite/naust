"""Adjust viewBox to crop tightly and bleed off edges:
- Addresses: tight crop around the cubes, bleeding off bottom and right edges, big in frame!
- Sweep: tight crop so basin and channels fill the frame edge-to-edge!
"""
import subprocess

# 1. Update addresses.svg viewBox
with open('web/public/illustrations/addresses.svg', 'r') as f:
    text = f.read()

# Current bounding of addresses: x approx 140 to 860, y approx 100 to 580
# If viewBox="130 90 730 500", it scales up ~1.4x and fills the frame!
text = text.replace('viewBox="0 0 1000 700"', 'viewBox="140 100 720 490"')
with open('web/public/illustrations/addresses.svg', 'w') as f:
    f.write(text)

# 2. Update sweep.svg viewBox
with open('web/public/illustrations/sweep.svg', 'r') as f:
    stext = f.read()

# Current bounding of sweep: x approx 10 to 990, y approx 0 to 620
# If viewBox="40 0 920 600", it fills from top to bottom
stext = stext.replace('viewBox="0 0 1000 700"', 'viewBox="40 0 920 590"')
with open('web/public/illustrations/sweep.svg', 'w') as f:
    f.write(stext)

print("Updated viewBoxes.")
