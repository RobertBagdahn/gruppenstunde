# Structured Recipe Instructions — Deployment Strategy

## Overview

**Feature Status:** Feature-complete with comprehensive testing  
**Rollout Target:** Gradual rollout with feature flags  
**Rollback Path:** Fallback to markdown descriptions (backward compatible)  
**Risk Level:** Medium (new data model, KI service dependency)

---

## Rollout Phases

### Phase 0: Pre-Deployment Validation (2 hours)

**Prerequisites:**
- [ ] All 190+ frontend tests passing
- [ ] All 50+ backend tests passing  
- [ ] Database migrations verified on staging
- [ ] KI service quota validated (Gemini API)
- [ ] CSRF protection verified with real browser session
- [ ] E2E workflows tested manually in dev

**Validation Checklist:**
```bash
# Backend
cd backend && python manage.py test recipe.tests.test_steps_models
cd backend && python manage.py test recipe.tests.test_steps_ai_service
cd backend && python manage.py test recipe.tests.test_placeholder_resolution

# Frontend
cd frontend-food && npm test
```

---

### Phase 1: Internal Testing (1-2 days)

**Target Users:** Team members only (staging environment)

**Feature Flag:** `FEATURE_STRUCTURED_STEPS = False` (default OFF)

**Rollout Steps:**
1. Deploy to staging environment
2. Enable feature flag for staging
3. Team tests on 10+ existing recipes
4. Verify KI features work correctly
5. Check mobile responsiveness
6. Validate drag-and-drop on Firefox/Safari

**What to Test:**
- Create new recipe with structured steps
- Edit existing recipe → convert markdown to structured
- Generate steps via KI (uses Gemini)
- Rewrite step instruction with different tones
- Suggest ingredients for step
- Reorder steps via drag-and-drop
- Print recipe (two-column layout)
- Cooking mode displays step-specific ingredients
- Mobile: Can reorder on small screens
- Performance: Load time with 50+ steps

**Success Criteria:**
- Zero crashes in 2 hours of active use
- All KI features respond within 5 seconds
- Drag-and-drop smooth on all browsers
- Mobile controls responsive

---

### Phase 2: Beta Rollout (3-7 days)

**Target Users:** 10-20% of users (live environment, opt-in)

**Feature Flag:** `FEATURE_STRUCTURED_STEPS = True` (for beta users)

**Rollout Steps:**
1. Deploy to production (feature flag OFF for all)
2. Create beta user group in database
3. Enable flag only for beta users
4. Monitor error logs and performance
5. Gather feedback from beta testers
6. Fix critical issues daily

**Monitoring:**
- API error rates (target: < 0.1%)
- KI service latency (target: < 3s for generate)
- Database query times (target: < 100ms for step list)
- Memory usage (no leaks)
- Feature adoption rate

**Rollback Trigger:**
```
IF error_rate > 1% THEN disable_for_beta_users()
IF latency_p95 > 10s THEN disable_ki_features_only()
IF crashes > 5 THEN rollback_entire_feature()
```

---

### Phase 3: General Availability (5-14 days after Phase 2)

**Target Users:** 100% of users (live environment, enabled for all)

**Feature Flag:** `FEATURE_STRUCTURED_STEPS = True` (for all users)

**Rollout Steps:**
1. Analyze beta feedback (minimum 3 days)
2. Fix remaining issues
3. Update documentation
4. Announce feature in changelog
5. Enable for 50% of users (Monday)
6. Monitor for 48 hours
7. Enable for remaining 50% (Wednesday)
8. Full availability

**Monitoring:**
- Same metrics as Phase 2 (stricter thresholds)
- User engagement (adoption rate)
- Recipe conversion rate (% creating structured steps)
- KI feature usage (% using generate/improve/suggest)

---

## Data Migration Strategy

### Legacy Recipes (Markdown Description)

**Problem:** Existing recipes have `description` (markdown) but no `structured_steps`

