import Script from "next/script";

/**
 * Go High Level A2P verification loader for /book only.
 * Chat bubble is hidden via CSS in globals.css (.book-page-a2p-root).
 */
export default function BookPageA2PScript() {
  return (
    <Script
      id="ghl-a2p-loader"
      src="https://widgets.leadconnectorhq.com/loader.js"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id="6a022b8d5cec69da1232f673"
      data-source="WEB_USER"
      strategy="afterInteractive"
    />
  );
}
