import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  env: {
    apiDefinitions: {
      MARKETPLACE_CRM_APPS_SCRIPT_URL: 'string',
      MARKETPLACE_CRM_SPREADSHEET_ID: 'string',
    }
  },
  manifest: {
    name: "Marketplace CRM",
    description: "CRM for marketplace listings",
    icons: {
      "16": "/icon/16.png",
      "32": "/icon/32.png",
      "48": "/icon/48.png",
      "96": "/icon/96.png",
      "128": "/icon/128.png"
    },
    action: {
      default_title: "Marketplace CRM",
      default_icon: {
        "16": "/icon/16.png",
        "32": "/icon/32.png",
        "48": "/icon/48.png",
        "96": "/icon/96.png",
        "128": "/icon/128.png"
      }
    },
    permissions: ["storage", "activeTab"],
    host_permissions: [
      "*://*.olx.in/*",
      "*://*.magicbricks.com/*",
      "*://*.99acres.com/*",
      "https://script.google.com/*",
      "https://script.googleusercontent.com/*"
    ]
  }
});
