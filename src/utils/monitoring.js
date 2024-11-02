const NewRelic = require('newrelic');

const monitorRequest = (req, res, next) => {
    NewRelic.setTransactionName(req.path);
    next();
};

module.exports = monitorRequest;
