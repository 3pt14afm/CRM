import '@fontsource/inter';
import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';
// import { Toaster, toast } from 'react-hot-toast';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

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

        toast.dismiss();

        setTimeout(() => {
          toast.error(response?.data?.message || 'Forbidden', {
            duration: 1000,
          });
        }, 50);
      }
    });

    const WrappedApp = (
      <NoWheelNumberInput>
        <ProjectDataProvider>
          <Toaster
            position="top-center"
            visibleToasts={2}
            duration={2000}
            richColors
            toastOptions={{
              classNames: {
                toast: 'bg-zinc-900 border border-zinc-700 text-white rounded-2xl shadow-xl',
                title: 'text-sm font-semibold',
                description: 'text-sm text-zinc-400',
                success: 'bg-green-950 border border-green-800/60 text-green-100 [&_[data-icon]]:text-green-400',
                error: 'border-l-4 border-l-red-500',
              },
            }}
/>
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