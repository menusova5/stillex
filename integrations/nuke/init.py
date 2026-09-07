"""
STILLEX - Foundry Nuke Init Configuration
"""

try:
    import nuke
    import os

    current_dir = os.path.dirname(__file__)
    if current_dir not in nuke.pluginPath():
        nuke.pluginAddPath(current_dir)
except Exception:
    pass
