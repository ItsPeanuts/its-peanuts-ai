# backend/models/__init__.py

"""
Model package bootstrap.

Doelen:
1) Zorg dat alle modelmodules geladen zijn (zodat Base.metadata alle tabellen kent).
2) Zorg dat routers veilig kunnen refereren aan `models.Candidate`, `models.Employer`, etc.
3) Crash niet op duplicate-table issues tijdens import (tijdelijke mitigatie).
"""

from __future__ import annotations

import importlib
import pkgutil
import sys
from typing import Any

from sqlalchemy.exc import InvalidRequestError

from backend.database import Base  # noqa: F401


def _autoload_model_modules() -> None:
    package_name = __name__  # "backend.models"
    package = importlib.import_module(package_name)

    for module_info in pkgutil.iter_modules(package.__path__):
        mod_name = module_info.name
        if mod_name.startswith("_"):
            continue

        full_name = f"{package_name}.{mod_name}"

        # Als al geladen, sla over
        if full_name in sys.modules:
            continue

        try:
            importlib.import_module(full_name)
        except InvalidRequestError as e:
            # Mitigatie: duplicate table definitions laten we de app niet killen.
            if "already defined for this MetaData instance" in str(e):
                continue
            raise


def _export_known_models() -> None:
    """
    Exporteer bekende model classes als attributes op `backend.models`,
    zodat code zoals `models.Candidate` blijft werken.
    """

    exports: dict[str, tuple[str, str]] = {
        # attr_name: (module_name, class_name)
        "Candidate": ("candidate", "Candidate"),
        "Employer": ("employer", "Employer"),
        "Vacancy": ("vacancy", "Vacancy"),
        "CandidateCV": ("cv", "CandidateCV"),
        "VacancyDoc": ("vacancy_doc", "VacancyDoc"),
        "Conversation": ("conversation", "Conversation"),
    }

    for attr_name, (mod, cls) in exports.items():
        try:
            m = importlib.import_module(f"{__name__}.{mod}")
            obj: Any = getattr(m, cls)
            globals()[attr_name] = obj
        except Exception:
            # Niet ieder model hoeft al te bestaan in fase B.
            # Belangrijk: Candidate moet wél bestaan; die fixen we in candidate.py als hij ontbreekt.
            continue


_autoload_model_modules()
_export_known_models()





