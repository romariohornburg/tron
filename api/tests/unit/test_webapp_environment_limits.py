"""Unit tests for webapp environment limits validation."""
import pytest
from app.webapps.core.webapp_validators import (
    validate_webapp_settings_against_environment_limits,
    EnvironmentSettingsValidationError,
)
from app.environments.core.environment_settings_defaults import (
    get_environment_limits_from_settings,
    ENVIRONMENT_LIMIT_KEYS,
)


# --- get_environment_limits_from_settings ---


def test_get_environment_limits_from_settings_none_returns_none():
    """When settings_list is None, no validation is applied."""
    assert get_environment_limits_from_settings(None) is None


def test_get_environment_limits_from_settings_empty_returns_none():
    """When settings_list is empty, no validation is applied."""
    assert get_environment_limits_from_settings([]) is None


def test_get_environment_limits_from_settings_extracts_only_limit_keys():
    """Only ENVIRONMENT_LIMIT_KEYS with numeric values are returned."""
    settings = [
        {"key": "min_cpu_cores", "value": 0.25, "type": "number"},
        {"key": "max_cpu_cores", "value": 2, "type": "number"},
        {"key": "min_memory_megabytes", "value": 128, "type": "number"},
        {"key": "max_memory_megabytes", "value": 2048, "type": "number"},
        {"key": "max_pods", "value": 5, "type": "number"},
        {"key": "other_key", "value": 99, "type": "number"},
    ]
    limits = get_environment_limits_from_settings(settings)
    assert limits is not None
    assert set(limits.keys()) == set(ENVIRONMENT_LIMIT_KEYS)
    assert "other_key" not in limits
    assert limits["min_cpu_cores"] == 0.25
    assert limits["max_cpu_cores"] == 2.0
    assert limits["min_memory_megabytes"] == 128
    assert limits["max_memory_megabytes"] == 2048
    assert limits["max_pods"] == 5


def test_get_environment_limits_from_settings_non_numeric_value_ignored():
    """Non-numeric values are ignored (no key added)."""
    settings = [
        {"key": "max_cpu_cores", "value": "two", "type": "number"},
        {"key": "max_pods", "value": 5, "type": "number"},
    ]
    limits = get_environment_limits_from_settings(settings)
    assert limits == {"max_pods": 5}


def test_get_environment_limits_from_settings_all_non_numeric_returns_none():
    """If no valid numeric limit keys, returns None (no validation)."""
    settings = [
        {"key": "max_cpu_cores", "value": "invalid"},
    ]
    assert get_environment_limits_from_settings(settings) is None


# --- validate_webapp_settings_against_environment_limits ---


def test_validate_limits_none_does_not_raise():
    """When limits is None, no validation is performed."""
    validate_webapp_settings_against_environment_limits(
        None, cpu=10.0, memory=10000, autoscaling_min=1, autoscaling_max=100
    )


def test_validate_limits_empty_dict_does_not_raise():
    """When limits is {}, no validation is performed."""
    validate_webapp_settings_against_environment_limits(
        {}, cpu=10.0, memory=10000, autoscaling_min=1, autoscaling_max=100
    )


def test_validate_limits_cpu_below_min_raises():
    """CPU below min_cpu_cores raises EnvironmentSettingsValidationError."""
    limits = {"min_cpu_cores": 0.5, "max_cpu_cores": 4.0}
    with pytest.raises(EnvironmentSettingsValidationError) as exc_info:
        validate_webapp_settings_against_environment_limits(
            limits, cpu=0.25, memory=512, autoscaling_min=1, autoscaling_max=3
        )
    assert "at least 0.5 cores" in str(exc_info.value)
    assert "environment limit" in str(exc_info.value).lower()


def test_validate_limits_cpu_above_max_raises():
    """CPU above max_cpu_cores raises EnvironmentSettingsValidationError."""
    limits = {"min_cpu_cores": 0.25, "max_cpu_cores": 2.0}
    with pytest.raises(EnvironmentSettingsValidationError) as exc_info:
        validate_webapp_settings_against_environment_limits(
            limits, cpu=4.0, memory=512, autoscaling_min=1, autoscaling_max=3
        )
    assert "at most 2.0 cores" in str(exc_info.value)
    assert "environment limit" in str(exc_info.value).lower()


