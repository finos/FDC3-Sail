import './App.css';
import logo from '../assets/logo.svg';
import ElectronVersions from './components/ElectronVersions';
import ReactiveCounter from './components/ReactiveCounter';
import ReactiveHash from './components/ReactiveHash';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <p>Hello Electron + Vite + React!</p>

        <ReactiveCounter />

        <p>
          Edit <code>packages/renderer/src/App.tsx</code> to test HMR updates.
        </p>

        <p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            React
          </a>
          {' | '}
          <a
            className="App-link"
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vite
          </a>
          {' | '}
          <a
            className="App-link"
            href="https://github.com/cawa-93/vite-electron-builder"
            target="_blank"
            rel="noopener noreferrer"
          >
            vite-electron-builder
          </a>
        </p>

        <fieldset>
          <legend>Exposing Node.js API</legend>
          <ReactiveHash />
        </fieldset>

        <fieldset>
          <legend>Environment</legend>
          <ElectronVersions />
        </fieldset>
      </header>
    </div>
  );
}

export default App;
