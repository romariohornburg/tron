from sqlalchemy.orm import Session
from sqlalchemy import func
from app.applications.infra.application_model import Application as ApplicationModel
from app.instances.infra.instance_model import Instance as InstanceModel
from app.webapps.infra.application_component_model import (
    ApplicationComponent as ApplicationComponentModel,
)
from app.clusters.infra.cluster_model import Cluster as ClusterModel
from app.environments.infra.environment_model import Environment as EnvironmentModel
from app.shared.infra.cluster_instance_model import (
    ClusterInstance as ClusterInstanceModel,
)


class DashboardRepository:
    """Repository for Dashboard database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def count_applications(self, organization_id: int | None = None) -> int:
        """Count total applications. Optionally filter by organization_id."""
        query = self.db.query(func.count(ApplicationModel.id))
        if organization_id is not None:
            query = query.filter(ApplicationModel.organization_id == organization_id)
        return query.scalar() or 0

    def count_instances(self, organization_id: int | None = None) -> int:
        """Count total instances. Optionally filter by organization_id through application or environment."""
        query = self.db.query(func.count(InstanceModel.id))
        if organization_id is not None:
            query = query.join(
                ApplicationModel, InstanceModel.application_id == ApplicationModel.id
            ).filter(ApplicationModel.organization_id == organization_id)
        return query.scalar() or 0

    def count_total_components(self, organization_id: int | None = None) -> int:
        """Count total components. Optionally filter by organization_id through instance -> application."""
        query = self.db.query(func.count(ApplicationComponentModel.id))
        if organization_id is not None:
            query = (
                query.join(
                    InstanceModel,
                    ApplicationComponentModel.instance_id == InstanceModel.id,
                )
                .join(
                    ApplicationModel,
                    InstanceModel.application_id == ApplicationModel.id,
                )
                .filter(ApplicationModel.organization_id == organization_id)
            )
        return query.scalar() or 0

    def count_components_by_type(
        self, component_type: str, organization_id: int | None = None
    ) -> int:
        """Count components by type. Optionally filter by organization_id."""
        query = self.db.query(func.count(ApplicationComponentModel.id)).filter(
            ApplicationComponentModel.type == component_type
        )
        if organization_id is not None:
            query = (
                query.join(
                    InstanceModel,
                    ApplicationComponentModel.instance_id == InstanceModel.id,
                )
                .join(
                    ApplicationModel,
                    InstanceModel.application_id == ApplicationModel.id,
                )
                .filter(ApplicationModel.organization_id == organization_id)
            )
        return query.scalar() or 0

    def count_enabled_components(self, organization_id: int | None = None) -> int:
        """Count enabled components. Optionally filter by organization_id."""
        query = self.db.query(func.count(ApplicationComponentModel.id)).filter(
            ApplicationComponentModel.enabled.is_(True)
        )
        if organization_id is not None:
            query = (
                query.join(
                    InstanceModel,
                    ApplicationComponentModel.instance_id == InstanceModel.id,
                )
                .join(
                    ApplicationModel,
                    InstanceModel.application_id == ApplicationModel.id,
                )
                .filter(ApplicationModel.organization_id == organization_id)
            )
        return query.scalar() or 0

    def count_disabled_components(self, organization_id: int | None = None) -> int:
        """Count disabled components. Optionally filter by organization_id."""
        query = self.db.query(func.count(ApplicationComponentModel.id)).filter(
            ApplicationComponentModel.enabled.is_(False)
        )
        if organization_id is not None:
            query = (
                query.join(
                    InstanceModel,
                    ApplicationComponentModel.instance_id == InstanceModel.id,
                )
                .join(
                    ApplicationModel,
                    InstanceModel.application_id == ApplicationModel.id,
                )
                .filter(ApplicationModel.organization_id == organization_id)
            )
        return query.scalar() or 0

    def count_clusters(self, organization_id: int | None = None) -> int:
        """Count total clusters. Optionally filter by organization_id through environment."""
        query = self.db.query(func.count(ClusterModel.id))
        if organization_id is not None:
            query = query.join(
                EnvironmentModel, ClusterModel.environment_id == EnvironmentModel.id
            ).filter(EnvironmentModel.organization_id == organization_id)
        return query.scalar() or 0

    def count_environments(self, organization_id: int | None = None) -> int:
        """Count total environments. Optionally filter by organization_id."""
        query = self.db.query(func.count(EnvironmentModel.id))
        if organization_id is not None:
            query = query.filter(EnvironmentModel.organization_id == organization_id)
        return query.scalar() or 0

    def get_components_by_environment(self, organization_id: int | None = None) -> list:
        """Get components count grouped by environment. Optionally filter by organization_id."""
        query = (
            self.db.query(
                EnvironmentModel.name, func.count(ApplicationComponentModel.id)
            )
            .join(InstanceModel, InstanceModel.environment_id == EnvironmentModel.id)
            .join(
                ApplicationComponentModel,
                ApplicationComponentModel.instance_id == InstanceModel.id,
            )
        )
        if organization_id is not None:
            query = query.filter(EnvironmentModel.organization_id == organization_id)
        return query.group_by(EnvironmentModel.name).all()

    def get_components_by_cluster(self, organization_id: int | None = None) -> list:
        """Get components count grouped by cluster. Optionally filter by organization_id through environment."""
        query = (
            self.db.query(ClusterModel.name, func.count(ApplicationComponentModel.id))
            .join(
                ClusterInstanceModel, ClusterInstanceModel.cluster_id == ClusterModel.id
            )
            .join(
                ApplicationComponentModel,
                ApplicationComponentModel.id
                == ClusterInstanceModel.application_component_id,
            )
        )
        if organization_id is not None:
            query = query.join(
                EnvironmentModel, ClusterModel.environment_id == EnvironmentModel.id
            ).filter(EnvironmentModel.organization_id == organization_id)
        return query.group_by(ClusterModel.name).all()

    def find_all_applications_by_organization(self, organization_id: int) -> list:
        """Find all applications for an organization."""
        return (
            self.db.query(ApplicationModel)
            .filter(ApplicationModel.organization_id == organization_id)
            .all()
        )

    def count_instances_by_application_ids(self, application_ids: list[int]) -> int:
        """Count instances for specific application IDs."""
        if not application_ids:
            return 0
        return (
            self.db.query(func.count(InstanceModel.id))
            .filter(InstanceModel.application_id.in_(application_ids))
            .scalar()
            or 0
        )

    def count_components_by_application_ids(self, application_ids: list[int]) -> int:
        """Count total components for specific application IDs."""
        if not application_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(InstanceModel.application_id.in_(application_ids))
            .scalar()
            or 0
        )

    def count_components_by_type_and_application_ids(
        self, component_type: str, application_ids: list[int]
    ) -> int:
        """Count components by type for specific application IDs."""
        if not application_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                ApplicationComponentModel.type == component_type,
                InstanceModel.application_id.in_(application_ids),
            )
            .scalar()
            or 0
        )

    def count_enabled_components_by_application_ids(
        self, application_ids: list[int]
    ) -> int:
        """Count enabled components for specific application IDs."""
        if not application_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                ApplicationComponentModel.enabled.is_(True),
                InstanceModel.application_id.in_(application_ids),
            )
            .scalar()
            or 0
        )

    def count_disabled_components_by_application_ids(
        self, application_ids: list[int]
    ) -> int:
        """Count disabled components for specific application IDs."""
        if not application_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                ApplicationComponentModel.enabled.is_(False),
                InstanceModel.application_id.in_(application_ids),
            )
            .scalar()
            or 0
        )

    def get_environment_ids_by_application_ids(
        self, application_ids: list[int]
    ) -> list[int]:
        """Get distinct environment IDs for specific application IDs."""
        if not application_ids:
            return []
        environment_ids = (
            self.db.query(InstanceModel.environment_id)
            .filter(InstanceModel.application_id.in_(application_ids))
            .distinct()
            .all()
        )
        return [eid[0] for eid in environment_ids if eid[0] is not None]

    def count_clusters_by_environment_ids(self, environment_ids: list[int]) -> int:
        """Count clusters for specific environment IDs."""
        if not environment_ids:
            return 0
        return (
            self.db.query(func.count(ClusterModel.id))
            .filter(ClusterModel.environment_id.in_(environment_ids))
            .scalar()
            or 0
        )

    def get_components_by_environment_for_application_ids(
        self, application_ids: list[int], environment_ids: list[int]
    ) -> list:
        """Get components count grouped by environment for specific application IDs."""
        if not application_ids or not environment_ids:
            return []
        return (
            self.db.query(
                EnvironmentModel.name, func.count(ApplicationComponentModel.id)
            )
            .join(InstanceModel, InstanceModel.environment_id == EnvironmentModel.id)
            .join(
                ApplicationComponentModel,
                ApplicationComponentModel.instance_id == InstanceModel.id,
            )
            .filter(
                InstanceModel.application_id.in_(application_ids),
                EnvironmentModel.id.in_(environment_ids),
            )
            .group_by(EnvironmentModel.name)
            .all()
        )

    def get_components_by_cluster_for_application_ids(
        self, application_ids: list[int], environment_ids: list[int]
    ) -> list:
        """Get components count grouped by cluster for specific application IDs."""
        if not application_ids or not environment_ids:
            return []
        return (
            self.db.query(ClusterModel.name, func.count(ApplicationComponentModel.id))
            .join(
                ClusterInstanceModel, ClusterInstanceModel.cluster_id == ClusterModel.id
            )
            .join(
                ApplicationComponentModel,
                ApplicationComponentModel.id
                == ClusterInstanceModel.application_component_id,
            )
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                InstanceModel.application_id.in_(application_ids),
                ClusterModel.environment_id.in_(environment_ids),
            )
            .group_by(ClusterModel.name)
            .all()
        )

    def count_instances_by_application_ids_and_environment_ids(
        self, application_ids: list[int], environment_ids: list[int]
    ) -> int:
        """Count instances for specific application IDs and environment IDs."""
        if not application_ids or not environment_ids:
            return 0
        return (
            self.db.query(func.count(InstanceModel.id))
            .filter(
                InstanceModel.application_id.in_(application_ids),
                InstanceModel.environment_id.in_(environment_ids),
            )
            .scalar()
            or 0
        )

    def count_components_by_application_ids_and_environment_ids(
        self, application_ids: list[int], environment_ids: list[int]
    ) -> int:
        """Count total components for specific application IDs and environment IDs."""
        if not application_ids or not environment_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                InstanceModel.application_id.in_(application_ids),
                InstanceModel.environment_id.in_(environment_ids),
            )
            .scalar()
            or 0
        )

    def count_components_by_type_and_application_ids_and_environment_ids(
        self,
        component_type: str,
        application_ids: list[int],
        environment_ids: list[int],
    ) -> int:
        """Count components by type for specific application IDs and environment IDs."""
        if not application_ids or not environment_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                ApplicationComponentModel.type == component_type,
                InstanceModel.application_id.in_(application_ids),
                InstanceModel.environment_id.in_(environment_ids),
            )
            .scalar()
            or 0
        )

    def count_enabled_components_by_application_ids_and_environment_ids(
        self, application_ids: list[int], environment_ids: list[int]
    ) -> int:
        """Count enabled components for specific application IDs and environment IDs."""
        if not application_ids or not environment_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                ApplicationComponentModel.enabled.is_(True),
                InstanceModel.application_id.in_(application_ids),
                InstanceModel.environment_id.in_(environment_ids),
            )
            .scalar()
            or 0
        )

    def count_disabled_components_by_application_ids_and_environment_ids(
        self, application_ids: list[int], environment_ids: list[int]
    ) -> int:
        """Count disabled components for specific application IDs and environment IDs."""
        if not application_ids or not environment_ids:
            return 0
        return (
            self.db.query(func.count(ApplicationComponentModel.id))
            .join(
                InstanceModel, ApplicationComponentModel.instance_id == InstanceModel.id
            )
            .filter(
                ApplicationComponentModel.enabled.is_(False),
                InstanceModel.application_id.in_(application_ids),
                InstanceModel.environment_id.in_(environment_ids),
            )
            .scalar()
            or 0
        )
