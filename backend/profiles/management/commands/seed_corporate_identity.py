"""
Management command to seed groups with Corporate Identity data.

Creates 3 groups with diverse CI configurations:
- Stamm Windrose (green)
- Stamm Nordlicht (blue)
- Stamm Feuerfuchs (orange)

Each group gets a placeholder logo (colored circle with initials)
and realistic German text blocks.

Usage:
    uv run python manage.py seed_corporate_identity
"""

import io
import logging

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from profiles.models import GroupCorporateIdentity, GroupMembership, UserGroup

logger = logging.getLogger(__name__)
User = get_user_model()

# Seed data for 3 groups
GROUPS = [
    {
        "name": "Stamm Windrose",
        "slug": "stamm-windrose",
        "description": "Pfadfinderstamm mit Sitz in der Eifel. Gegründet 1952.",
        "ci": {
            "primary_color": "#2d6a4f",
            "secondary_color": "#d8f3dc",
            "slogan": "Allzeit bereit - der Natur verbunden!",
            "greeting_text": "Liebe Pfadfinderinnen und Pfadfinder,\nliebe Eltern und Erziehungsberechtigte,",
            "footer_text": (
                "Stamm Windrose e.V.\n"
                "Waldweg 12, 53894 Mechernich\n"
                "Tel: 02443 / 123456\n"
                "E-Mail: info@stamm-windrose.de\n"
                "www.stamm-windrose.de"
            ),
            "payment_info": (
                "Kontoinhaber: Stamm Windrose e.V.\n"
                "IBAN: DE89 3704 0044 0532 0130 00\n"
                "BIC: COBADEFFXXX\n"
                "Sparkasse Euskirchen\n"
                "Verwendungszweck: [Veranstaltungsname] + [Name des Teilnehmers]"
            ),
            "signature_text": "Gut Pfad!\nEure Stammesführung\nAnna & Max Müller",
        },
        "logo_initials": "SW",
        "logo_color": "#2d6a4f",
    },
    {
        "name": "Stamm Nordlicht",
        "slug": "stamm-nordlicht",
        "description": "Ein Stamm aus dem hohen Norden. Wir lieben Fahrtenabenteuer und Winterlager.",
        "ci": {
            "primary_color": "#1d3557",
            "secondary_color": "#a8dadc",
            "slogan": "Unter dem Nordlicht vereint",
            "greeting_text": "Moin liebe Pfadfinderinnen und Pfadfinder,\nmoin liebe Familien,",
            "footer_text": (
                "Stamm Nordlicht im BdP e.V.\n"
                "Deichstraße 45, 25826 St. Peter-Ording\n"
                "Tel: 04863 / 987654\n"
                "E-Mail: kontakt@stamm-nordlicht.de"
            ),
            "payment_info": (
                "Kontoinhaber: Stamm Nordlicht im BdP e.V.\n"
                "IBAN: DE27 2175 0000 0017 0123 45\n"
                "BIC: NOLADE21NOS\n"
                "Nord-Ostsee Sparkasse\n"
                "Bitte als Verwendungszweck den Veranstaltungsnamen und Teilnehmernamen angeben."
            ),
            "signature_text": "Allzeit bereit und Gut Pfad!\nDie Stammesleitung Nordlicht\nLisa & Jonas",
        },
        "logo_initials": "NL",
        "logo_color": "#1d3557",
    },
    {
        "name": "Stamm Feuerfuchs",
        "slug": "stamm-feuerfuchs",
        "description": "Aktiver Pfadfinderstamm in Südhessen. Unser Totemtier ist der Fuchs.",
        "ci": {
            "primary_color": "#d35400",
            "secondary_color": "#fdebd0",
            "slogan": "Schlau wie ein Fuchs, mutig wie ein Löwe!",
            "greeting_text": "Hallo liebe Feuerfüchse und Familien,",
            "footer_text": (
                "Stamm Feuerfuchs\n"
                "Marktplatz 7, 64283 Darmstadt\n"
                "E-Mail: stammesfuehrung@feuerfuchs-pfadfinder.de\n"
                "Instagram: @feuerfuchs_pfadfinder"
            ),
            "payment_info": (
                "Kontoinhaber: Förderverein Stamm Feuerfuchs e.V.\n"
                "IBAN: DE44 5085 0150 0000 1234 56\n"
                "BIC: HELADEF1DAS\n"
                "Sparkasse Darmstadt\n"
                "PayPal: zahlung@feuerfuchs-pfadfinder.de"
            ),
            "signature_text": "Gut Pfad und bis bald im Wald!\nEure Stammesleitung",
        },
        "logo_initials": "FF",
        "logo_color": "#d35400",
    },
]


