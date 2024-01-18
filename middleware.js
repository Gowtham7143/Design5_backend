const jwt = require('jsonwebtoken');

const authenticateBuyer = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) return res.status(401).json({ error: 'Token not found' });

    jwt.verify(token, 'secretkey', (err, decodedToken) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decodedToken.user;
        next();
    });

};


const authenticateSeller = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, 'secretkey', (err, decodedToken) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decodedToken.user;
        next();
    });
};


module.exports = { authenticateBuyer, authenticateSeller };