import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';

import ProjectDataProvider from './Context/ProjectContext';
import NoWheelNumberInput from './Components/NoWheelNumberInput';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.jsx`,
      import.meta.glob('./Pages/**/*.jsx'),
    ),
  setup({ el, App, props }) {
    const WrappedApp = (
      <NoWheelNumberInput>
        <ProjectDataProvider>
          <App {...props} />
        </ProjectDataProvider>
      </NoWheelNumberInput>
    );

    if (import.meta.env.SSR) {
      hydrateRoot(el, WrappedApp);
      return;
    }

    createRoot(el).render(WrappedApp);
  },
  progress: {
    color: '#289800',
  },
});
