# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Sub-Agent Spec Workflow System - A comprehensive AI-driven development workflow system built on Claude Code's Sub-Agents feature. This system transforms project ideas into production-ready code through specialized AI agents working in coordinated phases.

## Document Storage

All documentation must be saved under `docs/` with date-based organization:
- Tasks: `docs/{YYYY_MM_DD}/tasks/`
- Specs: `docs/{YYYY_MM_DD}/specs/` 
- Design: `docs/{YYYY_MM_DD}/design/`
- Tests: `tests/` directory
- Code: appropriate `src/` subdirectories

Never default files to root directory - create necessary directories first.

## Core Workflows

### Primary Workflow Commands

```bash
# Complete automated development pipeline 
/agent-workflow "Create a todo list web application with user authentication"

# Manual orchestration for complex projects
Use spec-orchestrator: Create an enterprise CRM system with multi-tenancy support

# Individual agent usage
Use spec-analyst: Analyze requirements for an e-commerce platform
Use spec-architect: Design system architecture for microservices  
Use spec-developer: Implement user authentication based on specifications
```

### Agent Setup Commands

```bash
# Copy agents to new project
mkdir -p .claude/agents .claude/commands
cp claude-sub-agent/agents/*/*.md .claude/agents/
cp claude-sub-agent/commands/agent-workflow.md .claude/commands/
```

## System Architecture

### Multi-Phase Workflow Design

The system follows a three-phase approach with quality gates:

1. **Planning Phase (20-25% of project time)**
   - spec-analyst: Requirements analysis and user stories
   - spec-architect: System architecture and API design
   - spec-planner: Task breakdown and estimation
   - Quality Gate 1: 95% compliance threshold

2. **Development Phase (60-65% of project time)**
   - spec-developer: Code implementation following specifications
   - spec-tester: Comprehensive test suite generation
   - Quality Gate 2: 80% compliance threshold

3. **Validation Phase (15-20% of project time)**
   - spec-reviewer: Code review and best practices validation
   - spec-validator: Final production readiness assessment
   - Quality Gate 3: 85% compliance threshold

### Agent Categories

**Workflow Agents (spec-agents/)**

- spec-orchestrator: Workflow coordination and quality gate management
- spec-analyst: Requirements analysis specialist
- spec-architect: System architecture designer  
- spec-planner: Task breakdown and planning
- spec-developer: Implementation specialist
- spec-tester: Testing expert
- spec-reviewer: Code review specialist
- spec-validator: Final validation expert

**Domain Specialists**

- senior-frontend-architect: React/Vue/Next.js expert
- senior-backend-architect: Go/TypeScript backend systems
- ui-ux-master: UI/UX design and implementation

**Utility Agents**

- refactor-agent: Code quality and refactoring specialist

### Quality Framework

Each phase includes automated quality gates with specific thresholds:

- Requirements completeness validation
- Architecture feasibility assessment
- Code quality metrics and test coverage
- Security vulnerability scanning
- Production deployment readiness

### Agent Communication Protocol

Agents communicate through structured artifacts:

- Each agent produces specific documentation (requirements.md, architecture.md, etc.)
- Next agent uses previous outputs as input
- Orchestrator manages the workflow progression
- Quality gates ensure consistency and standards compliance

## Expected Output Structure

```
project/
├── docs/
│   ├── requirements.md      # Detailed requirements specification
│   ├── architecture.md      # System architecture design
│   ├── api-spec.md         # API specifications and contracts
│   └── user-stories.md     # User stories with acceptance criteria
├── src/
│   ├── components/         # Reusable components
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── types/             # Type definitions
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── package.json           # Project dependencies
└── README.md              # Project documentation
```

## Key Integration Points

### Slash Command Integration

The `/agent-workflow` command provides one-command execution of the entire development pipeline:

- Supports quality threshold configuration (--quality=75-95)
- Allows agent skipping (--skip-agent=spec-analyst)
- Phase-specific execution (--phase=planning|development|validation)
- Language selection (--language=zh|en)

### Sub-Agent Chain Process

The system uses Claude Code's sub-agent syntax for coordinated execution:

```
First use the spec-analyst sub agent → then spec-architect sub agent → then spec-developer sub agent → then spec-validator sub agent → quality gate decision → if score ≥95% continue to spec-tester, otherwise loop back with feedback
```

### Quality Gate Mechanism

- Validation Score ≥95%: Proceed to next phase
- Validation Score <95%: Loop back with specific feedback
- Maximum 3 iterations to prevent infinite loops
- Expected progression: Round 1 (80-90%) → Round 2 (90-95%) → Round 3 (95%+)

## Best Practices

### For Working with Agents

- Start with spec-orchestrator for complete projects
- Use domain specialists for specific expertise areas
- Allow each agent to complete their phase before intervention
- Trust the quality gate system for consistent standards
- Review artifacts between phases for course correction

### For Project Setup

- Copy all agents and slash command to project's .claude directory
- Provide clear project descriptions with constraints and requirements
- Specify quality expectations (75% for prototypes, 95% for enterprise)
- Include existing documentation when available

### For Customization

- Adjust quality thresholds based on project needs
- Skip agents for simpler projects (e.g., skip spec-analyst if requirements exist)
- Use phase-specific execution for targeted improvements
- Integrate with existing CI/CD workflows

## Troubleshooting

### Common Issues

- **Agent Not Found**: Verify agents are in correct .claude/agents directory
- **Quality Gate Failures**: Review specific criteria, allow agents to revise work
- **Workflow Stuck**: Check orchestrator status, restart from last checkpoint

### Debug Mode

Enable verbose logging by requesting: "Use spec-orchestrator with debug mode and show all agent interactions"

## Integration with External Systems

The system can be integrated with:

- GitHub Actions for CI/CD validation
- Custom quality gates and validation criteria  
- Domain-specific workflows and specialized orchestrators
- Existing development tools and frameworks