def generate_placeholder_logo(initials: str, color: str) -> ContentFile:
    """Generate a simple placeholder logo: colored circle with white initials.

    Returns a ContentFile with PNG data.
    """
    from PIL import Image, ImageDraw, ImageFont

    size = 300
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Parse hex color
    r = int(color[1:3], 16)
    g = int(color[3:5], 16)
    b = int(color[5:7], 16)

    # Draw circle
    draw.ellipse([10, 10, size - 10, size - 10], fill=(r, g, b, 255))

    # Draw initials
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 100)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 100)
        except (OSError, IOError):
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), initials, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) / 2
    y = (size - text_h) / 2 - bbox[1]
    draw.text((x, y), initials, fill=(255, 255, 255, 255), font=font)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return ContentFile(buffer.getvalue())


class Command(BaseCommand):
    help = "Seed groups with Corporate Identity data (3 groups with logos and text blocks)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing CI data if groups already exist",
        )

    def handle(self, *args, **options):
        force = options["force"]

        # Get or create a default admin user for group ownership
        admin_user = User.objects.filter(is_staff=True).first()
        if not admin_user:
            self.stderr.write(self.style.WARNING("No staff user found. Creating seed user."))
            admin_user = User.objects.create_user(
                email="seed@gruppenstunde.de",
                password="seed-password-change-me",
                is_staff=True,
            )

        for group_data in GROUPS:
            group, created = UserGroup.objects.get_or_create(
                slug=group_data["slug"],
                defaults={
                    "name": group_data["name"],
                    "description": group_data["description"],
                    "is_visible": True,
                    "free_to_join": False,
                    "created_by": admin_user,
                },
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created group: {group.name}"))
                # Add admin_user as group admin
                GroupMembership.objects.get_or_create(
                    user=admin_user,
                    group=group,
                    defaults={"role": "admin", "is_active": True},
                )
            else:
                self.stdout.write(f"  Group already exists: {group.name}")

            # Create or update CI
            ci, ci_created = GroupCorporateIdentity.objects.get_or_create(
                group=group,
                defaults=group_data["ci"],
            )

            if ci_created:
                self.stdout.write(self.style.SUCCESS(f"    Created CI for {group.name}"))
            elif force:
                for field, value in group_data["ci"].items():
                    setattr(ci, field, value)
                ci.save()
                self.stdout.write(self.style.WARNING(f"    Updated CI for {group.name} (--force)"))
            else:
                self.stdout.write(f"    CI already exists for {group.name} (use --force to overwrite)")

            # Generate and save placeholder logo
            if not ci.logo or force:
                logo_content = generate_placeholder_logo(
                    group_data["logo_initials"],
                    group_data["logo_color"],
                )
                filename = f"{group_data['slug']}-logo.png"
                ci.logo.save(filename, logo_content, save=True)
                self.stdout.write(self.style.SUCCESS(f"    Generated logo: {filename}"))
            else:
                self.stdout.write(f"    Logo already exists for {group.name}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seed data created successfully!"))
        self.stdout.write(f"  Groups: {len(GROUPS)}")
        self.stdout.write(f"  Admin user: {admin_user.email}")
