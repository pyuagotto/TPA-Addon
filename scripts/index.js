//@ts-check
import { world, system, Player, CustomCommandOrigin, CustomCommandStatus, CommandPermissionLevel } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import config from './config.js';

let requestedMap = new Map();
let timeoutIdMap = new Map();

const rts = config.requestTimeoutSec;

/**
 * @param {Player} sender
 */
const getAllPlayers = function(sender){
    let allPlayers = [];
    world.getPlayers().forEach((player)=>{
        if(sender.name != player.name) allPlayers.push(player.name);
    });

    return allPlayers;
};

/**
 * @param {string} name
 */
const getPlayer = name => world.getPlayers({ name })[0];

/**
 * @param {CustomCommandOrigin} origin
 * @returns { { status: CustomCommandStatus, message?: string }}
 */
const firstFormMenu = function(origin){
    if(origin.sourceEntity instanceof Player){
        const player = origin.sourceEntity;

        const actionForm = new ActionFormData();
        actionForm.title("テレポートメニュー");
        actionForm.button("リクエストを送る");
        actionForm.button("リクエストを受け取る");

        system.run(()=>{
            actionForm.show(player).then((data)=>{      
                //リクエストを送る
                if(data.selection == 0){
                    requestSendMenu(player);
                }
                
                //リクエストを受け取る
                else if(data.selection == 1){
                    requestAccpetMenu(player);
                }
            });
        })
        
        return { status: CustomCommandStatus.Success };
    }else{
        return { status: CustomCommandStatus.Failure, message: "コマンドはプレイヤーから実行してください" };
    }
};

/**
 * @param {Player} sender
 */
const requestSendMenu = function(sender){
    let allPlayersList = getAllPlayers(sender);

    if(allPlayersList.length != 0){
        let selectedPlayerName = "";

        const modalForm = new ModalFormData();
        modalForm.title("リクエストを送る");
        modalForm.dropdown("プレイヤー一覧", allPlayersList, { defaultValueIndex: 0 });
        modalForm.show(sender).then((data)=>{
            if(data.formValues && typeof(data.formValues[0]) == "number") selectedPlayerName = allPlayersList[data.formValues[0]];
    
            //リクエストを送信したプレイヤーの、リクエスト済みプレイヤーリストを取得
            let playersList = requestedMap.get(selectedPlayerName);
            if(!playersList.includes(sender.name)){
                //メッセージを送る
                sender.sendMessage(`§6${selectedPlayerName} にテレポートリクエストを送りました§r`);
                getPlayer(selectedPlayerName).sendMessage(`§b${sender.name} からテレポートリクエストを受け取りました\nリクエストは${rts}秒で自動的に期限切れになります`);
    
                playersList.push(sender.name);
                requestedMap.set(selectedPlayerName,playersList);
                
                //時間経過で自動敵にリクエストリストから削除
                const runId = system.runTimeout(()=>{
                    let playersList = requestedMap.get(selectedPlayerName);
                    let newPlayersList = playersList.filter((value) => value !== sender.name);
    
                    requestedMap.set(selectedPlayerName,newPlayersList);
                    timeoutIdMap.delete(`${sender.name}=>${selectedPlayerName}`);
                },rts * 20);
    
                //clearRun用のIdを保存
                timeoutIdMap.set(`${sender.name}=>${selectedPlayerName}`, runId);
            }else{
                sender.sendMessage(`§c${selectedPlayerName} へのテレポートリクエストは送信済みです！！§r`);
            }
        });
    }else{
        sender.sendMessage("§cテレポートをリクエスト可能なプレイヤーが存在しません！！");
    }
};

/**
 * @param {Player} sender
 */
const requestAccpetMenu = function(sender){
    let playersList = requestedMap.get(sender.name);
    
    if(playersList.length != 0){
        const actionForm = new ActionFormData();
        actionForm.title("リクエストを受け取る");
        for(let i = 0; i < playersList.length; i++){
            actionForm.button(`${playersList[i]}からのリクエストを受け取る`);
        }

        actionForm.show(sender).then((data)=>{
            if(data.selection == undefined) return;
            const playerName = playersList[data.selection];

            if(requestedMap.get(sender.name).includes(playerName)){
                //2024/08/14 異なるdimension間でのtpができなかった問題を修正
                getPlayer(playerName)?.teleport(sender.location, { dimension: sender.dimension });

                //メッセージを送る
                sender.sendMessage(`§a${playerName} からのテレポートリクエストを承諾しました§r`);
                getPlayer(playerName).sendMessage(`§a${sender.name} がテレポートリクエストを承諾しました§r`);
    
                //リクエスト済みプレイヤーリストから削除
                let newPlayersList = playersList.filter((value) => value !== playerName);
                requestedMap.set(sender.name,newPlayersList);
    
                //時間経過以内に承諾された場合、runTimeoutの処理を止める
                const id = timeoutIdMap.get(`${playerName}=>${sender.name}`);
                system.clearRun(id);
                timeoutIdMap.delete(`${playerName}=>${sender.name}`);
            }else{
                sender.sendMessage("§cリクエストが期限切れです！！");
            }
        });
    }else{
        sender.sendMessage("§c受け取り済みのテレポートリクエストは存在しません！！");
    }
}

system.beforeEvents.startup.subscribe((ev) => {
    /**
     * 
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
        firstFormMenu
    );
});

world.afterEvents.playerJoin.subscribe((ev) => {
    const { playerName } = ev;
    requestedMap.set(playerName,[]);
});

world.afterEvents.worldLoad.subscribe(()=>{
    if(rts < 0) world.sendMessage("§cscripts/config.js\nrequestTimeoutSecは0以上にしてください！！§r");
    
    for(const player of world.getPlayers()){
        requestedMap.set(player.name,[]);
    }
});