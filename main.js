const spider = require('./lib/spider');
const getRank = require('./lib/rank');
const getCurweekCount = require('./lib/count');
const mailer = require('./lib/mailer');
const path = require('path');
const moment = require('moment');
const cfg = require('./config.json');
const http = require('http');
const scheduler = require('./lib/scheduler');


// 所有任务
async function task() {
    console.log('== start task ==');
    console.log(new Date());
        
    await spider();
    const rankFile = await getRank();
    const countFile = await getCurweekCount();

    // 发送邮件
    const time = rankFile.replace(/\D+/ig, '');
    let mailOptions = cfg.mailOptions;
    mailOptions.subject = `facebook小游戏数据(${moment(time).format('YYYY年MM月DD日')})`;
    mailOptions.attachments = [
        { filename: path.basename(rankFile), path: path.join('data-format', path.basename(rankFile)) },
        { filename: path.basename(countFile), path: path.join('data-count', path.basename(countFile)) }
    ];
    // console.log(mailOptions);
    mailer.sendMail(mailOptions);
    console.log('== end task ==');
    console.log(new Date());
}

// 启动定时任务
const job = scheduler.on(cfg.scheduleRule, function () {
    task();
});

// 启动服务器
const express = require('express');
const app = express();
const httpServer = http.createServer(app);
httpServer.listen(cfg.svr.port, () => {
    console.log(new Date());
    console.log(`HTTP Server running on port ${cfg.svr.port}!`);
});


// 配置一些api用于手动调用
app.get('/', (req, res) => {
    res.send('恭喜你，找到了后门！');
});

app.get('/task/', (req, res) => {
    task();
    res.send('恭喜你，找到了后门！');
});

app.get('/cancel', (req, res) => {
    job.cancel();
    res.send('恭喜你，找到了后门！');
});

