# backend/models/__init__.py

"""
Auto-load alle SQLAlchemy model modules in deze map.

Probleem dat we nu oplossen:
- In jouw repo bestaan waarschijnlijk 2 modelmodules die dezelfde table definieren,
  bv. cv.py én candidate_cv.py -> beide maken __tablename__ = "candidate_cvs".
- Als je ze allebei importeert, crasht SQLAlchemy met:
  InvalidRequestError: Table 'candidate_cvs' is already defined ...

Oplossing:
- We importeren alle modelmodules, maar slaan bekende 'duplicate name' modules over
  als er al een 'canonical' module aanwezig is.
"""

from __future__ import annotations

import importlib
import pkgutil
from typing import Set

from backend.database import Base  # noqa: F401


def _resolve_duplicates(mods: Set[str]) -> Set[str]:
    """
    Als beide varianten bestaan, kies 1 canonical module en skip de andere.
    (Dit voorkomt dubbele __tablename__ definities.)
    """
    # CV duplicate: prefer "cv" over "candidate_cv"
    if "cv" in mods and "candidate_cv" in mods:
        mods.remove("candidate_cv")

    # Vacancy duplicate: prefer "vacancy" over "vacancies"
    if "vacancy" in mods and "vacancies" in mods:
        mods.remove("vacancies")

    # Employer duplicate: prefer "employer" over "employers"
    if "employer" in mods and "employers" in mods:
        mods.remove("employers")

    return mods


def _autoload_model_modules() -> None:
    package_name = __name__  # "backend.models"
    package = importlib.import_module(package_name)

    found = {m.name for m in pkgutil.iter_modules(package.__path__) if not m.name.startswith("_")}
    found = _resolve_duplicates(found)

    # Deterministische volgorde
    for mod_name in sorted(found):
        importlib.import_module(f"{package_name}.{mod_name}")


_autoload_model_modules()




