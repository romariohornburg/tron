"""Integration tests for instance permission matrix.

Tests validate the permission matrix for instance operations:
- POST /instances (create) → allowed: ORG_MEMBER, ENV_MAINTAINER
- PUT /instances/{id} (operate/update) → allowed: ENV_OPERATOR/MAINTAINER and ORG_MEMBER
- DELETE /instances/{id} → allowed: ORG_MEMBER
- GET /instances and GET /instances/{id} → viewer+
"""
import pytest
from fastapi import status
from uuid import uuid4

from app.organizations.infra.organization_repository import OrganizationRepository
from app.organizations.infra.organization_model import Organization
from app.organizations.infra.organization_member_model import OrganizationMember
from app.organizations.infra.group_model import Group
from app.organizations.infra.group_member_model import GroupMember
from app.organizations.core.enums import OrganizationMemberStatus, GroupRole, ScopeLevel
from app.users.infra.user_model import User, UserRole
from app.users.infra.user_repository import UserRepository
from app.auth.core.auth_service import AuthService
from app.auth.infra.token_repository import TokenRepository
from app.environments.infra.environment_model import Environment
from app.environments.infra.environment_repository import EnvironmentRepository
from app.applications.infra.application_model import Application
from app.applications.infra.application_repository import ApplicationRepository


