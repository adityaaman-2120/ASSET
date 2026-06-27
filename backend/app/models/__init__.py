"""ORM models for ASSETS.

Importing every model here ensures they are all registered on
``Base.metadata`` (used by Alembic autogenerate and relationship resolution).
"""
from app.models.analysis_cache import AnalysisCache
from app.models.holding import Holding
from app.models.portfolio import PortfolioStatus, Portfolio, RiskLevel
from app.models.user import User

__all__ = [
    "User",
    "Portfolio",
    "RiskLevel",
    "PortfolioStatus",
    "Holding",
    "AnalysisCache",
]
