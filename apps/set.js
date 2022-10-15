import plugin from '../../../lib/plugins/plugin.js'
import fs from "fs";
import lodash from "lodash";
import Common from "../components/Common.js";
import common from '../../../lib/common/common.js'
import cfg from "../../../lib/config/config.js";


export class NewConfig extends plugin {
    constructor() {
        super({
            name: '配置',
            event: 'message',
            priority: 2000,
            rule: [
                {
                    reg: '^#?椰奶设置(.*)(开启|关闭)$',
                    fnc: 'Config_manage'
                },
                {
                    reg: '^#?椰奶设置删除缓存时间(.*)$',
                    fnc: 'Config_deltime'
                },
                {
                    reg: '^#?通知设置$',
                    fnc: 'SeeConfig'
                },
                {
                    reg: '^#?椰奶设置$',
                    fnc: 'yenaiset'
                },
                {
                    reg: '^#?椰奶(启用|禁用)全部通知$',
                    fnc: 'SetAll'
                },
            ]
        })
    }

    // 更改配置
    async Config_manage(e) {
        if (!e.isMaster) return
        // 解析消息
        let index = e.msg.replace(/#|椰奶设置|开启|关闭/g, "")

        let groupCfg = cfg.getConfig('group')?.default

        if (groupCfg.onlyReplyAt == 1 && configs[index] == "groupRecall") {
            return e.reply('❎ 因您开启了"仅关注主动@机器人的消息"，群撤回监听无法生效!!!')
        }

        if (!configs.hasOwnProperty(index)) return
        // 开启还是关闭
        if (/开启/.test(e.msg)) {
            await redis.set(`yenai:notice:${configs[index]}`, "1").then(() => {
                logger.mark(`[椰奶]已启用${index}`)
            }).catch(err => {
                logger.error(`[椰奶]启用失败${index}`, err)
            })
        } else {
            await redis.del(`yenai:notice:${index}`).then(() => {
                logger.mark(`[椰奶]已禁用${index}`)
            }).catch(err => {
                logger.error(`[椰奶]禁用失败${index}`, err)
            })
        }
        this.yenaiset(e)
        return true;
    }

    // 设置删除缓存时间
    async Config_deltime(e) {
        if (!e.isMaster) return

        let time = e.msg.replace(/#|椰奶设置删除缓存时间/g, '').trim()

        time = time.match(/\d+/g)

        if (!time) return e.reply('❎ 请输入正确的时间(单位s)')

        if (time < 120) return e.reply('❎ 时间不能小于两分钟')

        await redis.set(`yenai:notice:deltime`, String(time[0])).then(() => {
            logger.mark(`[椰奶]设置删除缓存时间为${time[0]}`)
        }).catch(err => {
            logger.error(`[椰奶]设置删除缓存时间失败`, err)
        })

        this.yenaiset(e)
        return true;
    }

    async SetAll(e) {
        if (!e.isMaster) return
        let yes = false;
        if (/启用/.test(e.msg)) {
            yes = true;
        }
        let no = ["sese", "deltime", "notificationsAll"]

        let groupCfg = cfg.getConfig('group')?.default

        if (yes) {
            for (let i in configs) {
                if (no.includes(configs[i])) continue

                if (groupCfg.onlyReplyAt == 1 && configs[i] == "groupRecall") {
                    e.reply('❎ 因您开启了"仅关注主动@机器人的消息"，群撤回监听无法生效!!!')
                    continue
                }

                await redis.set(`yenai:notice:${configs[i]}`, "1").then(() => {
                    logger.mark(`[椰奶]已启用${i}`)
                }).catch(err => {
                    logger.error(`[椰奶]启用失败${i}`, err)
                })

                await common.sleep(200)
            }
        } else {
            for (let i in configs) {
                if (no.includes(configs[i])) continue
                await redis.del(`yenai:notice:${configs[i]}`).then(() => {
                    logger.mark(`[椰奶]已禁用${i}`)
                }).catch(err => {
                    logger.error(`[椰奶]禁用失败${i}`, err)
                })
                await common.sleep(200)
            }
        }
        this.yenaiset(e)
        return true;
    }
    async yenaiset(e) {
        if (!e.isMaster) return

        let config = {}
        for (let i in configs) {
            let res = await redis.get(`yenai:notice:${configs[i]}`)
            config[configs[i]] = res
        }

        let cfg = {
            //好友消息
            privateMessage: getStatus(config.privateMessage),
            //群消息
            groupMessage: getStatus(config.groupMessage),
            //群临时消息
            grouptemporaryMessage: getStatus(config.grouptemporaryMessage),
            //群撤回
            groupRecall: getStatus(config.groupRecall),
            //好友撤回
            PrivateRecall: getStatus(config.PrivateRecall),
            //好友申请
            friendRequest: getStatus(config.friendRequest),
            //群邀请
            groupInviteRequest: getStatus(config.groupInviteRequest),
            //群管理变动
            groupAdminChange: getStatus(config.groupAdminChange),
            //好友列表变动
            friendNumberChange: getStatus(config.friendNumberChange),
            //群聊列表变动
            groupNumberChange: getStatus(config.groupNumberChange),
            //群成员变动
            groupMemberNumberChange: getStatus(config.groupMemberNumberChange),
            //闪照
            flashPhoto: getStatus(config.flashPhoto),
            //禁言
            botBeenBanned: getStatus(config.botBeenBanned),
            //全部通知
            notificationsAll: getStatus(config.notificationsAll),
            //删除缓存时间
            deltime: Number(config.deltime),
            //默认状态
            state: getStatus(config.state),

            bg: await rodom(), //获取底图
        }
        //渲染图像
        return await Common.render("admin/index", {
            ...cfg,
        }, {
            e,
            scale: 1.5
        });
    }
}
const rodom = async function () {
    var image = fs.readdirSync(`./plugins/yenai-plugin/resources/admin/imgs/bg`);
    var list_img = [];
    for (let val of image) {
        list_img.push(val)
    }
    var imgs = list_img.length == 1 ? list_img[0] : list_img[lodash.random(0, list_img.length - 1)];
    return imgs;
}

const getStatus = function (rote) {
    if (rote) {
        return `<div class="cfg-status" >已开启</div>`;
    } else {
        return `<div class="cfg-status status-off">已关闭</div>`;
    }

}

const configs = {
    好友消息: "privateMessage",
    群消息: "groupMessage",
    群临时消息: "grouptemporaryMessage",
    群撤回: "groupRecall",
    好友撤回: "PrivateRecall",
    // 申请通知
    好友申请: "friendRequest",
    群邀请: "groupInviteRequest",
    // 信息变动
    群管理变动: "groupAdminChange",
    // 列表变动
    好友列表变动: "friendNumberChange",
    群聊列表变动: "groupNumberChange",
    群成员变动: "groupMemberNumberChange",
    // 其他通知
    闪照: "flashPhoto",
    禁言: "botBeenBanned",
    全部通知: "notificationsAll",
    删除缓存: "deltime",
    涩涩: "sese",
    状态: "state"
}