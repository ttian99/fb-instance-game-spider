const spider = require('./lib/spider');
const getRank = require('./lib/rank');
const getCurweekCount = require('./lib/count');

async function main() {
    await spider();
    await getRank();
    await getCurweekCount();
}
main();
    