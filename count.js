/**
 * 统计类
 *
 */
const glob = require('glob');
const path = require('path');
const csvtojson = require('csvtojson');
var moment = require('moment');
const iconv = require('iconv-lite');
const _ = require('lodash');
const fs = require('fs-extra');
const fastcsv = require('fast-csv');

/** 获取文件名称 */
function getFileTime(name) {
    let temp = name;
    temp = temp.replace('facebook.', '');
    temp = temp.replace('.new.csv', '');
    return moment(temp, 'YYYY.MM.DD').valueOf();
}

/** 获取文件列表数组 */
async function getFilesArr(root) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(root, '*.csv');
        glob(filePath, (err, files) => {
            files.sort((a, b) => {
                const timeA = getFileTime(a);
                const timeB = getFileTime(b);
                return timeA - timeB;
            })
            resolve(files);
        });
    })
}
/** 加载csv数据为json */
function importCsvToJson(fileName) {
    return new Promise((resolve, reject) => {
        // csvtojson()
        //     .fromFile(fileName)
        //     .then((jsonObj) => resolve(jsonObj))
        fs.readFile(fileName, (err, data) => {
            if (err) throw err;
            data = iconv.decode(data, 'gbk');
            csvtojson().fromString(data)
                .then(jsonObj => resolve(jsonObj))
        })
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

// 获取范围：1000w, 500w, 200w, 100w, 10w, 1w, 1k, 1000以下和其他
function getLevel(count) {
    let level = '0k';
    if (count >= 10000000) {
        level = '1000w';
    } else if (count < 10000000 && count >= 5000000) {
        level = '500w';
    } else if (count < 5000000 && count >= 2000000) {
        level = '200w';
    } else if (count < 2000000 && count >= 1000000) {
        level = '100w';
    } else if (count < 1000000 && count >= 100000) {
        level = '10w';
    } else if (count < 100000 && count >= 10000) {
        level = '1w';
    } else if (count < 10000 && count >= 1000) {
        level = '1k';
    } else {
        level = '0k';
    }
    return level;
}

function getDefaultItem() {
    return {
        '类型': '',
        '游戏款数': 0,
        'MAU': 0,
        '款均MAU': 0,
        '1000w': 0,
        '500w': 0,
        '200w': 0,
        '100w': 0,
        '10w': 0,
        '1w': 0,
        '1k': 0,
        '0k': 0
    }
}

/** */
function sortByMau(arr) {
    arr.sort(function (obj1, obj2) {
        let count1 = obj1.MAU;
        let count2 = obj2.MAU;
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

async function total(arr) {
    let result = {};
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        // 人数
        let count = _.trim(item.player_count) || '0';
        // console.log(count);
        count = count.replace(/,/g, '');
        count = Number(count);
        // 范围
        const level = await getLevel(count);
        // 类型
        let type = item.app_center_categories || '其他';
        if (!({}).hasOwnProperty.call(result, type)) {
            // console.log(type);
            result[type] = getDefaultItem();
        }
        result[type][level]++;
        result[type]['游戏款数']++;
        result[type]['MAU'] += count;
    }
    // console.log(result);

    const resultArr = [];
    const keyArr = Object.keys(result);
    const keyLen = keyArr.length;
    const totalObj = getDefaultItem();
    totalObj['类型'] = '总计';
    for (let i = 0; i < keyLen; i++) {
        const key = await keyArr[i];
        resultArr[i] = result[key];
        resultArr[i]['类型'] = key;
        resultArr[i]['款均MAU'] = Math.round(resultArr[i]['MAU'] / resultArr[i]['游戏款数']).toLocaleString();
        // 计算总和
        totalObj['游戏款数'] += resultArr[i]['游戏款数'];
        totalObj['MAU'] += resultArr[i]['MAU'];
        // totalObj['款均MAU'] += resultArr[i]['款均MAU'];
        totalObj['1000w'] += resultArr[i]['1000w'];
        totalObj['500w'] += resultArr[i]['500w'];
        totalObj['200w'] += resultArr[i]['200w'];
        totalObj['100w'] += resultArr[i]['100w'];
        totalObj['10w'] += resultArr[i]['10w'];
        totalObj['1w'] += resultArr[i]['1w'];
        totalObj['1k'] += resultArr[i]['1k'];
        totalObj['0k'] += resultArr[i]['0k'];
        // 
        resultArr[i]['MAU'] = resultArr[i]['MAU'].toLocaleString();
    }
    totalObj['款均MAU'] = Math.round(totalObj['MAU'] / totalObj['游戏款数']).toLocaleString();
    totalObj['MAU'] = totalObj['MAU'].toLocaleString();
    resultArr.push(totalObj);
    return resultArr;
}

/** 获取所有周的统计信息 */
async function getAllweekCount() {
    const files = await getFilesArr('formatData');
    for (let i = 0; i < files.length; i++) {
        const curWeekFile = files[i];
        let curWeekArr = await importCsvToJson(curWeekFile);
        curWeekArr = await total(curWeekArr);
        curWeekArr = await sortByMau(curWeekArr);
        const filePath = path.join('count', path.basename(curWeekFile));
        const newFilePath = path.join('count', `count.${path.basename(curWeekFile)}`)
        await exportJsonToCsv(filePath, curWeekArr);
        await utf8ToGbk(filePath, newFilePath);
        await fs.remove(filePath);
    }
}

/** 获取本周的统计信息 */
async function getCurweekCount() {
    const files = await getFilesArr('formatData');
    const curWeekFile = files[files.length - 1];
    let curWeekArr = await importCsvToJson(curWeekFile);
    curWeekArr = await total(curWeekArr);
    curWeekArr = await sortByMau(curWeekArr);
    const filePath = path.join('count', path.basename(curWeekFile));
    const newFilePath = path.join('count', `count.${path.basename(curWeekFile)}`)
    await exportJsonToCsv(filePath, curWeekArr);
    await utf8ToGbk(filePath, newFilePath);
    fs.remove(filePath);
}

getAllweekCount();
// getCurweekCount();
