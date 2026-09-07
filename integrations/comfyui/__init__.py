"""
STILLEX - ComfyUI Custom Node Extension
Install: Place or clone this folder into ComfyUI/custom_nodes/ComfyUI-STILLEX
"""

from .stillex_node import STILLEX_VideoExtractor, STILLEX_BatchVideoExtractor

NODE_CLASS_MAPPINGS = {
    "STILLEX_VideoExtractor": STILLEX_VideoExtractor,
    "STILLEX_BatchVideoExtractor": STILLEX_BatchVideoExtractor,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "STILLEX_VideoExtractor": "STILLEX • Video Start & End Frame Extractor",
    "STILLEX_BatchVideoExtractor": "STILLEX • Batch Video Frame Extractor",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
