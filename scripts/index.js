//@ts-check
import { world, system, CustomCommandOrigin, CustomCommandStatus, CommandPermissionLevel } from '@minecraft/server';
import { Form } from './form.js';
import config from './config.js';

const rts = config.requestTimeoutSec;

system.beforeEvents.startup.subscribe((ev) => {
    /**
     * @param {string} name 
     * @param {string} description 
     * @param {(origin: CustomCommandOrigin) => { status: CustomCommandStatus }} callback 
     */
    const registerCommand = function(name, description, callback) {
        ev.customCommandRegistry.registerCommand(
            {
                name,
                description,
                permissionLevel: CommandPermissionLevel.Any,
            },
            callback
        );
    };

    registerCommand(
        "pyuagotto:tpa",
        "TPAメニューを開きます",
        Form.firstMenu.bind(Form)
    );
});

world.afterEvents.worldLoad.subscribe(()=>{
    if(rts < 0) world.sendMessage("§cscripts/config.js\nrequestTimeoutSecは0以上にしてください！！§r");
});