const isbot = require('isbot');
const { getClientIp } = require('request-ip');
const ipRangeCheck = require('ip-range-check');
const { botUAList } = require('./config/botUA.js');

const {
    botIPList,
    botIPRangeList,
    botIPCIDRRangeList,
    botIPWildcardRangeList,
} = require('../config/botIP.js');

const { botRefList } = require('../config/botRef.js');

const isBotUA = (userAgent) => {
    if (!userAgent) return false;
    if (isbot(userAgent)) return true;

    return botUAList.some((botUA) => userAgent.toLowerCase().includes(botUA));
};

const isBotIP = (ipAddress) => {
    if (!ipAddress) return false;

    if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substr(7);
    }

    const IPtoNum = (ip) =>
        Number(ip.split('.').map((d) => ('000' + d).substr(-3)).join(''));

    if (botIPList.some((botIP) => ipAddress.includes(botIP))) return true;

    const inRange = botIPRangeList.some(
        ([min, max]) =>
            IPtoNum(ipAddress) >= IPtoNum(min) &&
            IPtoNum(ipAddress) <= IPtoNum(max)
    );

    if (inRange) return true;

    if (botIPCIDRRangeList.some((cidr) => ipRangeCheck(ipAddress, cidr))) return true;

    if (botIPWildcardRangeList.some((wildcard) => ipAddress.match(wildcard))) return true;

    return false;
};

const isBotRef = (referer) => {
    if (!referer) return false;
    return botRefList.some((botRef) => referer.toLowerCase().includes(botRef));
};

const antiBotMiddleware = (req, res, next) => {
    const userAgent = req.headers['user-agent'];
    const ipAddress = getClientIp(req);
    const referer = req.headers.referer || req.headers.origin;

    if (isBotUA(userAgent) || isBotIP(ipAddress) || isBotRef(referer)) {
        console.warn(`Bot detected! IP: ${ipAddress}, UA: ${userAgent}, Ref: ${referer}`);
        return res.status(404).send('Not Found');
    }

    next();
};

module.exports = antiBotMiddleware; 