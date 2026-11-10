# Developer setup (Windows)

The project folder is `C:\Users\sylve\Desktop\my stuff\urlshortener`.

## 1. Tools
- **Java 21** (Temurin): https://adoptium.net. Check with `java -version`.
- **Node.js 22 LTS**: https://nodejs.org. Check with `node -v`.
- **Git for Windows**: https://git-scm.com
- IntelliJ IDEA and VS Code (you already have both)
- Optional: Docker Desktop, to run the PostgreSQL stack

Maven doesn't need installing. The repo includes the Maven wrapper (`mvnw.cmd`).

## 2. Backend in IntelliJ
1. *File → Open* → select `urlshortener\backend\pom.xml` → *Open as Project*.
2. Set the Project SDK to 21 (*File → Project Structure*).
3. Run `com.kiungo.KiungoApplication` (green ▶ next to `main`).
4. Open http://localhost:8080/swagger-ui.html. Demo login: `demo@kiungo.dev` / `demo1234`.

## 3. Frontend in VS Code
1. *File → Open Folder* → `urlshortener` (the root, so VS Code sees `.vscode/extensions.json` and suggests the right extensions).
2. In the terminal (`` Ctrl+` ``):
   ```powershell
   cd frontend
   npm install
   npm start
   ```
3. Open http://localhost:4200.

## 4. Claude Code in VS Code
1. In VS Code press `Ctrl+Shift+X`, search **Claude Code** (publisher: Anthropic) and click **Install**.
   It needs VS Code 1.94 or newer.
2. Open any file and click the **Spark icon** at the top-right of the editor, or the Spark icon in the left Activity Bar.
3. Sign in with your Claude account when asked. Any paid Claude plan works, and you don't need an API key.
4. Claude reads [`CLAUDE.md`](../CLAUDE.md) at the repo root automatically, so it already knows the stack, the commands and the conventions.
   Try: *"Add password-protected links: backend field, migration, editor toggle and tests."*

Useful shortcuts: `Alt+K` inserts an @-mention of the selected code, `Ctrl+Esc` toggles focus between the editor and
Claude, and the Command Palette (`Ctrl+Shift+P`) → "Claude Code" lists everything.

## 5. GitHub repo
1. On github.com, click **New repository** → name it `urlshortener` → **Private** → don't add a README (we have one) → **Create**.
2. In the project folder:
   ```powershell
   cd "C:\Users\sylve\Desktop\my stuff\urlshortener"
   git init -b main
   git add .
   git commit -m "Kiungo v0.1: URL shortener MVP"
   git remote add origin https://github.com/<your-username>/urlshortener.git
   git push -u origin main
   ```
3. GitHub Actions (`.github/workflows/ci.yml`) then runs the backend tests and the frontend build on every push and pull request.

## Everyday commands

| Task | Command |
|---|---|
| Run backend | `cd backend && mvnw.cmd spring-boot:run` |
| Backend tests | `cd backend && mvnw.cmd test` |
| Run frontend | `cd frontend && npm start` |
| Production build | `cd frontend && npx ng build` |
| Reset local DB | stop the backend and delete `backend\data\` (the demo account is re-seeded) |
| Full stack in Docker | `docker compose up --build` |
