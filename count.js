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
        '1000w': 0,
        '500w': 0,
        '200w': 0,
        '100w': 0,
        '10w': 0,
        '1w': 0,
        '1k': 0,
        '0k': 0,
        '游戏总数': 0,
        '玩家总数': 0
    }
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
        result[type]['游戏总数']++;
        result[type]['玩家总数'] += count;
    }
    // console.log(result);

    const resultArr = [];
    const keyArr = Object.keys(result);
    for (let i = 0; i < keyArr.length; i++) {
        const key = await keyArr[i];
        resultArr[i] = result[key];
        resultArr[i]['类型'] = key;
        // resultArr[i][' 0'] = resultArr[i]['0'];
        // delete resultArr[i]['0']
    }
    return resultArr;
}

/** 获取所有周的统计信息 */
async function getAllweekCount() {
    const files = await getFilesArr('formatData');
    for (let i = 0; i < files.length; i++) {
        const curWeekFile = files[i];
        let curWeekArr = await importCsvToJson(curWeekFile);
        const result = await total(curWeekArr);
        const filePath = path.join('count', path.basename(curWeekFile));
        const newFilePath = path.join('count', `count.${path.basename(curWeekFile)}`)
        await exportJsonToCsv(filePath, result);
        await utf8ToGbk(filePath, newFilePath);
        await fs.remove(filePath);
    }
}

/** 获取本周的统计信息 */
async function getCurweekCount() {
    const files = await getFilesArr('formatData');
    const curWeekFile = files[files.length - 1];
    let curWeekArr = await importCsvToJson(curWeekFile);
    const result = await total(curWeekArr);
    const filePath = path.join('count', path.basename(curWeekFile));
    const newFilePath = path.join('count', `count.${path.basename(curWeekFile)}`)
    await exportJsonToCsv(filePath, result);
    await utf8ToGbk(filePath, newFilePath);
    fs.remove(filePath);
}

getAllweekCount();
// getCurweekCount();
