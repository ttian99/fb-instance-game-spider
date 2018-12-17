const nodemailer = require('nodemailer');
const cfg = require('../config.json');

/** 发送邮件 */
exports.sendMail = async function sendMail(mailOptions) {
    const transporter = nodemailer.createTransport(cfg.transporter);
    transporter.sendMail(mailOptions, (err, info) => {
        transporter.close();
        if (err) {
            return console.log(err);
        }
        console.log('Message sent: %s', info.messageId);
        // console.log('Preview URL: s%', nodemailer.getTestMessageUrl);
    });
};

/** 获取默认的邮件信息配置 */
exports.getDefaultMailOptions = function getDefaultMailOptions() {
    return {
        from: '"senderName"<senderEmail>',
        to: 'recieveEmail',
        subject: 'email subject',
        text: 'context',
        // html: '',
        attachments: []
    };
};

/** 获取默认的transport配置 */
exports.getDefaultTransportOptions = function getDefaultTransportOptions() {
    return {
        'service': 'qq',
        'port': 25,
        'secureConnection': true,
        'secure': false,
        'auth': {
            'user': 'yourQQNumber',
            'pass': 'yoursAccess'
        }
    };
};