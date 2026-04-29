# Amarktai Network Rebuild Plan

## Product Direction

Amarktai Network is an AI operating system for building, managing, testing, deploying, and running intelligent applications from one operator dashboard.

The product must stop behaving like a collection of disconnected demo panels. Every user action should follow one lifecycle:

input -> capability router -> GenX primary execution -> output -> artifact -> reuse

The public website must sell and explain this clearly. The dashboard must operate it reliably.

## Non-Negotiable Architecture

1. GenX is the primary AI execution layer.
2. Capability routing decides the capability before any provider/model is selected.
3. Provider fallback is allowed only after GenX is unavailable or explicitly cannot handle the capability.
4. API keys are managed in one unified key vault and reused across all features.
5. Every generated output becomes a persistent artifact.
6. Aiva is a system-aware operator, not just a floating chat widget.
7. Adult mode is explicit, tested, and truthfully reports READY, BLOCKED, or UNAVAILABLE.
8. No fake readiness, no dead buttons, no silent safe-model fallback for specialized modes.

## Capability Contract

The router must support these canonical capabilities:

- chat
- code_generation
- file_analysis
- image_generation
- image_edit
- video_generation
- music_generation
- lyrics_generation
- tts
- stt
- voice_interaction
- embeddings
- research
- scrape_website
- app_building
- repo_editing
- deployment_planning
- adult_image
- adult_video

All UI labels, API routes, provider checks, artifacts, tests, and dashboard status displays should use this shared capability language.

## Phase 1: Core Execution Repair

Goal: make the engine reliable before redesigning advanced UI.

- Create one GenX gateway/client used by all AI features.
- Add dynamic GenX endpoint discovery or configurable endpoint probing.
- Replace random provider guessing with capability-first routing.
- Normalize all model/provider status into one truth object.
- Make all routes return structured execution results:
  - success
  - capability
  - provider
  - model
  - artifactId
  - error
  - status
  - latencyMs
- Add tests for capability routing mistakes:
  - music request must not route to image
  - adult request must not route to safe generic model
  - video request must not return image as success
  - missing provider must return UNAVAILABLE, not fake success

## Phase 2: Unified Key Management

Goal: one place for all keys and feature readiness.

- Consolidate AI provider keys and integration keys into one Settings surface.
- Show real configured/healthy/degraded/blocked status.
- Reuse existing keys across all features.
- Remove duplicate key prompts from adult mode, media generation, workspace, and Aiva.
- Add per-capability readiness tests:
  - chat
  - image
  - video
  - music
  - voice
  - adult
  - research
  - Firecrawl
  - GitHub
  - Webdock
  - Qdrant

## Phase 3: Workspace Rebuild

Goal: make Workspace the main execution layer.

Workspace must support:

- Chat and AI lab
- Test any configured model
- Capability test console
- Image generation and editing
- Video generation
- Music and audio generation
- Voice interaction
- File upload and analysis
- Website scraping
- App intelligence creation
- Code generation
- Repo editing
- Deployment planning
- Artifact browsing and reuse

The workspace UI should be cleaner and command-driven, closer to a focused build console than a scattered admin dashboard.

## Phase 4: Aiva Rebuild

Goal: make Aiva useful without blocking the UI.

- Move Aiva into a docked/resizable assistant panel.
- Prevent content overlap on all dashboard pages.
- Give Aiva system context:
  - current page
  - current app
  - provider readiness
  - recent artifacts
  - recent errors
  - workspace context
- Support:
  - natural chat
  - voice input
  - voice output
  - running approved system actions
  - generating artifacts
  - explaining system state
  - memory and tone adaptation
- Add action confirmations for destructive operations.

## Phase 5: Artifact System Completion

Goal: every useful output is persistent and reusable.

Artifact types:

- images
- videos
- audio
- music
- TTS output
- generated code
- app plans
- scraped website data
- research results
- deployment plans
- logs

Required artifact actions:

- view
- preview
- download
- reuse in workspace
- attach to Aiva context
- delete
- filter by app/capability/provider

## Phase 6: App Intelligence

Goal: make app creation smart.

Flow:

URL -> Firecrawl -> analysis -> app profile -> recommended AI stack -> capability setup -> artifacts

Stored profile:

- business type
- brand summary
- tone
- target users
- products/services
- risks
- recommended capabilities
- recommended model package
- crawl summary
- crawl artifact

## Phase 7: Adult Mode

Goal: strict, real, testable specialized content mode.

Statuses:

- READY
- BLOCKED
- UNAVAILABLE

Rules:

- Reuse existing provider keys.
- Pass a real generation readiness test before enabling.
- Never silently fallback to generic safe models.
- Allow only lawful consensual suggestive/adult use cases within configured policy.
- Always block minors, exploitation, illegal content, explicit sexual acts where unsupported, and unsafe requests.

## Phase 8: Public Website Redesign

Goal: world-class, premium, unique public presence.

The site should showcase the real product:

- GenX-powered AI operating system
- capability router
- workspace
- Aiva
- app intelligence
- artifact memory
- model/provider control
- GitHub and VPS deployment
- adult mode as controlled specialized infrastructure, not a gimmick

Design direction:

- premium operational console aesthetic
- real screenshots or realistic live UI captures
- motion with purpose
- strong copy explaining outcomes
- no amateur fake dashboard art
- no vague generic AI claims
- mobile-polished

## Phase 9: Dashboard Information Architecture

Goal: make the dashboard understandable.

Primary nav should be reduced to core jobs:

- Command Center
- Workspace
- Apps
- Aiva
- Artifacts
- Models and Keys
- Deployments
- System Health
- Settings

Secondary/advanced pages should be reachable from context, not scattered as hidden routes.

## Phase 10: Deployment and VPS

Goal: push, deploy, verify, rollback.

- Confirm Docker Compose vs systemd deployment path.
- Ensure persistent storage directories:
  - artifacts
  - uploads
  - repos
  - workspaces
  - logs
- Add health checks for app, realtime service, database, Redis, Qdrant, storage, and GenX.
- Add deployment verification checklist.
- Add rollback command path.

## Recommended Build Order

1. Core execution and capability routing
2. Unified keys and readiness
3. Workspace rebuild
4. Aiva rebuild
5. Artifacts and app intelligence
6. Adult mode readiness
7. Public website redesign
8. Dashboard IA polish
9. VPS deployment hardening

The public frontend can be redesigned in parallel once the positioning is agreed, but the dashboard should not be visually rebuilt before the core engine and workspace contract are fixed.

## Open Questions

1. What is the exact GenX base URL and expected API contract for chat, image, video, music, voice, embeddings, and research?
2. Does GenX support every required capability directly, or do some capabilities always require fallback providers?
3. Which adult-capable providers are approved for image and video generation?
4. Should adult video be included in the first release or marked planned until provider readiness is proven?
5. Is the VPS deployment intended to use Docker Compose or systemd as the main production path?
6. Should the public site use real dashboard screenshots, generated cinematic product visuals, or both?
7. Should Workspace be single-user admin only, or will multiple operators use it later?
8. Which features must be live first for the next deployment?
