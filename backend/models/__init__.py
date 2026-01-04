# backend/models/__init__.py

"""
Auto-load alle SQLAlchemy model modules in deze map.

Waarom:
- Base.metadata.create_all() maakt alleen tabellen aan van modellen die daadwerkelijk
  geïmporteerd zijn.
- Eerder hadden we hier vaste imports (candidate/employer/vacancy etc.) maar jouw repo
  gebruikt andere bestandsnamen, waardoor de app crasht met:
  ModuleNotFoundError: No module named 'backend.models.employer'

Deze aanpak voorkomt dat volledig: hij importeert alle .py bestanden die echt bestaan.
"""

from __future__ import annotations

import importlib
import pkgutil

# Exporteer Base zodat andere modules dit netjes kunnen gebruiken als ze willen
from backend.database import Base  # noqa: F401


def _autoload_model_modules() -> None:
    package_name = __name__  # "backend.models"
    package = importlib.import_module(package_name)

    # importeer alle submodules (alle .py files) in backend/models/
    for module_info in pkgutil.iter_modules(package.__path__):
        mod_name = module_info.name

        # sla private/irrelevante modules over indien nodig
        if mod_name.startswith("_"):
            continue

        importlib.import_module(f"{package_name}.{mod_name}")


_autoload_model_modules()




