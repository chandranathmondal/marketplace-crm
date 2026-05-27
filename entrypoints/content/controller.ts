import { getAdapterForCurrentPage } from '../../adapters';
import type { ListingMountTarget } from '../../types/listing';
import { getListingKey } from '../../utils/listing-key';
import { getListingRecord } from '../../utils/listing-store';
import { clearCrmUi, closeModal, mountCrmButton, openListingModal } from './crm-ui';

export class MarketplaceCrmController {
  private observer: MutationObserver | null = null;
  private scanTimer: number | undefined;

  constructor(private readonly ctx: ContentScriptContext) {}

  run() {
    void this.refresh();

    this.ctx.addEventListener(window, 'wxt:locationchange', () => {
      void this.refresh();
    });

    this.observer = new MutationObserver(() => {
      if (this.scanTimer) {
        window.clearTimeout(this.scanTimer);
      }

      this.scanTimer = window.setTimeout(() => {
        void this.scanListTargets();
      }, 350);
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    this.ctx.onInvalidated(() => {
      this.observer?.disconnect();
      clearCrmUi();
    });
  }

  async refresh() {
    clearCrmUi();

    const adapter = getAdapterForCurrentPage();

    if (!adapter) {
      return;
    }

    if (adapter.isDetailPage(window.location.pathname)) {
      const target = adapter.findDetailMountTarget();

      if (target) {
        await this.attachTarget(target);
      }

      return;
    }

    await this.scanListTargets();
  }

  private async scanListTargets() {
    const adapter = getAdapterForCurrentPage();

    if (!adapter || adapter.isDetailPage(window.location.pathname)) {
      return;
    }

    const targets = adapter.findListMountTargets();

    for (const target of targets) {
      await this.attachTarget(target);
    }
  }

  private async attachTarget(target: ListingMountTarget) {
    await mountCrmButton(target, async (record) => {
      const hydrated = (await getListingRecord(target.listing)) ?? record;
      openListingModal(hydrated, async () => {
        await this.refreshTarget(target);
      });
    });
  }

  private async refreshTarget(target: ListingMountTarget) {
    document.querySelector(`[data-mcrm-key="${getListingKey(target.listing)}"]`)?.remove();
    await this.attachTarget(target);
    closeModal();
  }
}
