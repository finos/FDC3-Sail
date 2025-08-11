# Creating a New App

This guide explains how to add a new application to our multi-app Vite/React project.

## Overview

Our project structure creates separate apps under the `src/apps` directory. Each app is built as a standalone application, with its own HTML, JavaScript, and assets.

## Creating a New App

### Step 1: Create the app directory structure

Create a new directory under `src/apps` with your app name:

```
src/apps/my-new-app/
```

### Step 2: Add required files

Each app needs at minimum:

1. An `index.html` file
2. A main entry point TSX file
3. An app component

#### index.html

Create `src/apps/my-new-app/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My New App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

#### main.tsx

Create `src/apps/my-new-app/main.tsx`:

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "../../styles/global.css" // If you have global styles

// Enable HMR
if (import.meta.hot) {
  import.meta.hot.accept()
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

#### App.tsx

Create `src/apps/my-new-app/App.tsx`:

```tsx
import React from "react"

const App: React.FC = () => {
  return (
    <div className="app">
      <h1>My New App</h1>
      <p>This is a new app in our multi-app project.</p>
    </div>
  )
}

export default App
```

### Step 3: Add components and other files

Add any additional components, assets, or files your app needs:

```
src/apps/my-new-app/
├── components/
│   ├── Header.tsx
│   └── Footer.tsx
├── hooks/
│   └── useMyHook.ts
├── assets/
│   └── logo.svg
├── styles/
│   └── app.css
├── App.tsx
├── index.html
└── main.tsx
```

## Running Your New App

No configuration changes are needed! The project automatically detects all apps in the `src/apps` directory.

### Development

Start the development server:

```bash
npm run dev
```

Access your new app at:

```
http://localhost:3000/apps/my-new-app/
```

### Production Build

Build all apps for production:

```bash
npm run build
```

Your app will be built to:

```
dist/apps/my-new-app/index.html
```

With associated assets in the `dist/assets` directory.

## Best Practices

1. **Keep apps independent**: Each app should function as a standalone application.
2. **Consistent naming**: Use kebab-case for app directory names.
3. **TypeScript**: Utilize TypeScript for type safety.

## Troubleshooting

If your new app doesn't appear:

1. Verify your directory structure matches `src/apps/my-new-app/`
2. Ensure you have an `index.html` file directly in the app directory
3. Check that the main entry script in `index.html` points to the correct file
4. Restart the dev server
5. Clear the cache with `npm run clean:cache`

## Example: Adding a Dashboard App

Here's a real-world example of adding a dashboard app:

```bash
# Create directory structure
mkdir -p src/apps/dashboard/components

# Create index.html
echo '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>' > src/apps/dashboard/index.html

# Create main.tsx
echo 'import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

if (import.meta.hot) {
  import.meta.hot.accept();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);' > src/apps/dashboard/main.tsx

# Create App.tsx
echo 'import React from "react";

const App: React.FC = () => {
  return (
    <div className="dashboard-app">
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard!</p>
    </div>
  );
};

export default App;' > src/apps/dashboard/App.tsx
```

Now you can access your dashboard at `http://localhost:3000/apps/dashboard/`.
