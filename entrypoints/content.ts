import { MarketplaceCrmController } from './content/controller';
import './content/crm.css';

export default defineContentScript({
  matches: [
    '*://*.olx.in/*',
    '*://*.magicbricks.com/*',
    '*://*.99acres.com/*',
  ],
  main(ctx) {
    const controller = new MarketplaceCrmController(ctx);
    controller.run();
  },
});
