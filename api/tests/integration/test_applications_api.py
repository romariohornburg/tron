"""Integration tests for applications endpoints."""
import pytest
from fastapi import status
from uuid import uuid4


def test_create_application_success(client, admin_token, test_organization):
    """Test successful application creation."""
    response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/test-app"
        }
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "test-application"
    assert data["repository"] == "https://github.com/example/test-app"
    assert "uuid" in data


def test_create_application_requires_authentication(client, test_organization):
    """Test that application creation requires authentication."""
    response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        json={
            "name": "test-application",
            "repository": "https://github.com/example/test-app"
        }
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_application_requires_org_member(client, user_token, test_organization):
    """Test that application creation requires organization membership."""
    response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/test-app"
        }
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_create_application_duplicate_name(client, admin_token, test_organization):
    """Test application creation with duplicate name."""
    # Create first application
    response1 = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/first"
        }
    )
    assert response1.status_code == status.HTTP_200_OK

    # Try to create another with same name
    response2 = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/duplicate"
        }
    )

    assert response2.status_code == status.HTTP_400_BAD_REQUEST


def test_list_applications_success(client, admin_token, test_organization):
    """Test successful application listing."""
    # First create an application
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/test-app"
        }
    )
    assert create_response.status_code == status.HTTP_200_OK

    # Then list applications
    response = client.get(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(app["name"] == "test-application" for app in data)


def test_list_applications_requires_authentication(client, test_organization):
    """Test that listing applications requires authentication."""
    response = client.get(f"/organizations/{test_organization.uuid}/applications/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_applications_filter_by_name(client, admin_token, test_organization):
    """Test that listing applications with name filter returns only matching apps."""
    # Create two applications with distinct names
    for app_name in ("my-foo-app", "my-bar-service"):
        create_resp = client.post(
            f"/organizations/{test_organization.uuid}/applications/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": app_name,
                "repository": "https://github.com/example/test",
            },
        )
        assert create_resp.status_code == status.HTTP_200_OK

    base_url = f"/organizations/{test_organization.uuid}/applications/"
    headers = {"Authorization": f"Bearer {admin_token}"}

    # List without filter
    all_resp = client.get(base_url, headers=headers)
    assert all_resp.status_code == status.HTTP_200_OK
    all_data = all_resp.json()
    assert isinstance(all_data, list)
    assert len(all_data) >= 2

    # Filter by partial name (case-insensitive)
    filtered_resp = client.get(
        base_url, headers=headers, params={"name": "foo"}
    )
    assert filtered_resp.status_code == status.HTTP_200_OK
    filtered_data = filtered_resp.json()
    assert isinstance(filtered_data, list)
    assert all("foo" in app["name"].lower() for app in filtered_data)
    assert len(filtered_data) <= len(all_data)


def test_get_application_success(client, admin_token, test_organization):
    """Test successful application retrieval."""
    # First create an application
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/test-app"
        }
    )
    application_uuid = create_response.json()["uuid"]

    # Then get the application
    response = client.get(
        f"/organizations/{test_organization.uuid}/applications/{application_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "test-application"
    assert data["uuid"] == application_uuid


def test_get_application_not_found(client, admin_token, test_organization):
    """Test getting non-existent application."""
    response = client.get(
        f"/organizations/{test_organization.uuid}/applications/{uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_application_success(client, admin_token, test_organization):
    """Test successful application update."""
    # First create an application
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/original"
        }
    )
    application_uuid = create_response.json()["uuid"]

    # Then update the application
    response = client.put(
        f"/organizations/{test_organization.uuid}/applications/{application_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "updated-application",
            "repository": "https://github.com/example/updated"
        }
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "updated-application"
    assert data["repository"] == "https://github.com/example/updated"


def test_update_application_not_found(client, admin_token, test_organization):
    """Test updating non-existent application."""
    response = client.put(
        f"/organizations/{test_organization.uuid}/applications/{uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "updated-application",
            "repository": "https://github.com/example/updated"
        }
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_application_success(client, admin_token, test_organization):
    """Test successful application deletion."""
    # First create an application
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/test-app"
        }
    )
    application_uuid = create_response.json()["uuid"]

    # Then delete the application
    response = client.delete(
        f"/organizations/{test_organization.uuid}/applications/{application_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_200_OK

    # Verify application is deleted
    get_response = client.get(
        f"/organizations/{test_organization.uuid}/applications/{application_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_application_not_found(client, admin_token, test_organization):
    """Test deleting non-existent application."""
    response = client.delete(
        f"/organizations/{test_organization.uuid}/applications/{uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_application_requires_org_admin(client, admin_token, user_token, test_organization):
    """Test that application deletion requires organization admin."""
    # First create an application as org admin
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/applications/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-application",
            "repository": "https://github.com/example/test-app"
        }
    )
    application_uuid = create_response.json()["uuid"]

    # Try to delete as regular user (not org member)
    response = client.delete(
        f"/organizations/{test_organization.uuid}/applications/{application_uuid}",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
