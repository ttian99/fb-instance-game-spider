const puppeteer = require('puppeteer');
const csv = require('fast-csv');
const fs = require('fs-extra');
const iconv = require('iconv-lite');
const moment = require('moment');

const FILE = 'facebook.csv';
const NEW_FILE = `facebook_${moment().format('YYYYMMDD')}.csv`;
(async () => {
    const browser = await (puppeteer.launch({
        timeout: 15000,
        ignoreHTTPSErrors: true,
        devtools: false,
        headless: false
    }));
    const page = await browser.newPage();

    // 创建可写流
    const writeStream = fs.createWriteStream(FILE);
    const csvStream = csv.createWriteStream({ headers: true });
    writeStream.on("finish", function () {
        console.log("DONE!");
        let fileData = fs.readFileSync(FILE);
        fileData = iconv.encode(fileData, 'GBK');
        fs.writeFileSync(NEW_FILE, fileData);
    });
    csvStream.pipe(writeStream);

    let count = 0;
    let len = 10000;

    // 监听函数
    async function logResponse(data) {
        const url = data.url();
        const reg = new RegExp('graphql');
        if (reg.test(url)) {
            console.log('a *******************');
            const json = await data.json();

            // 获取数据总量
            if (json.data.hasOwnProperty('instant_games_recommendation_ids')) {
                len = json.data.instant_games_recommendation_ids.length;
                console.log(`游戏总数量: ${len}`);
            }

            if (json.data.hasOwnProperty('instant_games_recommendation_details')) {
                const arr = json.data.instant_games_recommendation_details;
                for (let i = 0; i < arr.length; i++) {
                    const item = arr[i];
                    const app_center_categories = item.app_center_categories.splice(1).join();
                    let player_count = item.instant_game_info.player_count;
                    if ((/\u00a0\u4e07/).test(player_count)) { // 将人数的“万”转换为具体数字
                        let num = player_count.replace('/\u00a0\u4e07/');
                        num = parseFloat(num);
                        player_count = num * 10000;
                        player_count = player_count.toLocaleString();
                    }

                    const newData = {
                        "id": item.id + '\t', // 加入制表符防止数字变成科学计数
                        "game_name": item.instant_game_info.game_name,
                        "developer_name": item.instant_game_info.developer_name,
                        "player_count": player_count,
                        "app_center_categories": app_center_categories,
                        "icon_uri": item.instant_game_info.icon_uri,
                        "is_favorite": item.instant_game_info.is_favorite
                    }
                    // 写入数据到表格
                    csvStream.write(newData);
                    count++;
                    // 判断所有数据是否完成
                    if (count > len) {
                        csvStream.end();
                    }
                }
            }
        }
    }
    page.on('response', logResponse);



    await page.goto('https://www.facebook.com/games/instantgames');

    // 下滑刷新
    for (let i = 0; i < 1000; i++) {
        await page.waitFor(1000);
        await page.keyboard.press('End');
    }

    // browser.close();

    console.log('over');
})();