**Solution:** Lazy conversion on-demand

```python
# In RecipeDetailPage component (frontend)
if recipe.steps_count === 0 and recipe.description:
  show_migration_prompt()
  # User chooses:
  # 1. Convert now (AI-powered)
  # 2. Keep markdown
  # 3. Create structured steps manually
```

**AI Conversion Process:**
```python
# Backend: AiStepService.convert_markdown_to_steps()
1. Parse recipe.description (markdown)
2. Extract cooking steps using Gemini
3. Assign ingredients to each step
4. Create RecipeStep objects
5. Return for user confirmation before saving
```

**Rollback:** If conversion fails, stays on markdown (no breaking change)

---

## Deployment Checklist

### Pre-Deployment (Day -1)

- [ ] All tests passing (backend + frontend)
- [ ] Staging deployment successful
- [ ] Database migrations dry-run on production DB
- [ ] KI service quota verified
- [ ] Error monitoring configured (Sentry)
- [ ] Feature flag system ready
- [ ] Rollback plan documented
- [ ] Team briefing completed

### Deployment Day (Phase 1)

- [ ] Backup production database
- [ ] Deploy code (with feature flag OFF)
- [ ] Run database migrations:
  ```bash
  python manage.py migrate recipe
  ```
- [ ] Clear cache: `cache.clear()`
- [ ] Verify API endpoints respond: `GET /api/recipes/{slug}/steps/`
- [ ] Enable feature flag for staging
- [ ] Run smoke tests
- [ ] Monitor logs for errors

### During Deployment

**Deployment Timeline:**
```
10:00 AM — Code deployment
10:05 AM — Database migrations
10:10 AM — Feature flag OFF (all users on markdown)
10:15 AM — Test API endpoints
10:30 AM — Enable flag for staging
4:00 PM  — Team internal testing begins
```

**On-Call Team:**
- Backend engineer (monitoring API logs)
- Frontend engineer (monitoring frontend errors)
- DevOps (database & infrastructure)
- Product manager (user feedback)

### Post-Deployment Monitoring

**First 24 hours:**
- Error rate must stay < 0.5%
- API response time p95 < 1s
- No database connection pool exhaustion
- KI service working correctly

**Week 1:**
- Zero data loss or corruption reported
- Feature adoption tracking
- Performance baseline established
- No rollback needed after Phase 0

---

## Feature Flags Configuration

### Environment Variable

```python
# settings/production.py
FEATURES = {
    'STRUCTURED_STEPS': os.getenv('FEATURE_STRUCTURED_STEPS', 'false').lower() == 'true',
    'STRUCTURED_STEPS_KI_GENERATION': os.getenv('FEATURE_STEPS_KI_GENERATION', 'false').lower() == 'true',
    'STRUCTURED_STEPS_KI_IMPROVE': os.getenv('FEATURE_STEPS_KI_IMPROVE', 'false').lower() == 'true',
}
```

### Database-Driven Flags (Optional)

```python
# For fine-grained control (beta users, specific recipes)
class FeatureFlag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    enabled_for_users = models.ManyToManyField(User, blank=True)
    enabled_for_groups = models.ManyToManyField(Group, blank=True)
    enabled_globally = models.BooleanField(default=False)
    
    def is_enabled_for_user(self, user):
        if self.enabled_globally:
            return True
        if self.enabled_for_users.filter(pk=user.pk).exists():
            return True
        return self.enabled_for_groups.filter(user=user).exists()
```

### Frontend Feature Detection

```typescript
// frontend-food/src/config/features.ts
export const FEATURES = {
  STRUCTURED_STEPS: import.meta.env.VITE_FEATURE_STRUCTURED_STEPS === 'true',
};

// In components:
{FEATURES.STRUCTURED_STEPS && <StepEditor {...props} />}
```

---

## Monitoring & Alerting

