# TaskFlow — Serverless Todo Frontend

React + Vite frontend for the AWS Lambda + API Gateway + DynamoDB Todo API described in the project report.

## Requirements

- Node.js 22.12+ (or a supported Node.js release that satisfies Vite 8 requirements)
- Internet connection during the first dependency install
- The deployed AWS API Gateway HTTP API with `GET /todos`, `POST /todos`, `DELETE /todos`

Official setup references:
- Vite guide: https://vite.dev/guide/
- AWS HTTP API CORS: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html

## Run on Windows

1. Install Node.js LTS from https://nodejs.org/ if not already installed. Finish setup and reopen the terminal.
2. Extract this ZIP to a normal folder (for example, Desktop\serverless-todo-frontend).
3. Double-click `start.bat`, or open PowerShell in this folder and run:

   ```powershell
   npm install
   npm run dev
   ```

4. Open the local address Vite prints (usually `http://localhost:5173`).
5. On the page, open **API settings** and paste the API Gateway **Invoke URL** from API Gateway → `DevopsCBP` → Stages → `$default`. It should be the base URL, e.g. `https://<api-id>.execute-api.<region>.amazonaws.com`. Do not paste an invented example. The app also accepts a URL ending in `/todos` and normalizes it.
6. Click **Connect and test**. The UI tests `GET /todos` before saving the connection.

## Important: CORS

A React frontend does not bypass browser CORS. In API Gateway → `DevopsCBP` → CORS, configure:

- Allowed origins: `*` (demo only)
- Allowed methods: `GET`, `POST`, `DELETE`
- Allowed headers: `content-type`

Save. If the `$default` stage does not automatically deploy, deploy the API. Then reload the frontend and click **Connect and test**.

## API expectations

- `GET /todos` returns JSON array: `[{"id":"...","task":"..."}]`
- `POST /todos` accepts JSON `{ "task": "..." }`
- `DELETE /todos` accepts JSON `{ "id": "..." }`

The configured API URL is stored in the browser's localStorage. It is not an AWS secret. The backend API has no authentication, so do not store sensitive tasks or expose this demo API for production use.
