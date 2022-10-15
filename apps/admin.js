import plugin from '../../../lib/plugins/plugin.js'
import { createRequire } from "module"
import { execSync } from 'child_process'
import { update } from '../../other/update.js'
import { Version, Common, Plugin_Name } from '../components/index.js'

/**
 * 全局
 */
const require = createRequire(import.meta.url)
const { exec } = require("child_process")
const _path = process.cwd()
let timer
/**
 * 管理员
 */
export class admin extends plugin {
    constructor() {
        super({
            name: "版本信息",
            event: "message",
            priority: 400,
            rule: [
                {
                    reg: '^#?椰奶(插件)?版本$',
                    fnc: 'plugin_version',
                },
                {
                    reg: '^#?椰奶(插件)?更新日志$',
                    fnc: 'update_log',
                },
            ],
        });
        this.key = "yenai:restart";
    }

    async plugin_version() {
        return versionInfo(this.e);
    }

    async update_log() {
        let Update_Plugin = new update();
        Update_Plugin.e = this.e;
        Update_Plugin.reply = this.reply;

        if (Update_Plugin.getPlugin(Plugin_Name)) {
            this.e.reply(await Update_Plugin.getLog(Plugin_Name));
        }
        return true;
    }
}


async function versionInfo(e) {
    return await Common.render('help/version-info', {
        currentVersion: Version.ver,
        changelogs: Version.logs,
        elem: 'cryo'
    }, { e, scale: 1.2 })
}