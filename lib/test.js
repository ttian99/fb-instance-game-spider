const utils = require('./utils');
const path = require('path');

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

async function test() {
    const curWeekFile = path.join(__dirname, '../formatData/facebook.2018.12.03.csv');
    let curWeekArr = await utils.importCsvToJson(curWeekFile, 'gbk');
    console.log('==== curWeekArr ====');
    console.log(curWeekArr);
    const arr = await sortArray(curWeekArr);
    
    console.log('==== arr ====');
    console.log(arr);

}



test();