## REMOVED Requirements

### Requirement: Idea Model with idea_type field
**Reason**: The Idea model is dissolved. Ideas with idea_type='idea' become GroupSession, ideas with idea_type='knowledge' become Blog. Both inherit from the abstract Content base class.
**Migration**: 
- All Idea records with idea_type='idea' SHALL be migrated to GroupSession
- All Idea records with idea_type='knowledge' SHALL be migrated to Blog
- The Idea model and idea app SHALL be removed after migration

### Requirement: Idea-specific API endpoints
**Reason**: Replaced by content-type-specific endpoints (/api/sessions/, /api/blogs/)
**Migration**:
- `/api/ideas/` → `/api/sessions/` (for type=idea) and `/api/blogs/` (for type=knowledge)
- `/api/ideas/{id}/` → `/api/sessions/{id}/` or `/api/blogs/{id}/`
- `/api/ideas/by-slug/{slug}/` → `/api/sessions/by-slug/{slug}/` or `/api/blogs/by-slug/{slug}/`

### Requirement: MaterialItem Model
**Reason**: Replaced by ContentMaterialItem which uses the Supply-based Material model
**Migration**: MaterialItem data SHALL be migrated to ContentMaterialItem with Material references

### Requirement: idea_type TextChoices
**Reason**: Content types are now separate models, not a field on a single model
**Migration**: No migration needed — the field is removed with the Idea model

### Requirement: Comment Model (idea-specific)
**Reason**: Replaced by generic ContentComment
**Migration**: Comment data SHALL be migrated to ContentComment

### Requirement: Emotion Model (idea-specific)
**Reason**: Replaced by generic ContentEmotion
**Migration**: Emotion data SHALL be migrated to ContentEmotion

### Requirement: IdeaView Model
**Reason**: Replaced by generic ContentView
**Migration**: IdeaView data SHALL be migrated to ContentView

### Requirement: UserPreferences Model in idea app
**Reason**: Consolidated into profiles.UserPreference (which already exists with same fields)
**Migration**: UserPreferences data SHALL be merged into profiles.UserPreference
