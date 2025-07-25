//@ts-check
import { world, Player } from '@minecraft/server';

/**
 * @param {Player} sender
 */
export const getAllPlayers = function(sender){
    let allPlayers = [];
    world.getPlayers().forEach((player)=>{
        if(sender.name != player.name) allPlayers.push(player.name);
    });

    return allPlayers;
};

/**
 * @param {string} name
 */
export const getPlayer = name => world.getPlayers({ name })[0];

/**
 * テレポートリクエスト管理クラス
 */
export class RequestManager {
    static #requestedMap = new Map();
    static #timeoutIdMap = new Map();

    /**
     * 指定されたプレイヤーのリクエストリストを取得
     * @param {string} playerName
     * @returns {string[]}
     */
    static getRequestList(playerName) {
        if (!this.#requestedMap.has(playerName)) {
            this.#requestedMap.set(playerName, []);
        }
        return this.#requestedMap.get(playerName);
    }

    /**
     * リクエストを追加
     * @param {string} targetPlayer リクエストを受け取るプレイヤー
     * @param {string} requesterPlayer リクエストを送るプレイヤー
     */
    static addRequest(targetPlayer, requesterPlayer) {
        const requestList = this.getRequestList(targetPlayer);
        if (!requestList.includes(requesterPlayer)) {
            requestList.push(requesterPlayer);
            this.#requestedMap.set(targetPlayer, requestList);
        }
    }

    /**
     * リクエストを削除
     * @param {string} targetPlayer リクエストを受け取っているプレイヤー
     * @param {string} requesterPlayer リクエストを送ったプレイヤー
     */
    static removeRequest(targetPlayer, requesterPlayer) {
        const requestList = this.getRequestList(targetPlayer);
        const newRequestList = requestList.filter(name => name !== requesterPlayer);
        this.#requestedMap.set(targetPlayer, newRequestList);
    }

    /**
     * リクエストが存在するかチェック
     * @param {string} targetPlayer リクエストを受け取っているプレイヤー
     * @param {string} requesterPlayer リクエストを送ったプレイヤー
     * @returns {boolean}
     */
    static hasRequest(targetPlayer, requesterPlayer) {
        const requestList = this.getRequestList(targetPlayer);
        return requestList.includes(requesterPlayer);
    }

    /**
     * タイムアウトIDを設定
     * @param {string} requestKey "${requester}=>${target}" 形式のキー
     * @param {number} timeoutId system.runTimeoutから返されるID
     */
    static setTimeoutId(requestKey, timeoutId) {
        this.#timeoutIdMap.set(requestKey, timeoutId);
    }

    /**
     * タイムアウトIDを取得
     * @param {string} requestKey "${requester}=>${target}" 形式のキー
     * @returns {number|undefined}
     */
    static getTimeoutId(requestKey) {
        return this.#timeoutIdMap.get(requestKey);
    }

    /**
     * タイムアウトIDを削除
     * @param {string} requestKey "${requester}=>${target}" 形式のキー
     */
    static deleteTimeoutId(requestKey) {
        this.#timeoutIdMap.delete(requestKey);
    }

    /**
     * 全てのリクエストをクリア（デバッグ用）
     */
    static clearAllRequests() {
        this.#requestedMap.clear();
        this.#timeoutIdMap.clear();
    }

    /**
     * 指定されたプレイヤーのリクエスト数を取得
     * @param {string} playerName
     * @returns {number}
     */
    static getRequestCount(playerName) {
        return this.getRequestList(playerName).length;
    }
}
