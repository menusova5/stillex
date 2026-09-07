"""
STILLEX - Foundry Nuke Menu Setup
Installs STILLEX into Nuke's top menu bar and Nodes toolbar.
"""

try:
    import nuke
    import stillex_nuke

    # Top Menu
    main_menu = nuke.menu("Nuke")
    stillex_menu = main_menu.addMenu("STILLEX")
    stillex_menu.addCommand("Extract Start & End from Selected Read", "stillex_nuke.extract_from_selected_read()", "alt+shift+s")
    stillex_menu.addCommand("Create Start/End FrameHold Rig", "stillex_nuke.create_framehold_rig()", "alt+shift+h")
    stillex_menu.addSeparator()
    stillex_menu.addCommand("Create STILLEX Extractor Node", "stillex_nuke.create_stillex_node()")

    # Nodes Toolbar
    toolbar = nuke.toolbar("Nodes")
    stillex_toolbar = toolbar.addMenu("STILLEX", icon="FrameHold.png")
    stillex_toolbar.addCommand("STILLEX Start & End Extractor", "stillex_nuke.create_stillex_node()", icon="Read.png")
    stillex_toolbar.addCommand("Split Read to Start/End Stills", "stillex_nuke.extract_from_selected_read()", icon="Write.png")
    stillex_toolbar.addCommand("Start/End FrameHold Rig", "stillex_nuke.create_framehold_rig()", icon="FrameHold.png")

    print("[STILLEX] Initialized Nuke Menu & Toolbar successfully.")
except Exception as e:
    print(f"[STILLEX] Notice: Nuke menu not loaded ({e})")
