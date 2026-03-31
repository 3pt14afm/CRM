import '@fontsource/inter';
import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Toaster, toast } from 'react-hot-toast';

import ProjectDataProvider from './Context/ProjectContext';
import NoWheelNumberInput from './Components/NoWheelNumberInput';

createInertiaApp({
  title: (title) => `${title}`,
  resolve: (name) =>
    resolvePageComponent(
      [`./Pages/${name}.jsx`, `./Pages/${name}/index.jsx`],
      import.meta.glob('./Pages/**/*.jsx'),
    ),
  setup({ el, App, props }) {
    router.on('invalid', (event) => {
      const response = event.detail.response;

      if (response?.status === 403) {
        event.preventDefault();

        toast.remove();

        setTimeout(() => {
          toast.error(response?.data?.message || 'Forbidden', {
            duration: 2500,
          });
        }, 50);
      }
    });

    const WrappedApp = (
      <NoWheelNumberInput>
        <ProjectDataProvider>
          <Toaster position="top-center" />
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