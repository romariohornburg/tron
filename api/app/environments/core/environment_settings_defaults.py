"""Default environment settings as JSON array. Used when creating a new environment."""

DEFAULT_ENVIRONMENT_SETTINGS = [
    {
        "key": "min_memory_megabytes",
        "value": 64,
        "description": "Minimum memory (MB) allowed for components in this environment.",
        "type": "number",
    },
    {
        "key": "max_memory_megabytes",
        "value": 2048,
        "description": "Maximum memory (MB) allowed for components in this environment.",
        "type": "number",
    },
    {
        "key": "min_cpu_cores",
        "value": 0.25,
        "description": "Minimum CPU cores allowed for components in this environment.",
        "type": "number",
    },
    {
        "key": "max_cpu_cores",
        "value": 2,
        "description": "Maximum CPU cores allowed for components in this environment.",
        "type": "number",
    },
    {
        "key": "max_pods",
        "value": 5,
        "description": "Maximum number of pods per component in this environment.",
        "type": "number",
    },
]

# Keys used for component validation (CPU, memory, replicas)
ENVIRONMENT_LIMIT_KEYS = (
    "min_cpu_cores",
    "max_cpu_cores",
    "min_memory_megabytes",
    "max_memory_megabytes",
    "max_pods",
)


def get_environment_limits_from_settings(settings_list: list | None) -> dict | None:
    """
    Build a dict of limit key -> numeric value from environment settings list.
    Returns None if settings_list is None or empty (no validation).
    Only includes keys in ENVIRONMENT_LIMIT_KEYS with numeric values.
    """
    if not settings_list:
        return None
    limits = {}
    for item in settings_list:
        if not isinstance(item, dict):
            continue
        key = item.get("key")
        if key not in ENVIRONMENT_LIMIT_KEYS:
            continue
        val = item.get("value")
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            limits[key] = float(val) if "cpu" in key else int(val)
    return limits if limits else None
