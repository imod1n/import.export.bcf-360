import { getCurrentInstance } from 'vue';
import type { Context } from 'albatros';

export function useCtx() {
    const instance = getCurrentInstance()!;
    const ctx = (): Context => instance.appContext.config.globalProperties.$ctx() as Context;
    const tr = (msg: string, ...args: any[]): string =>
        instance.appContext.config.globalProperties.$tr(msg, ...args) as string;
    return { ctx, tr };
}
