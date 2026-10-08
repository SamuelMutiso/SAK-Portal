import re

BROWSERS = [
    ("Edge", r"Edg/"),
    ("Opera", r"OPR/|Opera"),
    ("Samsung Internet", r"SamsungBrowser"),
    ("Chrome", r"Chrome/|CriOS/"),
    ("Firefox", r"Firefox/|FxiOS/"),
    ("Safari", r"Safari/"),
]


def describe_device(user_agent):
    agent = user_agent or ""
    if not agent:
        return "Unknown device"

    browser = next((name for name, pattern in BROWSERS if re.search(pattern, agent)), "Unknown browser")

    android = re.search(r"Android ([\d.]+);\s*([^;)]+)", agent)
    if android:
        model = android.group(2).replace("Build/", "").strip()
        model = "" if model.lower() in ("k", "wv") else f" ({model})"
        return f"Android {android.group(1)} phone{model} · {browser}"
    if "iPhone" in agent:
        return f"iPhone · {browser}"
    if "iPad" in agent:
        return f"iPad · {browser}"
    if "Windows" in agent:
        return f"Windows computer · {browser}"
    if "Macintosh" in agent or "Mac OS X" in agent:
        return f"Mac computer · {browser}"
    if "CrOS" in agent:
        return f"Chromebook · {browser}"
    if "Linux" in agent:
        return f"Linux computer · {browser}"
    return f"Unknown device · {browser}"
