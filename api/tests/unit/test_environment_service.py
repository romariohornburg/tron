"""Tests for EnvironmentService."""
import pytest
from uuid import uuid4, UUID
from unittest.mock import MagicMock, patch
from app.environments.core.environment_service import EnvironmentService
from app.environments.infra.environment_repository import EnvironmentRepository
from app.environments.api.environment_dto import EnvironmentCreate
from app.environments.core.environment_validators import (
    EnvironmentNotFoundError,
    EnvironmentHasComponentsError
)


@pytest.fixture
def mock_repository():
    """Create a mock EnvironmentRepository."""
    return MagicMock(spec=EnvironmentRepository)


@pytest.fixture
def environment_service(mock_repository):
    """Create EnvironmentService instance."""
    return EnvironmentService(mock_repository)


@pytest.fixture
def mock_organization_id():
    """Create a mock organization ID."""
    return 1


@pytest.fixture
def mock_environment():
    """Create a mock environment."""
    from datetime import datetime

    environment = MagicMock()
    environment.uuid = uuid4()
    environment.id = 1
    environment.name = "test-env"
    environment.created_at = datetime.now()
    environment.updated_at = datetime.now()
    environment.clusters = []
    environment.settings = []
    return environment


def test_create_environment_success(environment_service, mock_repository, mock_environment, mock_organization_id):
    """Test successful environment creation."""
    dto = EnvironmentCreate(name="test-env")

    mock_repository.create.return_value = mock_environment

    with patch.object(environment_service, '_build_environment_entity', return_value=mock_environment):
        result = environment_service.create_environment(dto, mock_organization_id)

        assert result == mock_environment
        mock_repository.create.assert_called_once()


def test_update_environment_success(environment_service, mock_repository, mock_environment, mock_organization_id):
    """Test successful environment update."""
    env_uuid = mock_environment.uuid
    dto = EnvironmentCreate(name="updated-env")

    updated_environment = MagicMock()
    updated_environment.uuid = env_uuid
    updated_environment.name = dto.name

    mock_repository.find_by_uuid_and_organization.return_value = mock_environment
    mock_repository.update.return_value = updated_environment

    result = environment_service.update_environment(env_uuid, dto, mock_organization_id)

    assert result == updated_environment
    assert mock_environment.name == dto.name
    mock_repository.update.assert_called_once()


def test_update_environment_not_found(environment_service, mock_repository, mock_organization_id):
    """Test updating non-existent environment."""
    env_uuid = uuid4()
    dto = EnvironmentCreate(name="updated-env")

    mock_repository.find_by_uuid_and_organization.return_value = None

    with pytest.raises(ValueError, match="not found in organization"):
        environment_service.update_environment(env_uuid, dto, mock_organization_id)


def test_get_environment_success(environment_service, mock_repository, mock_environment, mock_organization_id):
    """Test getting environment by UUID."""
    env_uuid = mock_environment.uuid
    mock_repository.find_by_uuid_and_organization.return_value = mock_environment

    with patch.object(environment_service, '_serialize_environment_with_clusters') as mock_serialize:
        mock_response = MagicMock()
        mock_serialize.return_value = mock_response

        result = environment_service.get_environment(env_uuid, mock_organization_id)

        assert result == mock_response
        mock_repository.find_by_uuid_and_organization.assert_called_once_with(env_uuid, mock_organization_id)
        mock_serialize.assert_called_once_with(mock_environment)


def test_get_environment_not_found(environment_service, mock_repository, mock_organization_id):
    """Test getting non-existent environment."""
    env_uuid = uuid4()
    mock_repository.find_by_uuid_and_organization.return_value = None

    with pytest.raises(ValueError, match="not found in organization"):
        environment_service.get_environment(env_uuid, mock_organization_id)


def test_get_environments(environment_service, mock_repository, mock_environment, mock_organization_id):
    """Test getting all environments."""
    mock_environment2 = MagicMock()
    mock_environment2.uuid = uuid4()
    mock_environment2.name = "test-env-2"
    mock_environment2.clusters = []
    mock_environment2.settings = []

    mock_repository.find_all.return_value = [mock_environment, mock_environment2]

    with patch.object(environment_service, '_serialize_environment_with_clusters') as mock_serialize:
        mock_serialize.side_effect = lambda e: MagicMock(uuid=e.uuid, name=e.name)

        result = environment_service.get_environments(mock_organization_id, skip=0, limit=10)

        assert len(result) == 2
        mock_repository.find_all.assert_called_once_with(organization_id=mock_organization_id, skip=0, limit=10)


def test_delete_environment_success(environment_service, mock_repository, mock_environment, mock_organization_id):
    """Test successful environment deletion."""
    env_uuid = mock_environment.uuid
    mock_repository.find_by_uuid_and_organization.return_value = mock_environment

    # Mock validate_environment_can_be_deleted to not raise error
    with patch('app.environments.core.environment_service.validate_environment_can_be_deleted'):
        result = environment_service.delete_environment(env_uuid, mock_organization_id)

        assert result == {"detail": "Environment deleted successfully"}
        mock_repository.find_by_uuid_and_organization.assert_called_once_with(env_uuid, mock_organization_id)
        mock_repository.delete.assert_called_once_with(mock_environment)


def test_delete_environment_not_found(environment_service, mock_repository, mock_organization_id):
    """Test deleting non-existent environment."""
    env_uuid = uuid4()
    mock_repository.find_by_uuid_and_organization.return_value = None

    with pytest.raises(ValueError, match="not found in organization"):
        environment_service.delete_environment(env_uuid, mock_organization_id)


def test_delete_environment_has_components(environment_service, mock_repository, mock_environment, mock_organization_id):
    """Test deleting environment with components."""
    env_uuid = mock_environment.uuid
    mock_repository.find_by_uuid_and_organization.return_value = mock_environment

    # Mock that environment has components
    with patch('app.environments.core.environment_service.validate_environment_can_be_deleted', side_effect=EnvironmentHasComponentsError("Environment has components")):
        with pytest.raises(EnvironmentHasComponentsError):
            environment_service.delete_environment(env_uuid, mock_organization_id)
