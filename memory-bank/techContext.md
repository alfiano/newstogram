# Tech Context: Newstogram4

## Technologies Used

- **Frontend:**
    - Language: JavaScript (ES6+)
    - Framework/Library: Vanilla JS
    - CSS: Plain CSS
    - State Management: Custom (module-based, no external library)
    - Build Tool: None (direct browser usage)
- **Backend:**
    - Language: Node.js
    - Framework: Express (see tes-api/api/app.js)
    - Database: None currently (may be added for template/user storage)
    - API Type: REST (for news scraping and data exchange)
- **Testing:**
    - Framework: None yet
    - Type: Manual testing
- **Infrastructure:**
    - Hosting: Local development, future deployment TBD
    - CI/CD: None yet

## Development Setup

1. Clone repository: `git clone <repo-url>`
2. Install backend dependencies: `cd tes-api && npm install`
3. Environment variables: None required for local development
4. Run backend server: `cd tes-api && node api/app.js` or use `server-bootstrap.cjs`
5. Open `index.html` in browser for frontend

## Technical Constraints

- Constraint 1: Must work in modern browsers (Chrome, Firefox, Edge)
- Constraint 2: No image filter support (explicitly out of scope)
- Constraint 3: No frontend frameworks (keep JS modular and simple)

## Dependencies

- Library 1: Express (backend API)
- Library 2: Node-fetch or similar (for backend scraping, if used)

## Tool Usage Patterns

- **Version Control (Git):**
    - Branching strategy: Simple feature branches, main branch for stable
    - Commit message format: Descriptive, no strict convention yet
- **Code Linting/Formatting:**
    - Tools: None enforced, follow standard JS/CSS best practices

*(This file provides the technical foundation details necessary for developers to work on the project.)*