@pytest.fixture
def org_member_user(test_db):
    """Create a user with ORG_MEMBER role."""
    user_repository = UserRepository(test_db)
    auth_service = AuthService(user_repository, TokenRepository(test_db))

    user = User(
        email="orgmember@test.com",
        hashed_password=auth_service.get_password_hash("orgmember123"),
        full_name="Org Member User",
        role=UserRole.USER.value,
        is_active=True
    )

    user = user_repository.create(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def env_maintainer_user(test_db):
    """Create a user with ENV_MAINTAINER role."""
    user_repository = UserRepository(test_db)
    auth_service = AuthService(user_repository, TokenRepository(test_db))

    user = User(
        email="envmaintainer@test.com",
        hashed_password=auth_service.get_password_hash("envmaintainer123"),
        full_name="Env Maintainer User",
        role=UserRole.USER.value,
        is_active=True
    )

    user = user_repository.create(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def env_operator_user(test_db):
    """Create a user with ENV_OPERATOR role."""
    user_repository = UserRepository(test_db)
    auth_service = AuthService(user_repository, TokenRepository(test_db))

    user = User(
        email="envoperator@test.com",
        hashed_password=auth_service.get_password_hash("envoperator123"),
        full_name="Env Operator User",
        role=UserRole.USER.value,
        is_active=True
    )

    user = user_repository.create(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def env_viewer_user(test_db):
    """Create a user with ENV_VIEWER role."""
    user_repository = UserRepository(test_db)
    auth_service = AuthService(user_repository, TokenRepository(test_db))

    user = User(
        email="envviewer@test.com",
        hashed_password=auth_service.get_password_hash("envviewer123"),
        full_name="Env Viewer User",
        role=UserRole.USER.value,
        is_active=True
    )

    user = user_repository.create(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def no_permission_user(test_db):
    """Create a user with no permissions."""
    user_repository = UserRepository(test_db)
    auth_service = AuthService(user_repository, TokenRepository(test_db))

    user = User(
        email="noperm@test.com",
        hashed_password=auth_service.get_password_hash("noperm123"),
        full_name="No Permission User",
        role=UserRole.USER.value,
        is_active=True
    )

    user = user_repository.create(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def permission_test_organization(test_db, admin_user):
    """Create an organization for permission testing."""
    organization_repo = OrganizationRepository(test_db)
    organization = Organization(
        name="permission-test-org",
        owner_user_id=admin_user.id
    )
    organization = organization_repo.create(organization)
    test_db.commit()
    test_db.refresh(organization)
    
    # Create organization member for admin_user (owner)
    org_member_admin = OrganizationMember(
        organization_id=organization.id,
        user_id=admin_user.id,
        is_owner=True,
        status=OrganizationMemberStatus.ACTIVE
    )
    test_db.add(org_member_admin)
    test_db.commit()
    test_db.refresh(org_member_admin)
    
    return organization


@pytest.fixture
def permission_test_environment(test_db, permission_test_organization, admin_user):
    """Create an environment for permission testing."""
    env_repo = EnvironmentRepository(test_db)
    environment = Environment(
        name="permission-test-env",
        organization_id=permission_test_organization.id
    )
    environment = env_repo.create(environment)
    test_db.commit()
    test_db.refresh(environment)
    
    return environment


@pytest.fixture
def org_member_token(client, org_member_user):
    """Get authentication token for org member user."""
    response = client.post(
        "/auth/login",
        json={"email": "orgmember@test.com", "password": "orgmember123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def env_maintainer_token(client, env_maintainer_user):
    """Get authentication token for env maintainer user."""
    response = client.post(
        "/auth/login",
        json={"email": "envmaintainer@test.com", "password": "envmaintainer123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def env_operator_token(client, env_operator_user):
    """Get authentication token for env operator user."""
    response = client.post(
        "/auth/login",
        json={"email": "envoperator@test.com", "password": "envoperator123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def env_viewer_token(client, env_viewer_user):
    """Get authentication token for env viewer user."""
    response = client.post(
        "/auth/login",
        json={"email": "envviewer@test.com", "password": "envviewer123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def no_permission_token(client, no_permission_user):
    """Get authentication token for user with no permissions."""
    response = client.post(
        "/auth/login",
        json={"email": "noperm@test.com", "password": "noperm123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def org_member_setup(
    test_db, permission_test_organization, org_member_user
):
    """Set up org member user with ORG_MEMBER role."""
    # Create organization member
    org_member = OrganizationMember(
        organization_id=permission_test_organization.id,
        user_id=org_member_user.id,
        is_owner=False,
        status=OrganizationMemberStatus.ACTIVE
    )
    test_db.add(org_member)
    test_db.commit()
    test_db.refresh(org_member)
    
    # Create ORG_MEMBER group
    org_member_group = Group(
        uuid=uuid4(),
        organization_id=permission_test_organization.id,
        name="Organization Members",
        description="Organization members",
        scope_level=ScopeLevel.ORG,
        environment_id=None,
        application_id=None,
        role=GroupRole.ORG_MEMBER,
        is_default=False
    )
    test_db.add(org_member_group)
    test_db.flush()
    test_db.refresh(org_member_group)
    
    # Add user to group
    group_member = GroupMember(
        uuid=uuid4(),
        group_id=org_member_group.id,
        organization_member_id=org_member.id
    )
    test_db.add(group_member)
    test_db.commit()
    
    return org_member


@pytest.fixture
def env_maintainer_setup(
    test_db, permission_test_organization, permission_test_environment, env_maintainer_user
):
    """Set up env maintainer user with ENV_MAINTAINER role."""
    # Create organization member
    org_member = OrganizationMember(
        organization_id=permission_test_organization.id,
        user_id=env_maintainer_user.id,
        is_owner=False,
        status=OrganizationMemberStatus.ACTIVE
    )
    test_db.add(org_member)
    test_db.commit()
    test_db.refresh(org_member)
    
    # Create ENV_MAINTAINER group
    env_maintainer_group = Group(
        uuid=uuid4(),
        organization_id=permission_test_organization.id,
        name="Environment Maintainers",
        description="Environment maintainers",
        scope_level=ScopeLevel.ENVIRONMENT,
        environment_id=permission_test_environment.id,
        application_id=None,
        role=GroupRole.ENV_MAINTAINER,
        is_default=False
    )
    test_db.add(env_maintainer_group)
    test_db.flush()
    test_db.refresh(env_maintainer_group)
    
    # Add user to group
    group_member = GroupMember(
        uuid=uuid4(),
        group_id=env_maintainer_group.id,
        organization_member_id=org_member.id
    )
    test_db.add(group_member)
    test_db.commit()
    
    return org_member


@pytest.fixture
def env_operator_setup(
    test_db, permission_test_organization, permission_test_environment, env_operator_user
):
    """Set up env operator user with ENV_OPERATOR role."""
    # Create organization member
    org_member = OrganizationMember(
        organization_id=permission_test_organization.id,
        user_id=env_operator_user.id,
        is_owner=False,
        status=OrganizationMemberStatus.ACTIVE
    )
    test_db.add(org_member)
    test_db.commit()
    test_db.refresh(org_member)
    
    # Create ENV_OPERATOR group
    env_operator_group = Group(
        uuid=uuid4(),
        organization_id=permission_test_organization.id,
        name="Environment Operators",
        description="Environment operators",
        scope_level=ScopeLevel.ENVIRONMENT,
        environment_id=permission_test_environment.id,
        application_id=None,
        role=GroupRole.ENV_OPERATOR,
        is_default=False
    )
    test_db.add(env_operator_group)
    test_db.flush()
    test_db.refresh(env_operator_group)
    
    # Add user to group
    group_member = GroupMember(
        uuid=uuid4(),
        group_id=env_operator_group.id,
        organization_member_id=org_member.id
    )
    test_db.add(group_member)
    test_db.commit()
    
    return org_member


@pytest.fixture
def env_viewer_setup(
    test_db, permission_test_organization, permission_test_environment, env_viewer_user
):
    """Set up env viewer user with ENV_VIEWER role."""
    # Create organization member
    org_member = OrganizationMember(
        organization_id=permission_test_organization.id,
        user_id=env_viewer_user.id,
        is_owner=False,
        status=OrganizationMemberStatus.ACTIVE
    )
    test_db.add(org_member)
    test_db.commit()
    test_db.refresh(org_member)
    
    # Create ENV_VIEWER group
    env_viewer_group = Group(
        uuid=uuid4(),
        organization_id=permission_test_organization.id,
        name="Environment Viewers",
        description="Environment viewers",
        scope_level=ScopeLevel.ENVIRONMENT,
        environment_id=permission_test_environment.id,
        application_id=None,
        role=GroupRole.ENV_VIEWER,
        is_default=False
    )
    test_db.add(env_viewer_group)
    test_db.flush()
    test_db.refresh(env_viewer_group)
    
    # Add user to group
    group_member = GroupMember(
        uuid=uuid4(),
        group_id=env_viewer_group.id,
        organization_member_id=org_member.id
    )
    test_db.add(group_member)
    test_db.commit()
    
    return org_member


@pytest.fixture
def test_application(test_db, permission_test_organization, permission_test_environment, admin_user, admin_token, client):
    """Create a test application."""
    response = client.post(
        f"/organizations/{permission_test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-app",
            "repository": "https://github.com/example/test-app"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    app_uuid_str = response.json()["uuid"]
    
    # Convert string UUID to UUID object
    from uuid import UUID as UUIDType
    app_uuid = UUIDType(app_uuid_str)
    
    app_repo = ApplicationRepository(test_db)
    application = app_repo.find_by_uuid(app_uuid)
    return application


@pytest.fixture
def test_instance(test_db, permission_test_organization, permission_test_environment, test_application, admin_token, client):
    """Create a test instance."""
    response = client.post(
        f"/organizations/{permission_test_organization.uuid}/instances/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "application_uuid": str(test_application.uuid),
            "environment_uuid": str(permission_test_environment.uuid),
            "image": "nginx",
            "version": "1.0.0"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    instance_uuid = response.json()["uuid"]
    return instance_uuid


class TestInstanceCreatePermissions:
    """Test permissions for POST /instances (create)."""

    def test_org_member_can_create_instance(
        self, client, org_member_token, permission_test_organization,
        permission_test_environment, test_application, org_member_setup
    ):
        """Test that ORG_MEMBER can create instances."""
        response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {org_member_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        assert "uuid" in response.json()

    def test_env_maintainer_can_create_instance(
        self, client, env_maintainer_token, permission_test_organization,
        permission_test_environment, test_application, env_maintainer_setup
    ):
        """Test that ENV_MAINTAINER can create instances."""
        response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {env_maintainer_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        assert "uuid" in response.json()

    def test_env_operator_cannot_create_instance(
        self, client, env_operator_token, permission_test_organization,
        permission_test_environment, test_application, env_operator_setup
    ):
        """Test that ENV_OPERATOR cannot create instances."""
        response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {env_operator_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_env_viewer_cannot_create_instance(
        self, client, env_viewer_token, permission_test_organization,
        permission_test_environment, test_application, env_viewer_setup
    ):
        """Test that ENV_VIEWER cannot create instances."""
        response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {env_viewer_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_no_permission_user_cannot_create_instance(
        self, client, no_permission_token, permission_test_organization,
        permission_test_environment, test_application
    ):
        """Test that user with no permissions cannot create instances."""
        response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {no_permission_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestInstanceUpdatePermissions:
    """Test permissions for PUT /instances/{id} (operate/update)."""

    def test_org_member_can_update_instance(
        self, client, org_member_token, permission_test_organization,
        test_instance, org_member_setup
    ):
        """Test that ORG_MEMBER can update instances."""
        response = client.put(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {org_member_token}"},
            json={
                "image": "nginx",
                "version": "1.0.1"
            }
        )

        assert response.status_code == status.HTTP_200_OK

    def test_env_maintainer_can_update_instance(
        self, client, env_maintainer_token, permission_test_organization,
        test_instance, env_maintainer_setup
    ):
        """Test that ENV_MAINTAINER can update instances."""
        response = client.put(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {env_maintainer_token}"},
            json={
                "image": "nginx",
                "version": "1.0.1"
            }
        )

        assert response.status_code == status.HTTP_200_OK

    def test_env_operator_can_update_instance(
        self, client, env_operator_token, permission_test_organization,
        test_instance, env_operator_setup
    ):
        """Test that ENV_OPERATOR can update instances."""
        response = client.put(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {env_operator_token}"},
            json={
                "image": "nginx",
                "version": "1.0.1"
            }
        )

        assert response.status_code == status.HTTP_200_OK

    def test_env_viewer_cannot_update_instance(
        self, client, env_viewer_token, permission_test_organization,
        test_instance, env_viewer_setup
    ):
        """Test that ENV_VIEWER cannot update instances."""
        response = client.put(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {env_viewer_token}"},
            json={
                "image": "nginx",
                "version": "1.0.1"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_no_permission_user_cannot_update_instance(
        self, client, no_permission_token, permission_test_organization,
        test_instance
    ):
        """Test that user with no permissions cannot update instances."""
        response = client.put(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {no_permission_token}"},
            json={
                "image": "nginx",
                "version": "1.0.1"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestInstanceDeletePermissions:
    """Test permissions for DELETE /instances/{id}."""

    def test_org_member_can_delete_instance(
        self, client, org_member_token, permission_test_organization,
        permission_test_environment, test_application, admin_token, org_member_setup
    ):
        """Test that ORG_MEMBER can delete instances."""
        # Create instance first (using admin token)
        create_response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        instance_uuid = create_response.json()["uuid"]

        # Delete instance
        response = client.delete(
            f"/organizations/{permission_test_organization.uuid}/instances/{instance_uuid}",
            headers={"Authorization": f"Bearer {org_member_token}"}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_env_maintainer_cannot_delete_instance(
        self, client, env_maintainer_token, permission_test_organization,
        permission_test_environment, test_application, admin_token, env_maintainer_setup
    ):
        """Test that ENV_MAINTAINER cannot delete instances (only ORG_MEMBER can)."""
        # Create instance first (using admin token)
        create_response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        instance_uuid = create_response.json()["uuid"]

        # Try to delete instance
        response = client.delete(
            f"/organizations/{permission_test_organization.uuid}/instances/{instance_uuid}",
            headers={"Authorization": f"Bearer {env_maintainer_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_env_operator_cannot_delete_instance(
        self, client, env_operator_token, permission_test_organization,
        permission_test_environment, test_application, admin_token, env_operator_setup
    ):
        """Test that ENV_OPERATOR cannot delete instances."""
        # Create instance first (using admin token)
        create_response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        instance_uuid = create_response.json()["uuid"]

        # Try to delete instance
        response = client.delete(
            f"/organizations/{permission_test_organization.uuid}/instances/{instance_uuid}",
            headers={"Authorization": f"Bearer {env_operator_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_env_viewer_cannot_delete_instance(
        self, client, env_viewer_token, permission_test_organization,
        permission_test_environment, test_application, admin_token, env_viewer_setup
    ):
        """Test that ENV_VIEWER cannot delete instances."""
        # Create instance first (using admin token)
        create_response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        instance_uuid = create_response.json()["uuid"]

        # Try to delete instance
        response = client.delete(
            f"/organizations/{permission_test_organization.uuid}/instances/{instance_uuid}",
            headers={"Authorization": f"Bearer {env_viewer_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_no_permission_user_cannot_delete_instance(
        self, client, no_permission_token, permission_test_organization,
        permission_test_environment, test_application, admin_token
    ):
        """Test that user with no permissions cannot delete instances."""
        # Create instance first (using admin token)
        create_response = client.post(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "application_uuid": str(test_application.uuid),
                "environment_uuid": str(permission_test_environment.uuid),
                "image": "nginx",
                "version": "1.0.0"
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        instance_uuid = create_response.json()["uuid"]

        # Try to delete instance
        response = client.delete(
            f"/organizations/{permission_test_organization.uuid}/instances/{instance_uuid}",
            headers={"Authorization": f"Bearer {no_permission_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestInstanceViewPermissions:
    """Test permissions for GET /instances and GET /instances/{id} (viewer+)."""

    def test_org_member_can_list_instances(
        self, client, org_member_token, permission_test_organization,
        test_instance, org_member_setup
    ):
        """Test that ORG_MEMBER can list instances."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {org_member_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

    def test_org_member_can_get_instance(
        self, client, org_member_token, permission_test_organization,
        test_instance, org_member_setup
    ):
        """Test that ORG_MEMBER can get instance details."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {org_member_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["uuid"] == str(test_instance)

    def test_env_maintainer_can_list_instances(
        self, client, env_maintainer_token, permission_test_organization,
        test_instance, env_maintainer_setup
    ):
        """Test that ENV_MAINTAINER can list instances."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {env_maintainer_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_env_maintainer_can_get_instance(
        self, client, env_maintainer_token, permission_test_organization,
        test_instance, env_maintainer_setup
    ):
        """Test that ENV_MAINTAINER can get instance details."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {env_maintainer_token}"}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_env_operator_can_list_instances(
        self, client, env_operator_token, permission_test_organization,
        test_instance, env_operator_setup
    ):
        """Test that ENV_OPERATOR can list instances."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {env_operator_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_env_operator_can_get_instance(
        self, client, env_operator_token, permission_test_organization,
        test_instance, env_operator_setup
    ):
        """Test that ENV_OPERATOR can get instance details."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {env_operator_token}"}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_env_viewer_can_list_instances(
        self, client, env_viewer_token, permission_test_organization,
        test_instance, env_viewer_setup
    ):
        """Test that ENV_VIEWER can list instances."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {env_viewer_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_env_viewer_can_get_instance(
        self, client, env_viewer_token, permission_test_organization,
        test_instance, env_viewer_setup
    ):
        """Test that ENV_VIEWER can get instance details."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {env_viewer_token}"}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_no_permission_user_cannot_list_instances(
        self, client, no_permission_token, permission_test_organization
    ):
        """Test that user with no permissions cannot list instances."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/",
            headers={"Authorization": f"Bearer {no_permission_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_no_permission_user_cannot_get_instance(
        self, client, no_permission_token, permission_test_organization,
        test_instance
    ):
        """Test that user with no permissions cannot get instance details."""
        response = client.get(
            f"/organizations/{permission_test_organization.uuid}/instances/{test_instance}",
            headers={"Authorization": f"Bearer {no_permission_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
