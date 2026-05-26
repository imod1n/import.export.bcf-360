import type { Context } from 'albatros';
import { createApp } from 'vue';
import BcfPanel from './panels/BcfPanel.vue';

export default {
    mountBcfPanel: (ctx: Context): void => {
        const el = (ctx as any).el as HTMLElement | undefined;
        if (!el) return;
        const app = createApp(BcfPanel);
        app.config.globalProperties.$ctx = () => ctx;
        app.config.globalProperties.$tr = (msg: string, ...args: any[]) => ctx.tr(msg, ...args);
        app.mount(el);
    },

    showBcfPanelCmd: (ctx: Context): void => {
        const panelBar = (ctx as any).manager?.panelBar;
        if (!panelBar) return;
        const target = panelBar.views?.find((v: any) => v.id?.includes('bcfContainer'));
        if (!target) return;
        const isActive = panelBar.visible && panelBar.activeView === target;
        if (isActive) {
            panelBar.visible = false;
        } else {
            panelBar.visible = true;
            panelBar.activeView = target;
        }
    },
} satisfies Record<string, (ctx: Context) => unknown>;
