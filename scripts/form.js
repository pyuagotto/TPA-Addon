//@ts-check
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { system, Player, CustomCommandOrigin, CustomCommandStatus } from '@minecraft/server';
import config from './config.js';
import { getAllPlayers, getPlayer, RequestManager } from './utils.js';

const rts = config.requestTimeoutSec;

export class Form {
    /**
     * @param {CustomCommandOrigin} origin
     * @returns { { status: CustomCommandStatus, message?: string }}
     */
    static firstMenu(origin){
        if(origin.sourceEntity instanceof Player){
            const player = origin.sourceEntity;

            const actionForm = new ActionFormData();
            actionForm.title("テレポートメニュー");
            actionForm.button("リクエストを送る");
            actionForm.button("リクエストを受け取る");

            system.run(()=>{
                //@ts-ignore
                actionForm.show(player).then((data)=>{    
                    switch(data.selection){
                        case 0: 
                            this.requestSendMenu(player);
                            break;

                        case 1:
                            this.requestAccpetMenu(player);
                            break;
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
    static requestSendMenu(sender){
        let allPlayersList = getAllPlayers(sender);

        if(allPlayersList.length != 0){
            let selectedPlayerName = "";

            const modalForm = new ModalFormData();
            modalForm.title("リクエストを送る");
            modalForm.dropdown("プレイヤー一覧", allPlayersList, { defaultValueIndex: 0 });

            //@ts-ignore
            modalForm.show(sender).then((data)=>{
                if(data.formValues && typeof(data.formValues[0]) == "number") selectedPlayerName = allPlayersList[data.formValues[0]];
        
                //リクエストを送信したプレイヤーの、リクエスト済みプレイヤーリストを取得
                if(!RequestManager.hasRequest(selectedPlayerName, sender.name)){
                    //メッセージを送る
                    sender.sendMessage(`§6${selectedPlayerName} にテレポートリクエストを送りました§r`);
                    getPlayer(selectedPlayerName).sendMessage(`§b${sender.name} からテレポートリクエストを受け取りました\nリクエストは${rts}秒で自動的に期限切れになります`);
        
                    RequestManager.addRequest(selectedPlayerName, sender.name);
                    
                    //時間経過で自動敵にリクエストリストから削除
                    const runId = system.runTimeout(()=>{
                        RequestManager.removeRequest(selectedPlayerName, sender.name);
                        RequestManager.deleteTimeoutId(`${sender.name}=>${selectedPlayerName}`);
                    }, rts * 20);
        
                    //clearRun用のIdを保存
                    RequestManager.setTimeoutId(`${sender.name}=>${selectedPlayerName}`, runId);
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
    static requestAccpetMenu(sender){
        let playersList = RequestManager.getRequestList(sender.name);
        
        if(playersList.length != 0){
            const actionForm = new ActionFormData();
            actionForm.title("リクエストを受け取る");
            
            for(let i = 0; i < playersList.length; i++){
                actionForm.button(`${playersList[i]}からのリクエストを受け取る`);
            }

            //@ts-ignore
            actionForm.show(sender).then((data)=>{
                if(data.selection == undefined) return;
                const playerName = playersList[data.selection];

                if(RequestManager.hasRequest(sender.name, playerName)){
                    getPlayer(playerName)?.teleport(sender.location, { dimension: sender.dimension });

                    //メッセージを送る
                    sender.sendMessage(`§a${playerName} からのテレポートリクエストを承諾しました§r`);
                    getPlayer(playerName).sendMessage(`§a${sender.name} がテレポートリクエストを承諾しました§r`);
        
                    //リクエスト済みプレイヤーリストから削除
                    RequestManager.removeRequest(sender.name, playerName);
        
                    //時間経過以内に承諾された場合、runTimeoutの処理を止める
                    const id = RequestManager.getTimeoutId(`${playerName}=>${sender.name}`);
                    if (id !== undefined) {
                        system.clearRun(id);
                    }
                    
                    RequestManager.deleteTimeoutId(`${playerName}=>${sender.name}`);
                }else{
                    sender.sendMessage("§cリクエストが期限切れです！！");
                }
            });
        }else{
            sender.sendMessage("§c受け取り済みのテレポートリクエストは存在しません！！");
        }
    }
}