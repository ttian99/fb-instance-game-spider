const glob = require('glob');
const moment = require('moment');
const csvtojson = require('csvtojson');
const _ = require('lodash');
const fs = require('fs-extra');
const iconv = require('iconv-lite');
const fastcsv = require('fast-csv');
const path = require('path');

/** 格式化每条记录 */
function formatItem(item) {
    let player_count = item.player_count;
    // console.log('player_count = ' + player_count);
    if ((/万/g).test(player_count)) { // 将人数的“万”转换为具体数字
        let num = player_count.replace('万', '');
        num = _.trim(num);
        num = num.replace(/,/g, '');
        num = Number(num);
        num = num * 10000;
        player_count = num.toLocaleString();
    }
    item.id = _.trim(item.id) + "\x20";
    item.developer_name = item.developer_name + "";
    item.game_name = item.game_name + "";
    item.player_count = player_count + "";
    return item;
}

/** 获取文件名称 */
function getFileTime(name) {
    let temp = name;
    temp = temp.replace('facebook.', '');
    temp = temp.replace('.new.csv', '');
    return moment(temp, 'YYYY.MM.DD').valueOf();
}

/** 获取文件列表数组 */
async function getFilesArr(root, cb) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(root, '*.csv');
        glob(filePath, (err, files) => {
            files.sort((a, b) => {
                const timeA = getFileTime(a);
                const timeB = getFileTime(b);
                return timeA - timeB;
            })
            // cb(files);
            resolve(files);
        });
    })
}

/** 加载csv数据为json */
function importCsvToJson(fileName, code = 'utf8') {
    return new Promise((resolve, reject) => {
        // csvtojson()
        //     .fromFile(fileName)
        //     .then((jsonObj) => resolve(jsonObj))
        if (code == 'gbk') {
            fs.readFile(fileName, (err, data) => {
                if (err) throw err;
                data = iconv.decode(data, 'gbk');
                csvtojson().fromString(data)
                    .then(jsonObj => resolve(jsonObj))
            })
        } else {
            csvtojson()
                .fromFile(fileName)
                .then((jsonObj) => {
                    resolve(jsonObj);
                })
        }
    })

}

/** 获取排行榜 并且格式化数据 */
async function getCurRank(arr) {
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i];
            item = await formatItem(item);
            item.rank = i + 1;
        }
        arr = sortArray(arr);
        resolve(arr);
    })
}

/** 导出json数据到csv */
async function exportJsonToCsv(filePath, jsonObj) {
    return new Promise((resolve, reject) => {
        var ws = fs.createWriteStream(filePath);
        ws.on('close', resolve);
        fastcsv
            .write(jsonObj, { headers: true })
            .pipe(ws);
    });
}

/** utf8转码GBK */
function utf8ToGbk(srcPath, destPath) {
    console.log('srcPath = ' + srcPath + ' , destPath = ' + destPath);
    return new Promise((resolve, reject) => {
        if (destPath instanceof Function) {
            destPath = srcPath;
            cb = destPath;
        }
        fs.readFile(srcPath, function (err, data) {
            data = iconv.encode(data, 'gbk');
            fs.writeFile(destPath, data, function (error) {
                if (error) throw error;
                console.log(' over ');
                resolve();
            });
        });
    })
}

/** 排序：依据玩家数量player_count */
function sortArray(arr) {
    arr.sort(function (obj1, obj2) {
        let count1 = obj1.player_count;
        let count2 = obj2.player_count;
        if (!count1) {
            return 1;
        }
        if (!count2) {
            return -1;
        }
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
        resolve(nArr)
    })
}

async function getDelRank(arr) {
    const files = await getFilesArr('rawData');
    const curWeekFile = files[files.length - 1];
    const lastWeekFile = files[files.length - 2];
    console.log('curWeekFile: ' + curWeekFile);
    console.log('lastWeekFile: ' + lastWeekFile);
    let curWeekArr = await importCsvToJson(curWeekFile);
    curWeekArr = await getCurRank(curWeekArr);
    curWeekArr = await sortArray(curWeekArr);
    curWeekArr = await correct3GameType(curWeekArr);
    const lastWeekArr = await importCsvToJson(lastWeekFile);
    const newCurWeekArr = await compareRank(curWeekArr, lastWeekArr)
    await exportJsonToCsv(curWeekFile, newCurWeekArr);
    const destPath = path.join('formatData', path.basename(curWeekFile))
    utf8ToGbk(curWeekFile, destPath);
    console.log('getDelRank over');
}

/** 修正3个游戏的类型 */
async function correct3GameType(arr) {
    return new Promise(async (resolve) => {
        for (let i = 0; i < arr.length; i++) {
            const item = await arr[i];
            if (item.game_name == 'Jelly Crush') {
                item.app_center_categories = '消消乐';
            } else if (item.game_name == 'EvoWars') {
                item.app_center_categories = '多人在线战术竞技';
            } else if (item.game_name == 'Snake Mania') {
                item.app_center_categories = '多人在线战术竞技';
            }
        }
        resolve(arr);
    })
}

// 修正所有文件
async function correctAllFiles() {
    const files = await getFilesArr('formatData');
    for (let i = 0; i < files.length; i++) {
        const curWeekFile = files[i];
        console.log('curWeekFile: ' + curWeekFile);
        let curWeekArr = await importCsvToJson(curWeekFile, 'gbk');
        curWeekArr = await correct3GameType(curWeekArr);
        const newFileName = path.join('formatData', 'format.' + path.basename(curWeekFile));
        await exportJsonToCsv(newFileName, curWeekArr);
        await utf8ToGbk(newFileName, curWeekFile);
        fs.remove(newFileName);
    }
}
// getDelRank();

correctAllFiles();


