import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <meta name="theme-color" content="#F8FAFC" />

        {/* iOS PWA Standalone Full-screen meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CatatKas" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: 'Ionicons';
                src: url('/assets/assets/fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf') format('truetype'),
                     url('https://unpkg.com/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
                font-display: swap;
              }
              @font-face {
                font-family: 'ionicons';
                src: url('/assets/assets/fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf') format('truetype'),
                     url('https://unpkg.com/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
                font-display: swap;
              }
              *, *::before, *::after {
                box-sizing: border-box !important;
                -webkit-tap-highlight-color: transparent !important;
              }
              html, body, #root {
                width: 100%;
                min-height: 100%;
                margin: 0;
                padding: 0;
                background-color: #F8FAFC;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                overflow-x: hidden;
              }
              input, textarea, select, button {
                outline: none !important;
                outline-width: 0 !important;
                box-shadow: none !important;
                font-family: inherit;
              }
              input:focus, textarea:focus, select:focus, button:focus {
                outline: none !important;
                outline-width: 0 !important;
                box-shadow: none !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
