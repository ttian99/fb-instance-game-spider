# facebook-instant-game-spider

## reference
- [Pupperteer实战](https://www.jianshu.com/p/a9a55c03f768)

- [Pupperteer github](https://github.com/GoogleChrome/puppeteer)

## prepare
modify the ```lib/config.json file```, type your email access pass in the transporter.auth property
```json
{
    "transporter": {
        "service": "qq",
        "port": 25,
        "secureConnection": true,
        "secure": false,
        "auth": {
            "user": "176553611",
            "pass": "<here is your need modify>"
        }
    }
}
```

## use
``` bash
    npm run start
```