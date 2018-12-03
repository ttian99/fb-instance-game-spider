const _ = require('lodash');
const path = require('path');
const utils = require('./utils');
const fs = require('fs-extra');

/** 格式化每条记录 */
function formatItem(item) {
    let player_count = item.player_count;
    // player_count = item.player_count;
    item.id = _.trim(item.id) + '\t';
    item.developer_name = item.developer_name + '';
    item.game_name = item.game_name + '';
    item.player_count = player_count + '';
    return item;
}

/** 获取排行榜 并且格式化数据 */
async function getCurRank(arr) {
    let promiseArr = [];
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        item = formatItem(item);
        item.rank = i + 1;
        promiseArr.push(Promise.resolve);
    }

    return Promise.all(promiseArr).then(() => {
        // sortArray(arr);
        return arr;
    }).catch((err) => console.error(err));
    // return new Promise(async (resolve) => {

    //     // arr = sortArray(arr);
    //     resolve(arr);
    // });
}

/** 排序：依据玩家数量player_count */
function sortArray(arr) {
    arr.sort(function (obj1, obj2) {
        let count1 = obj1.player_count || '0';
        let count2 = obj2.player_count || '0';
        count1 = Number(count1.replace(/,/g, ''));
        count2 = Number(count2.replace(/,/g, ''));
        return count2 - count1;
    });
    return arr;
}
/** 与上周比较排名变化情况 */
function compareRank(curWeekArr, lastWeekArr) {
    return new Promise((resolve) => {
        let nArr = [];
        for (let i = 0; i < curWeekArr.length; i++) {
            let item = curWeekArr[i];
            const id = Number(item.id);
            const lastItem = _.find(lastWeekArr, function (obj) {
                const findId = Number(obj.id);
                let findIdStr = findId + '';
                let idStr = id + '';
                findIdStr = findIdStr.substring(0, findIdStr.length - 1);
                idStr = idStr.substring(0, idStr.length - 1);
                return findIdStr == idStr;
            });
            if (lastItem) {
                item.lastRank = lastItem.rank;
                item.delRank = -(Number(item.rank) - Number(item.lastRank));
            } else {
                item.lastRank = '';
                item.delRank = 'new';
            }
            // await sleep(1);
            nArr[i] = item;
        }
        resolve(nArr);
    });
}

/** 修正部分游戏的类型 */
async function correctGameType(arr) {
    return new Promise(async (resolve) => {
        for (let i = 0; i < arr.length; i++) {
            const item = await arr[i];
            const gameName = item.game_name;
            switch (gameName) {
                case 'Jelly Crush':
                    item.app_center_categories = '消消乐';
                    break;
                case 'EvoWars':
                case 'Snake Mania':
                case 'BrutalMania.io':
                case 'minesweeper.io':
                case 'Cocky.io':
                case 'Cyclewars.io':
                case 'Fish.io':
                case 'Happy Trailz.io':
                case 'Bricks Breaker':
                case 'Bump.io':
                    item.app_center_categories = '多人在线战术竞技';
                    break;
                default:
                    break;
            }
        }
        resolve(arr);
    });
}

// 获取排名
async function getDelRank() {
    const files = await utils.getFilesArr(path.join(__dirname, '../data-format'));
    const curWeekFile = files[files.length - 1];
    const lastWeekFile = files[files.length - 2];
    console.log('curWeekFile: ' + curWeekFile);
    console.log('lastWeekFile: ' + lastWeekFile);
    let curWeekArr = await utils.importCsvToJson(curWeekFile, 'gbk');
    curWeekArr = await correctGameType(curWeekArr);
    curWeekArr = await sortArray(curWeekArr);
    curWeekArr = await getCurRank(curWeekArr);
    const lastWeekArr = await utils.importCsvToJson(lastWeekFile, 'gbk');
    const newCurWeekArr = await compareRank(curWeekArr, lastWeekArr);
    await utils.exportJsonToCsv(curWeekFile, newCurWeekArr);
    await utils.utf8ToGbk(curWeekFile, curWeekFile);
    const destPath = path.join(__dirname, '../out', path.basename(curWeekFile));
    fs.copyFileSync(curWeekFile, destPath);
    console.log('getDelRank over');
    return;
}

// getDelRank();
// correctAllFiles();

module.exports = getDelRank;