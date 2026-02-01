"""Integration tests for multi-tenant isolation.

These tests validate that users cannot access resources from organizations
they don't belong to, ensuring proper tenant isolation.
"""
import pytest
from fastapi import status
from uuid import uuid4


class TestMultiTenantIsolation:
    """Test suite for multi-tenant isolation."""

    def test_user_cannot_access_other_organization_environments_list(
        self, client, user_a_token, user_b_token, organization_a, organization_b
    ):
        """Test that user A cannot list environments from organization B."""
        # User A tries to list environments from organization B
        response = client.get(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_environments_create(
        self, client, user_a_token, organization_b
    ):
        """Test that user A cannot create environments in organization B."""
        response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_a_token}"},
            json={"name": "unauthorized-env"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_environment_get(
        self, client, user_a_token, user_b_token, organization_a, organization_b
    ):
        """Test that user A cannot get an environment from organization B."""
        # User B creates an environment in organization B
        create_response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"name": "org-b-env"}
        )
        assert create_response.status_code == status.HTTP_200_OK
        env_uuid = create_response.json()["uuid"]

        # User A tries to get this environment
        response = client.get(
            f"/organizations/{organization_b.uuid}/environments/{env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_environment_update(
        self, client, user_a_token, user_b_token, organization_b
    ):
        """Test that user A cannot update an environment from organization B."""
        # User B creates an environment in organization B
        create_response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"name": "org-b-env"}
        )
        assert create_response.status_code == status.HTTP_200_OK
        env_uuid = create_response.json()["uuid"]

        # User A tries to update this environment
        response = client.put(
            f"/organizations/{organization_b.uuid}/environments/{env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"},
            json={"name": "hacked-env"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_environment_delete(
        self, client, user_a_token, user_b_token, organization_b
    ):
        """Test that user A cannot delete an environment from organization B."""
        # User B creates an environment in organization B
        create_response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"name": "org-b-env"}
        )
        assert create_response.status_code == status.HTTP_200_OK
        env_uuid = create_response.json()["uuid"]

        # User A tries to delete this environment
        response = client.delete(
            f"/organizations/{organization_b.uuid}/environments/{env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_applications_list(
        self, client, user_a_token, organization_b
    ):
        """Test that user A cannot list applications from organization B."""
        response = client.get(
            f"/organizations/{organization_b.uuid}/applications/",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_applications_create(
        self, client, user_a_token, organization_b
    ):
        """Test that user A cannot create applications in organization B."""
        # User A tries to create an application in organization B
        response = client.post(
            f"/organizations/{organization_b.uuid}/applications/",
            headers={"Authorization": f"Bearer {user_a_token}"},
            json={
                "name": "unauthorized-app",
                "repository": "https://github.com/example/unauthorized-app"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_application_get(
        self, client, user_a_token, user_b_token, organization_b
    ):
        """Test that user A cannot get an application from organization B."""
        # User B creates an application
        create_response = client.post(
            f"/organizations/{organization_b.uuid}/applications/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={
                "name": "org-b-app",
                "repository": "https://github.com/example/org-b-app"
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        app_uuid = create_response.json()["uuid"]

        # User A tries to get this application
        response = client.get(
            f"/organizations/{organization_b.uuid}/applications/{app_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_instances_list(
        self, client, user_a_token, organization_b
    ):
        """Test that user A cannot list instances from organization B."""
        response = client.get(
            f"/organizations/{organization_b.uuid}/instances/",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_clusters_list(
        self, client, user_a_token, user_b_token, organization_b
    ):
        """Test that user A cannot list clusters from organization B."""
        # User B creates an environment
        env_response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"name": "env-for-cluster"}
        )
        assert env_response.status_code == status.HTTP_200_OK
        env_uuid = env_response.json()["uuid"]

        # User A tries to list clusters from organization B
        response = client.get(
            f"/organizations/{organization_b.uuid}/clusters/?environment_uuid={env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_templates_list(
        self, client, user_a_token, organization_b
    ):
        """Test that user A cannot list templates from organization B."""
        response = client.get(
            f"/organizations/{organization_b.uuid}/templates/",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_templates_create(
        self, client, user_a_token, organization_b
    ):
        """Test that user A cannot create templates in organization B."""
        response = client.post(
            f"/organizations/{organization_b.uuid}/templates/",
            headers={"Authorization": f"Bearer {user_a_token}"},
            json={
                "name": "unauthorized-template",
                "description": "Should not be created"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_webapps_list(
        self, client, user_a_token, user_b_token, organization_b
    ):
        """Test that user A cannot list webapps from organization B."""
        # User B creates an environment
        env_response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"name": "env-for-webapp"}
        )
        assert env_response.status_code == status.HTTP_200_OK
        env_uuid = env_response.json()["uuid"]

        # User A tries to list webapps from organization B
        response = client.get(
            f"/organizations/{organization_b.uuid}/application_components/webapp/?environment_uuid={env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_workers_list(
        self, client, user_a_token, user_b_token, organization_b
    ):
        """Test that user A cannot list workers from organization B."""
        # User B creates an environment
        env_response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"name": "env-for-worker"}
        )
        assert env_response.status_code == status.HTTP_200_OK
        env_uuid = env_response.json()["uuid"]

        # User A tries to list workers from organization B
        response = client.get(
            f"/organizations/{organization_b.uuid}/application_components/worker/?environment_uuid={env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_cannot_access_other_organization_crons_list(
        self, client, user_a_token, user_b_token, organization_b
    ):
        """Test that user A cannot list crons from organization B."""
        # User B creates an environment
        env_response = client.post(
            f"/organizations/{organization_b.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"name": "env-for-cron"}
        )
        assert env_response.status_code == status.HTTP_200_OK
        env_uuid = env_response.json()["uuid"]

        # User A tries to list crons from organization B
        response = client.get(
            f"/organizations/{organization_b.uuid}/application_components/cron/?environment_uuid={env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_can_access_own_organization_resources(
        self, client, user_a_token, organization_a
    ):
        """Test that user A can access resources from their own organization."""
        # User A creates an environment in their own organization
        create_response = client.post(
            f"/organizations/{organization_a.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_a_token}"},
            json={"name": "my-env"}
        )

        assert create_response.status_code == status.HTTP_200_OK
        env_uuid = create_response.json()["uuid"]

        # User A can list environments
        list_response = client.get(
            f"/organizations/{organization_a.uuid}/environments/",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )
        assert list_response.status_code == status.HTTP_200_OK
        assert any(env["uuid"] == env_uuid for env in list_response.json())

        # User A can get the environment
        get_response = client.get(
            f"/organizations/{organization_a.uuid}/environments/{env_uuid}",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["uuid"] == env_uuid

    def test_user_cannot_access_nonexistent_organization(
        self, client, user_a_token
    ):
        """Test that user A cannot access a non-existent organization."""
        fake_org_uuid = uuid4()
        response = client.get(
            f"/organizations/{fake_org_uuid}/environments/",
            headers={"Authorization": f"Bearer {user_a_token}"}
        )

        # Should return 404 (not 403) because the user doesn't have access
        # The organization might exist but user doesn't have permission
        # or it doesn't exist - in both cases, 404 is appropriate
        assert response.status_code == status.HTTP_404_NOT_FOUND
