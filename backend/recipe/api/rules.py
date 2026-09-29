"""Rules CRUD API — admin management of nutrition/quality rules."""

from ninja import Router
from ninja.errors import HttpError

from core.permissions import require_staff
from recipe.models import Rule
from recipe.schemas.rules import RuleIn, RuleOut, RuleUpdateIn

router = Router(tags=["rules"])


@router.get("/", response=list[RuleOut])
def list_rules(request):
    """List all rules, ordered by scope then sort_order."""
    return Rule.objects.all().order_by("scope", "sort_order", "name")


@router.get("/{rule_id}", response=RuleOut)
def get_rule(request, rule_id: int):
    """Get a single rule."""
    try:
        return Rule.objects.get(id=rule_id)
    except Rule.DoesNotExist:
        raise HttpError(404, "Rule nicht gefunden")


@router.post("/", response=RuleOut)
def create_rule(request, payload: RuleIn):
    """Create a new rule (admin only)."""
    require_staff(request)
    rule = Rule.objects.create(**payload.dict())
    return rule


@router.patch("/{rule_id}", response=RuleOut)
def update_rule(request, rule_id: int, payload: RuleUpdateIn):
    """Update an existing rule (admin only)."""
    require_staff(request)
    try:
        rule = Rule.objects.get(id=rule_id)
    except Rule.DoesNotExist:
        raise HttpError(404, "Rule nicht gefunden")

    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(rule, key, value)
    rule.save()
    return rule


@router.delete("/{rule_id}")
def delete_rule(request, rule_id: int):
    """Delete a rule (admin only)."""
    require_staff(request)
    try:
        rule = Rule.objects.get(id=rule_id)
    except Rule.DoesNotExist:
        raise HttpError(404, "Rule nicht gefunden")
    rule.delete()
    return {"success": True}