def test_validate_limits_memory_below_min_raises():
    """Memory below min_memory_megabytes raises EnvironmentSettingsValidationError."""
    limits = {"min_memory_megabytes": 256, "max_memory_megabytes": 2048}
    with pytest.raises(EnvironmentSettingsValidationError) as exc_info:
        validate_webapp_settings_against_environment_limits(
            limits, cpu=1.0, memory=128, autoscaling_min=1, autoscaling_max=3
        )
    assert "at least 256 MB" in str(exc_info.value)
    assert "environment limit" in str(exc_info.value).lower()


def test_validate_limits_memory_above_max_raises():
    """Memory above max_memory_megabytes raises EnvironmentSettingsValidationError."""
    limits = {"min_memory_megabytes": 64, "max_memory_megabytes": 2048}
    with pytest.raises(EnvironmentSettingsValidationError) as exc_info:
        validate_webapp_settings_against_environment_limits(
            limits, cpu=1.0, memory=4096, autoscaling_min=1, autoscaling_max=3
        )
    assert "at most 2048 MB" in str(exc_info.value)
    assert "environment limit" in str(exc_info.value).lower()


def test_validate_limits_min_replicas_above_max_pods_raises():
    """Min replicas above max_pods raises EnvironmentSettingsValidationError."""
    limits = {"max_pods": 5}
    with pytest.raises(EnvironmentSettingsValidationError) as exc_info:
        validate_webapp_settings_against_environment_limits(
            limits, cpu=1.0, memory=512, autoscaling_min=10, autoscaling_max=10
        )
    assert "Min replicas" in str(exc_info.value)
    assert "at most 5" in str(exc_info.value)
    assert "environment limit" in str(exc_info.value).lower()


def test_validate_limits_max_replicas_above_max_pods_raises():
    """Max replicas above max_pods raises EnvironmentSettingsValidationError."""
    limits = {"max_pods": 5}
    with pytest.raises(EnvironmentSettingsValidationError) as exc_info:
        validate_webapp_settings_against_environment_limits(
            limits, cpu=1.0, memory=512, autoscaling_min=2, autoscaling_max=10
        )
    assert "Max replicas" in str(exc_info.value)
    assert "at most 5" in str(exc_info.value)
    assert "environment limit" in str(exc_info.value).lower()


def test_validate_limits_all_within_bounds_does_not_raise():
    """When all values are within limits, no exception is raised."""
    limits = {
        "min_cpu_cores": 0.25,
        "max_cpu_cores": 4.0,
        "min_memory_megabytes": 128,
        "max_memory_megabytes": 2048,
        "max_pods": 10,
    }
    validate_webapp_settings_against_environment_limits(
        limits, cpu=1.0, memory=512, autoscaling_min=2, autoscaling_max=5
    )
    # boundaries inclusive
    validate_webapp_settings_against_environment_limits(
        limits, cpu=0.25, memory=128, autoscaling_min=1, autoscaling_max=10
    )
    validate_webapp_settings_against_environment_limits(
        limits, cpu=4.0, memory=2048, autoscaling_min=1, autoscaling_max=10
    )


def test_validate_limits_first_violation_raises():
    """First violation in order (cpu min, cpu max, memory min, memory max, replicas) is reported."""
    limits = {
        "min_cpu_cores": 1.0,
        "max_cpu_cores": 2.0,
        "min_memory_megabytes": 256,
        "max_memory_megabytes": 1024,
        "max_pods": 3,
    }
    # CPU too low
    with pytest.raises(EnvironmentSettingsValidationError) as e:
        validate_webapp_settings_against_environment_limits(
            limits, cpu=0.5, memory=512, autoscaling_min=1, autoscaling_max=2
        )
    assert "CPU" in str(e.value) and "1.0" in str(e.value)
