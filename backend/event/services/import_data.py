"""Participant import service — CSV/Excel parsing and import."""

import csv
import io
import logging

from ninja import UploadedFile

logger = logging.getLogger(__name__)

# Known column name mappings (German → field name)
COLUMN_MAPPINGS = {
    "vorname": "first_name",
    "first_name": "first_name",
    "firstname": "first_name",
    "nachname": "last_name",
    "last_name": "last_name",
    "lastname": "last_name",
    "e-mail": "email",
    "email": "email",
    "mail": "email",
    "pfadiname": "scout_name",
    "scout_name": "scout_name",
    "fahrtenname": "scout_name",
    "buchungsoption": "booking_option",
    "booking_option": "booking_option",
    "option": "booking_option",
}


class ImportService:
    """Handles CSV/Excel participant import."""

    @classmethod
    def preview(cls, file: UploadedFile) -> dict:
        """Parse an uploaded file and return a preview."""
        rows = cls._parse_file(file)

        if not rows:
            raise ValueError("Datei ist leer oder konnte nicht gelesen werden.")

        columns = list(rows[0].keys())
        suggested_mappings = cls._suggest_mappings(columns)

        preview_rows = []
        for i, row in enumerate(rows[:10]):  # Preview max 10 rows
            errors = cls._validate_row(row, suggested_mappings)
            preview_rows.append(
                {
                    "row_number": i + 1,
                    "data": row,
                    "errors": errors,
                    "is_valid": len(errors) == 0,
                }
            )

        valid_count = sum(1 for r in preview_rows if r["is_valid"])
        invalid_count = len(preview_rows) - valid_count

        return {
            "total_rows": len(rows),
            "valid_rows": valid_count,
            "invalid_rows": invalid_count,
            "columns": columns,
            "suggested_mappings": suggested_mappings,
            "preview_rows": preview_rows,
        }

    @classmethod
    def import_participants(cls, event, file: UploadedFile, user) -> dict:
        """Import participants from a file into an event."""
        rows = cls._parse_file(file)

        if not rows:
            raise ValueError("Datei ist leer oder konnte nicht gelesen werden.")

        columns = list(rows[0].keys())
        mappings = cls._suggest_mappings(columns)
        mapping_dict = {m["source_column"]: m["target_field"] for m in mappings}

        from event.models import Person, Registration, Participant, BookingOption

        success_count = 0
        errors = []

        # Get or create registration for the importing user
        registration, _ = Registration.objects.get_or_create(
            event=event,
            user=user,
        )

        # Get default booking option
        default_option = event.booking_options.filter(is_system=False).first()

        for i, row in enumerate(rows):
            try:
                mapped = {}
                for col, value in row.items():
                    target = mapping_dict.get(col)
                    if target:
                        mapped[target] = value.strip() if isinstance(value, str) else value

                first_name = mapped.get("first_name", "").strip()
                last_name = mapped.get("last_name", "").strip()

                if not first_name or not last_name:
                    errors.append(f"Zeile {i + 1}: Vor- oder Nachname fehlt")
                    continue

                # Create or find person
                person, _ = Person.objects.get_or_create(
                    first_name=first_name,
                    last_name=last_name,
                    created_by=user,
                    defaults={
                        "email": mapped.get("email", ""),
                        "scout_name": mapped.get("scout_name", ""),
                    },
                )

                # Resolve booking option
                booking_option = default_option
                option_name = mapped.get("booking_option", "").strip()
                if option_name:
                    found = event.booking_options.filter(name__iexact=option_name).first()
                    if found:
                        booking_option = found

                # Create participant
                Participant.objects.create(
                    registration=registration,
                    person=person,
                    booking_option=booking_option,
                    first_name=person.first_name,
                    last_name=person.last_name,
                    scout_name=person.scout_name,
                    email=person.email,
                )

                success_count += 1

            except Exception as e:
                errors.append(f"Zeile {i + 1}: {str(e)}")

        return {
            "total_processed": len(rows),
            "success_count": success_count,
            "error_count": len(errors),
            "errors": errors[:50],  # Limit error list
        }

    @classmethod
    def _parse_file(cls, file: UploadedFile) -> list[dict]:
        """Parse CSV or Excel file into list of dicts."""
        filename = file.name.lower() if file.name else ""

        if filename.endswith((".xlsx", ".xls")):
            return cls._parse_excel(file)
        else:
            return cls._parse_csv(file)

    @classmethod
    def _parse_csv(cls, file: UploadedFile) -> list[dict]:
        """Parse CSV file."""
        content = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        return list(reader)

    @classmethod
    def _parse_excel(cls, file: UploadedFile) -> list[dict]:
        """Parse Excel file using openpyxl."""
        try:
            import openpyxl

            content = file.read()
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
            ws = wb.active

            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                return []

            headers = [str(h or "").strip() for h in rows[0]]
            result = []
            for row in rows[1:]:
                row_dict = {}
                for j, value in enumerate(row):
                    if j < len(headers):
                        row_dict[headers[j]] = str(value) if value is not None else ""
                result.append(row_dict)

            return result
        except ImportError:
            raise ValueError("Excel-Import benötigt die openpyxl-Bibliothek.")

    @classmethod
    def _suggest_mappings(cls, columns: list[str]) -> list[dict]:
        """Auto-detect column mappings."""
        mappings = []
        for col in columns:
            normalized = col.lower().strip().replace(" ", "_")
            target = COLUMN_MAPPINGS.get(normalized, "")
            if target:
                mappings.append(
                    {
                        "source_column": col,
                        "target_field": target,
                    }
                )
        return mappings

    @classmethod
    def _validate_row(cls, row: dict, mappings: list[dict]) -> list[str]:
        """Validate a single row."""
        errors = []
        mapping_dict = {m["source_column"]: m["target_field"] for m in mappings}

        has_first_name = False
        has_last_name = False

        for col, value in row.items():
            target = mapping_dict.get(col)
            if target == "first_name" and value and value.strip():
                has_first_name = True
            if target == "last_name" and value and value.strip():
                has_last_name = True

        if not has_first_name:
            errors.append("Vorname fehlt")
        if not has_last_name:
            errors.append("Nachname fehlt")

        return errors
