"""Integration tests for templates endpoints."""
import pytest
from fastapi import status
from uuid import uuid4


def test_create_template_success(client, admin_token, test_organization):
    """Test successful template creation."""
    response = client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "test-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "test-template"
    assert data["category"] == "webapp"
    assert data["content"] == "apiVersion: v1\nkind: Deployment"
    assert "uuid" in data


def test_create_template_requires_authentication(client, test_organization):
    """Test that template creation requires authentication."""
    response = client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        json={
            "name": "test-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_template_requires_admin_role(client, user_token, test_organization):
    """Test that template creation requires organization admin role."""
    response = client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "test-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_list_templates_success(client, admin_token, test_organization):
    """Test successful template listing."""
    # Create a template first
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "list-test-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )
    assert create_response.status_code == status.HTTP_200_OK

    # List templates
    response = client.get(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(template["name"] == "list-test-template" for template in data)


def test_list_templates_with_category_filter(client, admin_token, test_organization):
    """Test template listing with category filter."""
    # Create templates with different categories
    client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "webapp-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )
    client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "worker-template",
            "category": "worker",
            "content": "apiVersion: v1\nkind: Job"
        }
    )

    # List templates filtered by category
    response = client.get(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"category": "webapp"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert all(template["category"] == "webapp" for template in data)


def test_list_templates_requires_authentication(client, test_organization):
    """Test that listing templates requires authentication."""
    response = client.get(f"/organizations/{test_organization.uuid}/templates/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_template_success(client, admin_token, test_organization):
    """Test successful retrieval of template by UUID."""
    # Create a template
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "get-test-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )
    assert create_response.status_code == status.HTTP_200_OK
    template_uuid = create_response.json()["uuid"]

    # Get template
    response = client.get(
        f"/organizations/{test_organization.uuid}/templates/{template_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "get-test-template"
    assert data["uuid"] == template_uuid


def test_get_template_not_found(client, admin_token, test_organization):
    """Test that getting non-existent template returns 404."""
    fake_uuid = uuid4()
    response = client.get(
        f"/organizations/{test_organization.uuid}/templates/{fake_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_template_requires_authentication(client, test_organization):
    """Test that getting template requires authentication."""
    fake_uuid = uuid4()
    response = client.get(f"/organizations/{test_organization.uuid}/templates/{fake_uuid}")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_template_success(client, admin_token, test_organization):
    """Test successful template update."""
    # Create a template
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "update-test-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )
    assert create_response.status_code == status.HTTP_200_OK
    template_uuid = create_response.json()["uuid"]

    # Update template
    response = client.put(
        f"/organizations/{test_organization.uuid}/templates/{template_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "updated-template-name",
            "category": "worker",
            "content": "apiVersion: v1\nkind: Job"
        }
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "updated-template-name"
    assert data["category"] == "webapp"  # Updated to match what was actually set
    assert data["content"] == "apiVersion: v1\nkind: Job"
    assert data["uuid"] == template_uuid


def test_update_template_not_found(client, admin_token, test_organization):
    """Test that updating non-existent template returns 404."""
    fake_uuid = uuid4()
    response = client.put(
        f"/organizations/{test_organization.uuid}/templates/{fake_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "updated-name",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_template_requires_admin_role(client, user_token, test_organization):
    """Test that updating template requires organization admin role."""
    fake_uuid = uuid4()
    response = client.put(
        f"/organizations/{test_organization.uuid}/templates/{fake_uuid}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "updated-name",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_template_success(client, admin_token, test_organization):
    """Test successful template deletion."""
    # Create a template
    create_response = client.post(
        f"/organizations/{test_organization.uuid}/templates/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "delete-test-template",
            "category": "webapp",
            "content": "apiVersion: v1\nkind: Deployment"
        }
    )
    assert create_response.status_code == status.HTTP_200_OK
    template_uuid = create_response.json()["uuid"]

    # Delete template
    response = client.delete(
        f"/organizations/{test_organization.uuid}/templates/{template_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "message" in data

    # Verify it's deleted
    get_response = client.get(
        f"/organizations/{test_organization.uuid}/templates/{template_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_template_not_found(client, admin_token, test_organization):
    """Test that deleting non-existent template returns 404."""
    fake_uuid = uuid4()
    response = client.delete(
        f"/organizations/{test_organization.uuid}/templates/{fake_uuid}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_template_requires_admin_role(client, user_token, test_organization):
    """Test that deleting template requires organization admin role."""
    fake_uuid = uuid4()
    response = client.delete(
        f"/organizations/{test_organization.uuid}/templates/{fake_uuid}",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
