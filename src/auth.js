const bcrypt = require('bcrypt');
const database = require('./database');

class Auth {
    async registerUser(username, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return database.addUser(username, hashedPassword);
    }

    async loginUser(username, password) {
        const user = await database.getUser(username);
        if (!user) {
            return false;
        }
        return bcrypt.compare(password, user.password);
    }
}

module.exports = new Auth();
