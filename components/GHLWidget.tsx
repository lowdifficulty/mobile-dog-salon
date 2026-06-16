import Script from "next/script";

export default function GHLWidget() {
  return (
    <Script
      src="https://widgets.leadconnectorhq.com/loader.js"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id="6a022b8d5cec69da1232f673"
      data-source="WEB_USER"
      strategy="afterInteractive"
    />
  );
}