### Key Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API error rate | < 0.1% | > 0.5% | > 1% |
| Step creation latency | 100ms | 500ms | 1s |
| KI generation time | 3s | 5s | 10s |
| Database query time | 50ms | 200ms | 500ms |
| Frontend build size | < 500KB | 600KB | 700KB |

### Alerting Rules (Sentry / CloudWatch)

```yaml
Alert: HighAPIErrorRate
  condition: error_rate > 1% for 5 minutes
  action: page on-call engineer
  
Alert: KIServiceLatency
  condition: gemini_latency_p95 > 10s for 10 minutes
  action: disable KI features temporarily, notify team
  
Alert: DatabaseConnPoolExhausted
  condition: active_connections >= max_pool for 1 minute
  action: page DBA, scale up connection pool
```

---

## Rollback Plan

### Immediate Rollback (If Critical Issue)

**Trigger:** Crash rate > 5%, Data corruption, API errors > 2%

**Steps:**
```bash
# Disable feature flag
git checkout main
git revert <deployment-commit>
git push production

# OR just disable flag:
export FEATURE_STRUCTURED_STEPS=false
# restart services

# Verify rollback
curl http://api/recipes/test/steps/
# Should return empty [] since feature is off
```

**Timeline:** 5 minutes to disable

**User Impact:** New recipes still use markdown description (backward compatible)

### Graceful Degradation

If KI service fails:
```python
# Backend: step_ai_service.py
try:
    generated_steps = AiStepService.generate_steps(...)
except GeminiAPIError:
    # Fallback: Show placeholder instruction
    return {
        'steps': [{
            'instruction': '[Unable to generate steps - please enter manually]',
            'step_ingredients': []
        }]
    }
```

If database migration fails:
```bash
# Revert migration
python manage.py migrate recipe 0048_previous_migration
python manage.py migrate --fake recipe 0049_add_recipe_steps  # mark as applied
# Then fix migration file and redeploy
```

---

## Success Metrics (Post-Deployment)

**Week 1:**
- Zero critical issues reported
- 80%+ API calls successful
- KI features generating steps successfully
- No data corruption

**Week 2:**
- 20%+ of new recipes using structured steps
- 70%+ of old recipes converted or using markdown
- Average KI generation time < 3 seconds
- User engagement score > 4/5 (feedback)

**Month 1:**
- 50%+ of all recipes using structured steps
- User retention improved (structured recipes have higher completion)
- Support tickets related to steps < 5

---

## Communication Plan

### Pre-Launch (1 day before)

**Channels:**
- Team Slack channel: "Deployment in progress"
- User notification: None yet (Phase 1 internal only)

### Launch Day (Phase 1)

**Team:**
```
Morning standup: 
  - Review deployment plan
  - Assign on-call roles
  - Set up monitoring dashboard
```

### Post-Launch (Daily during Phase 2)

**Daily Briefing (3 PM):**
- Error rates & performance
- User feedback summary
- Any issues to fix overnight
- Go/no-go for Phase 3

### Phase 3 Announcement

**User-Facing Message:**
```
New Feature: Structured Recipe Instructions 🎉

We've upgraded recipe instructions with:
✨ AI-powered step generation
✨ Step-specific ingredients
✨ Better printing & cooking mode

Try it when creating or editing a recipe!
```

---

## Appendix: Rollback Commands

```bash
# Check feature flag status
curl http://api/admin/features/ -H "Authorization: Bearer TOKEN"

# Disable for specific user
curl -X PATCH http://api/admin/features/STRUCTURED_STEPS \
  -d '{"disabled_for_user_id": 123}'

# Disable globally
export FEATURE_STRUCTURED_STEPS=false
systemctl restart api

# Database rollback (last resort)
python manage.py migrate recipe 0048_previous
python manage.py migrate --fake recipe 0049_add_recipe_steps
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-10  
**Next Review:** Before Phase 2 (after Phase 1 complete)
