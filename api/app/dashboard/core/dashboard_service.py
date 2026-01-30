from app.dashboard.infra.dashboard_repository import DashboardRepository
from app.dashboard.api.dashboard_dto import DashboardOverview, ComponentStats


class DashboardService:
    """Business logic for dashboard. No direct database access."""

    def __init__(self, repository: DashboardRepository):
        self.repository = repository

    def get_dashboard_overview(
        self,
        organization_id: int | None = None,
        viewable_application_ids: list[int] | None = None,
        viewable_environment_ids: list[int] | None = None,
    ) -> DashboardOverview:
        """Get dashboard overview with statistics. Optionally filter by organization_id or viewable_application_ids and viewable_environment_ids."""
        self._validate_inputs(
            organization_id, viewable_application_ids, viewable_environment_ids
        )

        if viewable_application_ids is not None:
            return self._get_filtered_dashboard_overview(
                viewable_application_ids, viewable_environment_ids
            )
        return self._get_admin_dashboard_overview(organization_id)

    def _validate_inputs(
        self,
        organization_id: int | None,
        viewable_application_ids: list[int] | None,
        viewable_environment_ids: list[int] | None,
    ) -> None:
        """Validate inputs for get_dashboard_overview."""
        if organization_id is not None and organization_id <= 0:
            raise ValueError("organization_id must be a positive integer")

        if viewable_application_ids is not None:
            if not isinstance(viewable_application_ids, list):
                raise ValueError("viewable_application_ids must be a list")
            if any(not isinstance(id, int) or id <= 0 for id in viewable_application_ids):
                raise ValueError(
                    "viewable_application_ids must contain positive integers"
                )

        if viewable_environment_ids is not None:
            if not isinstance(viewable_environment_ids, list):
                raise ValueError("viewable_environment_ids must be a list")
            if any(
                not isinstance(id, int) or id <= 0 for id in viewable_environment_ids
            ):
                raise ValueError(
                    "viewable_environment_ids must contain positive integers"
                )

    def _get_filtered_dashboard_overview(
        self,
        viewable_application_ids: list[int],
        viewable_environment_ids: list[int] | None,
    ) -> DashboardOverview:
        """Get dashboard overview filtered by viewable applications and environments."""
        if not viewable_application_ids:
            return self._get_empty_dashboard_overview()

        applications_count = len(viewable_application_ids)
        environment_ids = self._get_filtered_environment_ids(
            viewable_application_ids, viewable_environment_ids
        )

        component_stats = self._get_component_stats(
            viewable_application_ids, environment_ids
        )
        instances_count = self._count_instances(
            viewable_application_ids, environment_ids
        )
        clusters_count = (
            self.repository.count_clusters_by_environment_ids(environment_ids)
            if environment_ids
            else 0
        )
        environments_count = len(environment_ids) if environment_ids else 0

        components_by_environment = self._get_components_by_environment(
            viewable_application_ids, environment_ids
        )
        components_by_cluster = self._get_components_by_cluster(
            viewable_application_ids, environment_ids
        )

        return DashboardOverview(
            applications=applications_count,
            instances=instances_count,
            components=component_stats,
            clusters=clusters_count,
            environments=environments_count,
            components_by_environment=components_by_environment,
            components_by_cluster=components_by_cluster,
        )

    def _get_admin_dashboard_overview(
        self, organization_id: int | None
    ) -> DashboardOverview:
        """Get dashboard overview for admin view (all resources in organization)."""
        applications_count = self.repository.count_applications(organization_id)
        instances_count = self.repository.count_instances(organization_id)
        total_components = self.repository.count_total_components(organization_id)
        webapp_count = self.repository.count_components_by_type(
            "webapp", organization_id
        )
        worker_count = self.repository.count_components_by_type(
            "worker", organization_id
        )
        cron_count = self.repository.count_components_by_type(
            "cron", organization_id
        )
        enabled_components = self.repository.count_enabled_components(organization_id)
        disabled_components = self.repository.count_disabled_components(
            organization_id
        )
        clusters_count = self.repository.count_clusters(organization_id)
        environments_count = self.repository.count_environments(organization_id)

        components_by_environment = self._build_components_by_environment_dict(
            organization_id
        )
        components_by_cluster = self._build_components_by_cluster_dict(organization_id)

        return DashboardOverview(
            applications=applications_count,
            instances=instances_count,
            components=ComponentStats(
                total=total_components,
                webapp=webapp_count,
                worker=worker_count,
                cron=cron_count,
                enabled=enabled_components,
                disabled=disabled_components,
            ),
            clusters=clusters_count,
            environments=environments_count,
            components_by_environment=components_by_environment,
            components_by_cluster=components_by_cluster,
        )

    def _get_empty_dashboard_overview(self) -> DashboardOverview:
        """Return empty dashboard overview when user has no permissions."""
        return DashboardOverview(
            applications=0,
            instances=0,
            components=ComponentStats(
                total=0,
                webapp=0,
                worker=0,
                cron=0,
                enabled=0,
                disabled=0,
            ),
            clusters=0,
            environments=0,
            components_by_environment={},
            components_by_cluster={},
        )

    def _get_filtered_environment_ids(
        self,
        viewable_application_ids: list[int],
        viewable_environment_ids: list[int] | None,
    ) -> list[int]:
        """Get filtered environment IDs based on applications and user permissions."""
        all_env_ids = self.repository.get_environment_ids_by_application_ids(
            viewable_application_ids
        )

        if viewable_environment_ids is not None:
            return [eid for eid in all_env_ids if eid in viewable_environment_ids]
        return all_env_ids

    def _count_instances(
        self, application_ids: list[int], environment_ids: list[int] | None
    ) -> int:
        """Count instances for given application and environment IDs."""
        if environment_ids is not None:
            return self.repository.count_instances_by_application_ids_and_environment_ids(
                application_ids, environment_ids
            )
        return self.repository.count_instances_by_application_ids(application_ids)

    def _get_component_stats(
        self, application_ids: list[int], environment_ids: list[int] | None
    ) -> ComponentStats:
        """Get component statistics for given application and environment IDs."""
        if environment_ids is not None:
            total = self.repository.count_components_by_application_ids_and_environment_ids(
                application_ids, environment_ids
            )
            webapp = (
                self.repository.count_components_by_type_and_application_ids_and_environment_ids(
                    "webapp", application_ids, environment_ids
                )
            )
            worker = (
                self.repository.count_components_by_type_and_application_ids_and_environment_ids(
                    "worker", application_ids, environment_ids
                )
            )
            cron = (
                self.repository.count_components_by_type_and_application_ids_and_environment_ids(
                    "cron", application_ids, environment_ids
                )
            )
            enabled = (
                self.repository.count_enabled_components_by_application_ids_and_environment_ids(
                    application_ids, environment_ids
                )
            )
            disabled = (
                self.repository.count_disabled_components_by_application_ids_and_environment_ids(
                    application_ids, environment_ids
                )
            )
        else:
            total = self.repository.count_components_by_application_ids(application_ids)
            webapp = self.repository.count_components_by_type_and_application_ids(
                "webapp", application_ids
            )
            worker = self.repository.count_components_by_type_and_application_ids(
                "worker", application_ids
            )
            cron = self.repository.count_components_by_type_and_application_ids(
                "cron", application_ids
            )
            enabled = self.repository.count_enabled_components_by_application_ids(
                application_ids
            )
            disabled = self.repository.count_disabled_components_by_application_ids(
                application_ids
            )

        return ComponentStats(
            total=total,
            webapp=webapp,
            worker=worker,
            cron=cron,
            enabled=enabled,
            disabled=disabled,
        )

    def _get_components_by_environment(
        self, application_ids: list[int], environment_ids: list[int] | None
    ) -> dict[str, int]:
        """Get components count grouped by environment."""
        if not environment_ids:
            return {}

        environment_components = (
            self.repository.get_components_by_environment_for_application_ids(
                application_ids, environment_ids
            )
        )
        return {env_name: count for env_name, count in environment_components}

    def _get_components_by_cluster(
        self, application_ids: list[int], environment_ids: list[int] | None
    ) -> dict[str, int]:
        """Get components count grouped by cluster."""
        if not environment_ids:
            return {}

        cluster_components = (
            self.repository.get_components_by_cluster_for_application_ids(
                application_ids, environment_ids
            )
        )
        return {cluster_name: count for cluster_name, count in cluster_components}

    def _build_components_by_environment_dict(
        self, organization_id: int | None
    ) -> dict[str, int]:
        """Build components by environment dictionary for admin view."""
        components_by_environment = {}
        environment_components = self.repository.get_components_by_environment(
            organization_id
        )
        for env_name, count in environment_components:
            components_by_environment[env_name] = count
        return components_by_environment

    def _build_components_by_cluster_dict(
        self, organization_id: int | None
    ) -> dict[str, int]:
        """Build components by cluster dictionary for admin view."""
        components_by_cluster = {}
        cluster_components = self.repository.get_components_by_cluster(organization_id)
        for cluster_name, count in cluster_components:
            components_by_cluster[cluster_name] = count
        return components_by_cluster
