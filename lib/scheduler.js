/**
 * 参考地址: https://www.npmjs.com/package/node-schedule 
 * */
const schedule = require('node-schedule');

exports.schedule = function() {
    return schedule;
};

exports.rule = function() {
    return new schedule.RecurrenceRule();
};

// 启动定时任务
exports.on = function(rule, func, target) {
    return schedule.scheduleJob(rule, func, target);
};

// 取消定时任务
exports.off = function(job) {
    job.cancel();
};