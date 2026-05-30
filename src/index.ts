import type { Context } from 'albatros';
import { createApp } from 'vue';
import BcfPanel from './panels/BcfPanel.vue';
import { store } from './store';

export default {
    mountBcfPanel: async (ctx: Context): Promise<void> => {
        const el = (ctx as any).el as HTMLElement | undefined;
        if (!el) return;

        const saved = await ctx.extension.settings('bcf_prefs').get<string>('username');
        if (saved) store.username = saved;

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

    bcfNewCmd: (ctx: Context): void => {
        store.pendingAction = 'create';
        const panelBar = (ctx as any).manager?.panelBar;
        if (panelBar) {
            const target = panelBar.views?.find((v: any) => v.id?.includes('bcfContainer'));
            if (target) { panelBar.visible = true; panelBar.activeView = target; }
        }
    },

    bcfOpenFileCmd: (ctx: Context): void => {
        store.pendingAction = 'open';
        const panelBar = (ctx as any).manager?.panelBar;
        if (panelBar) {
            const target = panelBar.views?.find((v: any) => v.id?.includes('bcfContainer'));
            if (target) { panelBar.visible = true; panelBar.activeView = target; }
        }
    },

    setUsernameCmd: async (ctx: Context): Promise<void> => {
        const current = store.username || (ctx.manager as any)?.username || 'Unknown';

        const choice = await ctx.showQuickPick(
            [
                { label: 'Текущий пользователь', description: current },
                { label: 'Изменить пользователя' },
            ],
            { title: 'Имя пользователя', placeHolder: 'Выберите действие' },
        );

        if (!choice || (choice as any).label !== 'Изменить пользователя') return;

        const newName = await ctx.showInputBox({
            title: 'Имя пользователя',
            prompt: 'Введите имя, которое будет указано автором замечаний и комментариев',
            value: store.username || '',
            placeHolder: 'Например: Иван Петров',
            validateInput: (v: string) => v.trim() ? undefined : 'Имя не может быть пустым',
        });

        if (newName?.trim()) {
            store.username = newName.trim();
            await ctx.extension.settings('bcf_prefs').set('username', store.username);
        }
    },
} satisfies Record<string, (ctx: Context) => unknown>;
