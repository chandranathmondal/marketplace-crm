export default {
    manifest_version: 3,
    name: 'Marketplace CRM',
    version: '1.0.0',
    description: 'CRM for marketplace listings',
    icons: {
      '16': '/icon/16.png',
      '32': '/icon/32.png',
      '48': '/icon/48.png',
      '96': '/icon/96.png',
      '128': '/icon/128.png'
    },
    permissions: ['storage', 'activeTab'],
    host_permissions: [
      '*://*.olx.in/*',
      '*://*.magicbricks.com/*',
      '*://*.99acres.com/*',
      'https://script.google.com/*',
      'https://script.googleusercontent.com/*'
    ],
    action: {
      default_popup: 'popup.html',
      default_icon: {
        '16': '/icon/16.png',
        '32': '/icon/32.png',
        '48': '/icon/48.png',
        '96': '/icon/96.png',
        '128': '/icon/128.png'
      }
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: false
    }
  };
