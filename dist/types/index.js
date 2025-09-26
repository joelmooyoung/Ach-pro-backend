"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.TransactionStatus = void 0;
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PROCESSED"] = "processed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["CANCELLED"] = "cancelled";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["OPERATOR"] = "operator";
    UserRole["VIEWER"] = "viewer";
    UserRole["ORGANIZATION"] = "organization";
})(UserRole || (exports.UserRole = UserRole = {}));
//# sourceMappingURL=index.js.map