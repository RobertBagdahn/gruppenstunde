"""Starter catalog of common recipe materials (devices and consumables)."""

from typing import TypedDict


class SeedMaterial(TypedDict):
    name: str
    is_consumable: bool
    category: str
    package_size: float | None


SEED_MATERIALS: list[SeedMaterial] = [
    # Devices (not consumed)
    {"name": "Backofen", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Herd", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Topf", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Pfanne", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Auflaufform", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Backblech", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Rührschüssel", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Schneidebrett", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Messer", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Pürierstab", "is_consumable": False, "category": "kitchen", "package_size": None},
    {"name": "Feuerstelle", "is_consumable": False, "category": "outdoor", "package_size": None},
    {"name": "Dutch Oven", "is_consumable": False, "category": "outdoor", "package_size": None},
    {"name": "Grill", "is_consumable": False, "category": "outdoor", "package_size": None},
    # Consumables
    {"name": "Pappteller", "is_consumable": True, "category": "kitchen", "package_size": 50},
    {"name": "Pappbecher", "is_consumable": True, "category": "kitchen", "package_size": 50},
    {"name": "Papierschiffchen", "is_consumable": True, "category": "kitchen", "package_size": 100},
    {"name": "Schaschlikspieße", "is_consumable": True, "category": "kitchen", "package_size": 100},
    {"name": "Zahnstocher", "is_consumable": True, "category": "kitchen", "package_size": 500},
    {"name": "Servietten", "is_consumable": True, "category": "kitchen", "package_size": 100},
    {"name": "Backpapier", "is_consumable": True, "category": "kitchen", "package_size": None},
    {"name": "Alufolie", "is_consumable": True, "category": "kitchen", "package_size": None},
    {"name": "Muffinförmchen", "is_consumable": True, "category": "kitchen", "package_size": 100},
    {"name": "Holzlöffel zum Einmalgebrauch", "is_consumable": True, "category": "kitchen", "package_size": 100},
    {"name": "Einweghandschuhe", "is_consumable": True, "category": "kitchen", "package_size": 100},
]
