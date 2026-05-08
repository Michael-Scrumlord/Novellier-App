export class TokenBlocklist {
    constructor() {
        this._revoked = new Set();
    }

    add(token) {
        this._revoked.add(token);
    }

    has(token) {
        return this._revoked.has(token);
    }
}
