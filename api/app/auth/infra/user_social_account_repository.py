from sqlalchemy.orm import Session
from typing import Optional, List

from app.auth.infra.user_social_account_model import UserSocialAccount


class UserSocialAccountRepository:
    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_provider_and_provider_user_id(
        self, identity_provider_id: int, provider_user_id: str
    ) -> Optional[UserSocialAccount]:
        return (
            self.db.query(UserSocialAccount)
            .filter(
                UserSocialAccount.identity_provider_id == identity_provider_id,
                UserSocialAccount.provider_user_id == provider_user_id,
            )
            .first()
        )

    def find_by_user_id(self, user_id: int) -> List[UserSocialAccount]:
        return (
            self.db.query(UserSocialAccount)
            .filter(UserSocialAccount.user_id == user_id)
            .all()
        )

    def create(self, account: UserSocialAccount) -> UserSocialAccount:
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def delete(self, account: UserSocialAccount) -> None:
        self.db.delete(account)
        self.db.commit()

    def delete_by_user_id(self, user_id: int) -> None:
        """Delete all social accounts for the given user (e.g. before deleting the user)."""
        self.db.query(UserSocialAccount).filter(
            UserSocialAccount.user_id == user_id
        ).delete(synchronize_session=False)
        self.db.commit()
