import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/core/auth/AuthContext';
import { ThemeProvider } from '@/core/theme/ThemeContext';
import { ConfirmProvider } from '@/core/notifications/ConfirmDialogContext';
import { ToastContainer, ToastProvider } from '@/core/notifications/ToastContext';
import '@/styles/index.css';
import '@/styles/login.css';
import '@/styles/charts.css';
import '@/styles/theme-toggle.css';
import '@/styles/theme-transition.css';
import '@/styles/welcome.css';
import '@/styles/motion.css';
import '@/styles/confirm-dialog.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Component {...pageProps} />
            <ToastContainer />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
